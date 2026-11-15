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
        i = max(0, int(start * SR))
        if i >= len(self.buf): return
        a = a[:len(self.buf) - i] * vel * self.rng.uniform(.9, 1.05)
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
        # 샘플이 11kHz 위가 비어 답답하게 들리므로, 3kHz 위 성분을 살짝 포화시켜 높은 배음을 만든다(엑사이터).
        F2 = 1 << (len(out) - 1).bit_length()
        for c in range(2):
            X = np.fft.rfft(out[:, c], F2); fr = np.fft.rfftfreq(F2, 1 / SR)
            hp = np.fft.irfft(X * (fr > 3000), F2)[:len(out)]
            g = np.abs(hp).max() or 1
            out[:, c] += .10 * np.tanh(hp / g * 3) * g / 3
        # 반복 이음매: 곡 길이 뒤로 넘친 소리를 앞으로 감는다
        loop = out[:self.length].copy(); spill = out[self.length:]
        loop[:len(spill)] += spill[:self.length]
        peak = np.abs(loop).max(); loop = np.tanh(loop / peak * 1.25) / np.tanh(1.25) * gain
        pcm = (loop * 32767).astype('<i2').tobytes()
        import subprocess
        # 네 곡의 체감 음량을 -16 LUFS 로 맞춘다(2회 측정 loudnorm). 게임 안 음량은 index.json 이 정한다.
        import json, re
        inp = ['ffmpeg', '-hide_banner', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-']
        meas = subprocess.run(inp + ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                              input=pcm, capture_output=True, text=False).stderr.decode()
        m = json.loads(re.findall(r'\{[^{}]*\}', meas)[-1])
        af = ('loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s'
              % (m['input_i'], m['input_tp'], m['input_lra'], m['input_thresh'], m['target_offset']))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', af,
                        '-ar', str(SR), '-codec:a', 'libmp3lame', '-b:a', '96k', path], input=pcm, check=True)
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

# ── 1) 시작 화면·결과: 고요한 수묵화. 고토 아르페지오 + 샤쿠하치 + 현 깔개 (D, 66BPM, 24마디 ≈ 87초)
#     A(1~4 고토만) → B(5~12 샤쿠하치 선율) → C(13~20 고토 선율·종, 아르페지오 성기게) → 마무리(21~24, 처음으로 이어짐)
def title():
    T = Track(66, 24, seed=11); sc, r = MINOR_PENTA, 62  # D
    chords = [0, -2, -3, -1, 0, -2, 1, -1, 0, -2, -3, -1, 1, 0, -2, -1, 1, 0, -3, -1, 0, -2, -1, 0]
    for b, c in enumerate(chords):
        sec = 'C' if 12 <= b < 20 else 'A'
        T.note('string_ensemble_1', deg(sc, r - 12, c) - 12, b, 0, 4, vel=.30, pan=-.2)
        T.note('string_ensemble_1', deg(sc, r - 12, c + 2), b, 0, 4, vel=.22 if sec == 'A' else .3, pan=.25)
        arp = [c, c + 2, c + 4, c + 5, c + 4, c + 2, c + 3, c + 2] if b % 2 == 0 else [c, c + 2, c + 3, c + 4, c + 6, c + 4, c + 3, c + 1]
        for i, d in enumerate(arp):
            if sec == 'C' and i % 2: continue
            T.note('koto', deg(sc, r - 12, d), b, i * .5, 1.2, vel=.42 + .12 * (i == 0), pan=-.35 + .1 * (i % 3))
        if b % 4 == 3: T.note('tubular_bells', deg(sc, r + 12, 0), b, 3, 3, vel=.12, pan=.5)
        if sec == 'C' and b % 2 == 0: T.note('tubular_bells', deg(sc, r + 12, c + 2), b, 0, 3, vel=.09, pan=-.5)
    T.seq('shakuhachi', 4, mel(sc, r, '4:3 3:1 2:2 1:2 2:6 -:2 4:2 5:2 4:1 3:1 2:4 -:4'), 1, vel=.55, pan=.15)
    T.seq('shakuhachi', 8, mel(sc, r, '2:2 4:2 5:3 4:1 3:2 2:2 1:4 0:6 -:2'), 1, vel=.5, pan=.15)
    T.seq('koto', 12, mel(sc, r + 12, '0:1 2:1 3:2 2:1 0:1 -1:2 0:4 -:4 3:1 4:1 5:2 4:1 3:1 2:2 3:4 -:4 '
                                    '5:2 4:1 3:1 2:2 0:2 1:2 0:1 -1:1 -2:4'), 1, vel=.4, pan=.3)
    T.seq('shakuhachi', 20, mel(sc, r, '2:2 1:2 0:4 -1:4 0:4'), 1, vel=.45, pan=.15)
    T.render(f'{OUT}/title.mp3', wet=.38, decay=3.2)

# ── 2) 도중(잡몹): 샤미센 리프 + 고토 + 나무토막·북, 피리 선율 (A, 104BPM, 40마디 ≈ 92초)
#     도입(1~8) → A선율(9~16) → B선율(17~24) → C(25~32 고토 주선율·다른 화성) → 다리(33~40 북 몰아치기, 처음으로)
def field():
    T = Track(104, 40, seed=22); sc, r = MINOR_PENTA, 57  # A
    riff = mel(sc, r - 12, '0:1 0:.5 2:.5 3:1 2:1 4:1 3:.5 2:.5 0:1 -:1')
    riff2 = mel(sc, r - 12, '0:.5 2:.5 3:.5 4:.5 3:1 2:1 0:.5 2:.5 3:1 -:2')
    for b in range(40):
        part = 'C' if 24 <= b < 32 else 'D' if b >= 32 else 'AB'
        prog = [0, 0, -2, -1, 0, 0, 1, -1] if part != 'C' else [2, 2, 0, 1, 2, 3, 1, 0]
        c = prog[b % 8]; off = deg(sc, 0, c) if c else 0
        T.seq('shamisen', b, [(None if m is None else m + off, k) for m, k in (riff2 if part == 'C' else riff)], .5, vel=.5, pan=-.3)
        T.note('contrabass', deg(sc, r - 24, c), b, 0, 1.6, vel=.55); T.note('contrabass', deg(sc, r - 24, c), b, 2.5, 1.2, vel=.45)
        for q in range(8):
            T.note('woodblock', 76 if q % 2 else 77, b, q * .5, .3, vel=.12 + .08 * (q % 4 == 0), pan=.45)
        T.note('taiko_drum', 45, b, 0, 1, vel=.55, pan=0); T.note('taiko_drum', 50, b, 2, 1, vel=.4, pan=.1)
        if b % 2: T.note('taiko_drum', 50, b, 3.5, .5, vel=.3, pan=-.1)
        if b % 8 == 7:  # 악절 끝 북 채움
            for i in range(4): T.note('taiko_drum', 47 + (i % 2) * 3, b, 2 + i * .5, .5, vel=.3 + .08 * i, pan=-.2 + .13 * i)
        if part == 'D':
            T.note('taiko_drum', 41, b, 1, .5, vel=.35); T.note('taiko_drum', 41, b, 3, .5, vel=.4)
            if b >= 36: T.note('string_ensemble_1', deg(sc, r - 12, c + 2), b, 0, 4, vel=.2 + .03 * (b - 36), pan=.3)
        if 8 <= b < 24 and b % 2 == 0:
            for i, d in enumerate([c + 5, c + 7, c + 6, c + 5]):
                T.note('koto', deg(sc, r, d), b, 1 + i * .25, .5, vel=.3, pan=.35)
    A = '4:1 5:1 7:2 6:1 5:1 4:2 2:1 4:1 5:4 -:2 7:1 9:1 8:2 7:2 5:2 4:2 2:6 -:2'
    B = '9:2 8:1 7:1 5:2 7:2 8:4 7:2 5:2 4:1 5:1 4:1 2:1 0:4 -:4'
    C = ('5:.5 6:.5 7:1 9:1 7:1 6:2 5:1 6:1 7:4 -:2 9:.5 10:.5 9:1 7:1 6:1 5:2 4:2 5:6 -:2 '
         '7:1 6:1 5:1 4:1 2:2 4:2 5:4 -:2 4:1 5:1 7:2 6:2 5:2 4:2 5:8')
    T.seq('shakuhachi', 8, mel(sc, r - 12, A), 1, vel=.55, pan=.2)
    T.seq('shakuhachi', 16, mel(sc, r - 12, B), 1, vel=.6, pan=.2)
    T.seq('pan_flute', 16, mel(sc, r - 12, B), 1, vel=.2, pan=-.4)
    T.seq('koto', 24, mel(sc, r - 12, C), 1, vel=.5, pan=.25)
    T.seq('shakuhachi', 28, mel(sc, r - 12, '7:4 6:4 5:8'), 1, vel=.35, pan=-.2)
    T.seq('shakuhachi', 32, mel(sc, r - 12, A), 1, vel=.45, pan=.2)
    T.render(f'{OUT}/field.mp3', wet=.24, decay=2.0)

# ── 3) 보스전(11-16 사용자 "좀 더 긴박감 있게"): 168BPM, 16분음 태고 연타 + 팀파니 연타 + 현 트레몰로 + 샤미센 16분 오스티나토.
#     반음(음음계의 E-F)으로 계속 조여 오고, 4마디마다 한 음씩 올라가며 긴장을 쌓는다. 쉬는 구간 없이 몰아친다. (E, 168BPM, 48마디 ≈ 69초)
#     도입(1~8 북·현 트레몰로) → 샤미센 오스티나토(9~24) → 샤쿠하치 외침(17~32) → 한 단계 올려 절정(33~48, 북 두 배)
def boss():
    T = Track(168, 48, seed=33); sc, r = IN_SCALE, 52  # E
    for b in range(48):
        climb = (b // 4) % 4 if b < 32 else 1 + (b // 4) % 3   # 4마디마다 한 단계씩 올라감
        c = [0, 1, 0, -1][b % 4] + climb; peak = b >= 32
        # 태고: 매 박 큰북 + 16분 잔북(약강 교대), 절정에선 엇박 큰북 추가
        for i in range(16):
            at = i * .25
            if i % 4 == 0: T.note('taiko_drum', 41, b, at, .5, vel=.62 if i == 0 else .5, pan=0)
            elif i % 2 == 0: T.note('taiko_drum', 45, b, at, .25, vel=.32 + .06 * (i == 6 or i == 14), pan=.15)
            else: T.note('taiko_drum', 50, b, at, .25, vel=.16 + .03 * (i % 4 == 3), pan=-.2)
        if peak: T.note('taiko_drum', 41, b, 1.5, .5, vel=.45); T.note('taiko_drum', 41, b, 3.5, .5, vel=.5)
        if b % 4 == 3:  # 마디 끝 몰아치기: 32분 연타가 커지며 다음 마디로
            for i in range(8): T.note('taiko_drum', 47, b, 3 + i * .125, .125, vel=.2 + .05 * i, pan=-.3 + .08 * i)
        # 팀파니: 8분 연타로 바닥을 조인다
        for i in range(8): T.note('timpani', deg(sc, r - 24, c if i % 4 else c), b, i * .5, .5, vel=.42 + .14 * (i % 4 == 0))
        # 현: 반음 위아래로 떠는 트레몰로(16분)
        for i in range(16):
            d = c + (2 if i % 2 == 0 else 1) + (1 if peak and i >= 8 else 0)
            T.note('string_ensemble_1', deg(sc, r - 12, d), b, i * .25, .3, vel=.2 + .06 * (i % 4 == 0), pan=-.35)
        T.note('contrabass', deg(sc, r - 24, c), b, 0, 2, vel=.55); T.note('contrabass', deg(sc, r - 24, c + 1), b, 2, 2, vel=.5)
        # 샤미센 16분 오스티나토(반음 E-F를 비비며 위로)
        if b >= 8:
            fig = [5, 6, 5, 4, 5, 6, 7, 6, 5, 6, 5, 4, 3, 4, 5, 6] if b % 2 == 0 else [5, 6, 7, 6, 5, 4, 5, 6, 7, 8, 7, 6, 5, 6, 5, 4]
            for i, d in enumerate(fig): T.note('shamisen', deg(sc, r - 12, c + d), b, i * .25, .25, vel=.36 + .1 * (i % 4 == 0), pan=.35)
        if b % 8 == 0: T.note('tubular_bells', deg(sc, r, c), b, 0, 2, vel=.22, pan=.5)
    shout = '7:1 8:1 7:1 6:1 5:2 6:2 7:4 -:4 8:1 9:1 8:1 7:1 6:2 7:2 5:4 -:4'
    T.seq('shakuhachi', 16, mel(sc, r - 12, shout), 1, vel=.65, pan=.1)
    T.seq('shakuhachi', 24, mel(sc, r - 12, shout.replace('5:4 -:4', '8:8')), 1, vel=.7, pan=.1)
    T.seq('shakuhachi', 32, mel(sc, r - 12, '10:2 9:1 8:1 7:2 8:2 9:4 -:4 10:1 11:1 10:1 9:1 8:2 9:2 7:4 -:4'), 1, vel=.75, pan=.1)
    T.seq('shakuhachi', 40, mel(sc, r - 12, '10:2 9:1 8:1 7:2 8:2 9:4 -:4 8:2 7:2 6:2 5:2 7:4 -:4'), 1, vel=.75, pan=.1)
    T.seq('string_ensemble_1', 40, mel(sc, r - 24, '10:4 9:4 8:4 7:4 8:4 7:4 6:4 5:4'), 1, vel=.3, pan=.2)
    T.render(f'{OUT}/boss.mp3', wet=.16, decay=1.5, gain=.95)

# ── 4) 마지막 보스: 장중한 현 + 태고 + 종, 음음계 D (D, 120BPM, 40마디 ≈ 80초)
def final():
    T = Track(120, 40, seed=44); sc, r = IN_SCALE, 50  # D
    for b in range(40):
        prog = [0, 0, 3, 2, 0, 1, -1, 0] if b < 32 else [3, 2, 1, 0, 3, 4, 2, 0]
        c = prog[b % 8]; loud = 1.0 if b >= 16 else .75
        for d, v, p in ((c, .34, -.3), (c + 2, .26, .3), (c + 3, .2, 0)):
            T.note('string_ensemble_1', deg(sc, r - 12, d), b, 0, 4, vel=v * loud, pan=p)
        T.note('contrabass', deg(sc, r - 24, c), b, 0, 2, vel=.55); T.note('contrabass', deg(sc, r - 24, c), b, 2, 2, vel=.45)
        T.note('taiko_drum', 41, b, 0, 1, vel=.65 * loud); T.note('taiko_drum', 45, b, 1.5, .5, vel=.35 * loud)
        T.note('taiko_drum', 41, b, 2, 1, vel=.5 * loud); T.note('taiko_drum', 47, b, 3, .5, vel=.3 * loud); T.note('taiko_drum', 47, b, 3.5, .5, vel=.35 * loud)
        if b % 8 == 7:
            for i in range(8): T.note('taiko_drum', 45 if i % 2 else 41, b, 2 + i * .25, .25, vel=.3 + .05 * i)
        T.note('timpani', deg(sc, r - 24, c), b, 0, 1, vel=.45 * loud)
        if b % 4 == 0: T.note('tubular_bells', deg(sc, r + 12, c), b, 0, 4, vel=.2, pan=.4)
        if b >= 8:
            for i, d in enumerate([c + 5, c + 4, c + 5, c + 7, c + 6, c + 5, c + 4, c + 3]):
                T.note('koto', deg(sc, r, d), b, i * .5, .6, vel=.3 * loud, pan=-.4)
        if b >= 32:
            for i, d in enumerate([c + 3, c + 4, c + 5, c + 4]): T.note('shamisen', deg(sc, r - 12, d), b, i, .8, vel=.35, pan=.35)
    M1 = '5:3 6:1 7:2 6:2 5:4 3:2 4:2 5:3 4:1 3:2 2:2 0:8'
    M2 = '7:2 8:2 9:3 8:1 7:2 6:2 5:4 6:2 7:2 6:2 5:1 4:1 3:4 5:4 0:8'
    M3 = '8:2 7:2 8:4 9:2 10:2 9:4 8:2 7:2 6:2 5:2 6:4 5:4'
    T.seq('shakuhachi', 8, mel(sc, r, M1), 1, vel=.6, pan=.15)
    T.seq('shakuhachi', 16, mel(sc, r, M2), 1, vel=.7, pan=.15)
    T.seq('string_ensemble_1', 24, mel(sc, r, M2), 1, vel=.3, pan=-.15)
    T.seq('shakuhachi', 32, mel(sc, r, M3), 1, vel=.7, pan=.15)
    T.render(f'{OUT}/final.mp3', wet=.3, decay=2.6, gain=.93)

for f in (title, field, boss, final): f()
