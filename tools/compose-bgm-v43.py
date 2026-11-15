"""세로판 배경음악 4곡을 직접 작곡·렌더링한다.
악기 소리: Fluid R3 GM 사운드폰트(Frank Wen, gleitz/midi-js-soundfonts 사전 렌더 mp3, CC BY 3.0 표기).
곡(선율·화성·리듬)은 이 스크립트가 만든 창작물이다. 반복 재생 시 이음매가 없게 잔향 꼬리를 앞으로 감는다.
사용: python3 compose.py <samples dir> <out dir>"""
import sys, os, numpy as np
SR = 44100
SMP, OUT = sys.argv[1], sys.argv[2]
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
SUSTAIN = {'shakuhachi', 'string_ensemble_1', 'pan_flute', 'contrabass'}
_cache, _norm = {}, {}

def note_name(m): return NAMES[m % 12] + str(m // 12 - 1)

def sample(inst, midi):
    k = (inst, midi)
    if k not in _cache:
        if inst not in _norm:
            _norm[inst] = 0.9 / max(1e-4, float(np.abs(np.load(f'{SMP}/{inst}/A3.npy')).max()))
        _cache[k] = np.load(f'{SMP}/{inst}/{note_name(midi)}.npy').astype(np.float64) * _norm[inst]
    return _cache[k]

def extend(a, n):
    """지속음 악기를 n 샘플까지 늘린다: 0.6~2.2초 구간을 교차 페이드로 이어 붙인다."""
    if len(a) >= n: return a
    s0, s1, xf = int(.6 * SR), int(2.2 * SR), int(.25 * SR)
    seg = a[s0:s1]; out = a[:s1].copy()
    ramp = np.linspace(0, 1, xf)
    while len(out) < n:
        tail = out[-xf:] * (1 - ramp) + seg[:xf] * ramp
        out = np.concatenate([out[:-xf], tail, seg[xf:]])
    return out

class Track:
    def __init__(self, bpm, bars, beats=4, seed=1):
        self.spb = 60 / bpm; self.beats = beats; self.bars = bars
        self.length = int(round(bars * beats * self.spb * SR))
        self.buf = np.zeros((self.length + 6 * SR, 2))
        self.rng = np.random.default_rng(seed)

    def t(self, bar, beat): return (bar * self.beats + beat) * self.spb

    def note(self, inst, midi, bar, beat, dur, vel=.8, pan=0.0, jitter=.006):
        if midi is None: return
        start = self.t(bar, beat) + self.rng.uniform(-jitter, jitter)
        a = sample(inst, midi)
        n = int(dur * self.spb * SR)
        if inst in SUSTAIN:
            a = extend(a, n + int(.4 * SR))
            rel = int(.35 * SR); a = a[:n + rel].copy()
            a[-rel:] *= np.linspace(1, 0, rel) ** 2
            att = int(.04 * SR); a[:att] *= np.linspace(0, 1, att)
        else:
            cap = max(n + int(.25 * SR), int(.25 * SR))
            if len(a) > cap:
                a = a[:cap].copy(); rel = min(int(.25 * SR), cap // 2); a[-rel:] *= np.linspace(1, 0, rel)
        i = max(0, int(start * SR)); a = a[:len(self.buf) - i] * vel * self.rng.uniform(.9, 1.05)
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.buf[i:i + len(a), 0] += a * l * 1.41; self.buf[i:i + len(a), 1] += a * r * 1.41

    def seq(self, inst, bar0, pattern, step, vel=.8, pan=0.0, legato=1.0):
        """pattern: [(midi|None, steps), ...] 를 bar0 부터 step 박 단위로 늘어놓는다."""
        pos = 0.0
        for m, k in pattern:
            b = pos * step
            self.note(inst, m, bar0 + int(b // self.beats), b % self.beats, k * step * legato,
                      vel=vel if not isinstance(m, tuple) else vel, pan=pan) if not isinstance(m, tuple) else None
            if isinstance(m, tuple):
                for mm in m: self.note(inst, mm, bar0 + int(b // self.beats), b % self.beats, k * step * legato, vel=vel * .8, pan=pan)
            pos += k

    def render(self, path, wet=.28, decay=2.4, gain=.9):
        # 잔향: 좌우가 다른 지수 감쇠 잡음으로 컨볼루션
        n = int(decay * SR); env = np.exp(-np.arange(n) / SR * 6.9 / decay)
        rng = np.random.default_rng(7)
        out = np.zeros_like(self.buf)
        L = len(self.buf) + n; F = 1 << (L - 1).bit_length()
        for c in range(2):
            ir = rng.standard_normal(n) * env; ir[:int(.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
            # 잔향은 저역을 덜어 탁해지지 않게
            wetsig = np.fft.irfft(np.fft.rfft(self.buf[:, c], F) * np.fft.rfft(ir, F), F)[:len(self.buf)]
            out[:, c] = self.buf[:, c] + wet * wetsig
        # 반복 이음매: 곡 길이 뒤로 넘친 소리를 앞으로 감는다
        loop = out[:self.length].copy(); spill = out[self.length:]
        loop[:len(spill)] += spill[:self.length]
        peak = np.abs(loop).max(); loop = np.tanh(loop / peak * 1.25) / np.tanh(1.25) * gain
        pcm = (loop * 32767).astype('<i2').tobytes()
        import subprocess
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                        '-codec:a', 'libmp3lame', '-b:a', '96k', path], input=pcm, check=True)
        print(path, round(self.length / SR, 1), 's', os.path.getsize(path) // 1024, 'KB')

def P(s, root):
    """'0 2 4 . 7' 같은 음계 단계 문자열 → midi 목록. 단계는 scale 표에서 고른다(아래 각 곡에서 scale 바꿈)."""
    raise NotImplementedError

def deg(scale, root, d):
    """음계 단계 d(정수, 음수 가능)를 midi 로."""
    o, i = divmod(d, len(scale)); return root + 12 * o + scale[i]

def mel(scale, root, text):
    """'0:2 2:1 4:1 -:2' → [(midi,steps)], '-'는 쉼표."""
    out = []
    for tok in text.split():
        d, k = tok.split(':'); out.append((None if d == '-' else deg(scale, root, int(d)), float(k)))
    return out

os.makedirs(OUT, exist_ok=True)
MINOR_PENTA = [0, 3, 5, 7, 10]   # 단조 오음계(동아시아 공통)
IN_SCALE = [0, 1, 5, 7, 8]       # 미야코부시(음음계): 어둡고 긴장된 느낌
YO = [0, 2, 5, 7, 9]             # 평조 느낌의 밝은 오음계

# ── 1) 시작 화면·결과: 고요한 수묵화, 고토 아르페지오 + 샤쿠하치 + 현 깔개 (D, 66BPM, 16마디 ≈ 58초)
def title():
    T = Track(66, 16, seed=11); sc, r = MINOR_PENTA, 62  # D
    chords = [0, -2, -3, -1, 0, -2, 1, -1, 0, -2, -3, -1, 0, 1, -1, 0]
    for b, c in enumerate(chords):
        root = deg(sc, r - 12, c)
        T.note('string_ensemble_1', root - 12, b, 0, 4, vel=.30, pan=-.2)
        T.note('string_ensemble_1', deg(sc, r - 12, c + 2), b, 0, 4, vel=.22, pan=.25)
        arp = [c, c + 2, c + 4, c + 5, c + 4, c + 2, c + 3, c + 2]
        for i, d in enumerate(arp):
            T.note('koto', deg(sc, r - 12, d), b, i * .5, 1.2, vel=.42 + .12 * (i == 0), pan=-.35 + .1 * (i % 3))
        if b % 4 == 3: T.note('tubular_bells', deg(sc, r + 12, 0), b, 3, 3, vel=.12, pan=.5)
    T.seq('shakuhachi', 4, mel(sc, r, '4:3 3:1 2:2 1:2 2:6 -:2 4:2 5:2 4:1 3:1 2:4 -:4'), 1, vel=.55, pan=.15)
    T.seq('shakuhachi', 10, mel(sc, r, '2:2 4:2 5:3 4:1 3:2 2:2 1:4 0:6 -:2'), 1, vel=.5, pan=.15)
    T.render(f'{OUT}/title.mp3', wet=.38, decay=3.2)

# ── 2) 도중(잡몹): 샤미센 리프 + 고토 + 나무토막·북, 피리 선율 (A, 104BPM, 24마디 ≈ 55초)
def field():
    T = Track(104, 24, seed=22); sc, r = MINOR_PENTA, 57  # A
    riff = mel(sc, r - 12, '0:1 0:.5 2:.5 3:1 2:1 4:1 3:.5 2:.5 0:1 -:1')
    prog = [0, 0, -2, -1, 0, 0, 1, -1]
    for b in range(24):
        c = prog[b % 8]
        T.seq('shamisen', b, [(None if m is None else m + (12 * 0) + (deg(sc, 0, c) if c else 0), k) for m, k in riff], .5, vel=.5, pan=-.3)
        T.note('contrabass', deg(sc, r - 24, c), b, 0, 1.6, vel=.55); T.note('contrabass', deg(sc, r - 24, c), b, 2.5, 1.2, vel=.45)
        for q in range(8):
            T.note('woodblock', 76 if q % 2 else 77, b, q * .5, .3, vel=.12 + .08 * (q % 4 == 0), pan=.45)
        T.note('taiko_drum', 45, b, 0, 1, vel=.55, pan=0); T.note('taiko_drum', 50, b, 2, 1, vel=.4, pan=.1)
        if b % 2: T.note('taiko_drum', 50, b, 3.5, .5, vel=.3, pan=-.1)
        if b >= 8 and b % 2 == 0:
            for i, d in enumerate([c + 5, c + 7, c + 6, c + 5]):
                T.note('koto', deg(sc, r, d), b, 1 + i * .25, .5, vel=.3, pan=.35)
    A = '4:1 5:1 7:2 6:1 5:1 4:2 2:1 4:1 5:4 -:2 7:1 9:1 8:2 7:2 5:2 4:2 2:6 -:2'
    B = '9:2 8:1 7:1 5:2 7:2 8:4 7:2 5:2 4:1 5:1 4:1 2:1 0:4 -:4'
    T.seq('shakuhachi', 8, mel(sc, r - 12, A), 1, vel=.55, pan=.2)
    T.seq('shakuhachi', 16, mel(sc, r - 12, B), 1, vel=.6, pan=.2)
    T.seq('pan_flute', 16, mel(sc, r - 12, B), 1, vel=.2, pan=-.4)
    T.render(f'{OUT}/field.mp3', wet=.24, decay=2.0)

# ── 3) 보스전: 태고 북 연타 + 팀파니 + 현 스타카토 + 샤미센, 음음계 (E, 144BPM, 24마디 ≈ 40초)
def boss():
    T = Track(144, 24, seed=33); sc, r = IN_SCALE, 52  # E
    prog = [0, 0, 1, -1, 0, 0, 2, 1]
    drum = [(1, 0), (.6, .5), (.8, 1.5), (1, 2), (.5, 2.75), (.9, 3), (.6, 3.5)]
    for b in range(24):
        c = prog[b % 8]
        for v, at in drum: T.note('taiko_drum', 41 if at in (0, 2) else 45, b, at, .5, vel=.55 * v, pan=(at - 2) * .08)
        if b % 4 == 3:
            for i in range(8): T.note('taiko_drum', 47, b, 2 + i * .25, .25, vel=.22 + .04 * i, pan=.2 - .05 * i)
        T.note('timpani', deg(sc, r - 24, c), b, 0, 2, vel=.6)
        for i in range(8):
            T.note('string_ensemble_1', deg(sc, r - 12, c + (0, 0, 1, 0, 2, 0, 1, -1)[i]), b, i * .5, .35, vel=.28, pan=-.3)
        T.note('contrabass', deg(sc, r - 24, c), b, 0, 3.6, vel=.5)
        if b >= 8:
            fig = [c + 5, c + 6, c + 5, c + 3, c + 4, c + 5, c + 4, c + 2]
            for i, d in enumerate(fig): T.note('shamisen', deg(sc, r - 12, d), b, i * .5, .4, vel=.42, pan=.3)
    T.seq('shakuhachi', 16, mel(sc, r, '5:2 6:1 5:1 4:2 3:2 4:3 5:1 3:4 6:2 7:2 6:1 5:1 4:2 5:4 3:2 2:2 0:8'), 1, vel=.6, pan=.1)
    T.render(f'{OUT}/boss.mp3', wet=.2, decay=1.8, gain=.93)

# ── 4) 마지막 보스: 장중한 현 + 태고 + 종, 음음계 D (D, 120BPM, 32마디 ≈ 64초)
def final():
    T = Track(120, 32, seed=44); sc, r = IN_SCALE, 50  # D
    prog = [0, 0, 3, 2, 0, 1, -1, 0]
    for b in range(32):
        c = prog[b % 8]; loud = 1.0 if b >= 16 else .75
        for d, v, p in ((c, .34, -.3), (c + 2, .26, .3), (c + 3, .2, 0)):
            T.note('string_ensemble_1', deg(sc, r - 12, d), b, 0, 4, vel=v * loud, pan=p)
        T.note('contrabass', deg(sc, r - 24, c), b, 0, 2, vel=.55); T.note('contrabass', deg(sc, r - 24, c), b, 2, 2, vel=.45)
        T.note('taiko_drum', 41, b, 0, 1, vel=.65 * loud); T.note('taiko_drum', 45, b, 1.5, .5, vel=.35 * loud)
        T.note('taiko_drum', 41, b, 2, 1, vel=.5 * loud); T.note('taiko_drum', 47, b, 3, .5, vel=.3 * loud); T.note('taiko_drum', 47, b, 3.5, .5, vel=.35 * loud)
        T.note('timpani', deg(sc, r - 24, c), b, 0, 1, vel=.45 * loud)
        if b % 4 == 0: T.note('tubular_bells', deg(sc, r + 12, c), b, 0, 4, vel=.2, pan=.4)
        if b >= 8:
            for i, d in enumerate([c + 5, c + 4, c + 5, c + 7, c + 6, c + 5, c + 4, c + 3]):
                T.note('koto', deg(sc, r, d), b, i * .5, .6, vel=.3 * loud, pan=-.4)
    M1 = '5:3 6:1 7:2 6:2 5:4 3:2 4:2 5:3 4:1 3:2 2:2 0:8'
    M2 = '7:2 8:2 9:3 8:1 7:2 6:2 5:4 6:2 7:2 6:2 5:1 4:1 3:4 5:4 0:8'
    T.seq('shakuhachi', 8, mel(sc, r, M1), 1, vel=.6, pan=.15)
    T.seq('shakuhachi', 16, mel(sc, r, M2), 1, vel=.7, pan=.15)
    T.seq('string_ensemble_1', 24, mel(sc, r, M2), 1, vel=.3, pan=-.15)
    T.render(f'{OUT}/final.mp3', wet=.3, decay=2.6, gain=.93)

for f in (title, field, boss, final): f()
