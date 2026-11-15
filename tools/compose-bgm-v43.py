"""세로판 배경음악 4곡을 직접 작곡·렌더링한다.
악기 소리(고토=가야금 대용, 샤나이=태평소 대용, 피들=해금 대용 포함): Fluid R3 GM 사운드폰트(Frank Wen, gleitz/midi-js-soundfonts 사전 렌더 mp3, CC BY 3.0 표기).
곡(선율·화성·리듬)은 이 스크립트가 만든 창작물이다. 반복 재생 시 이음매가 없게 잔향 꼬리를 앞으로 감는다.
사용: python3 compose.py <samples dir> <out dir>"""
import sys, os, numpy as np
SR = 44100
SMP, OUT = sys.argv[1], sys.argv[2]
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
SUSTAIN = {'shakuhachi', 'string_ensemble_1', 'pan_flute', 'contrabass', 'shanai', 'fiddle'}
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

    def note(self, inst, midi, bar, beat, dur, vel=.8, pan=0.0, jitter=.006, vib=0.0, scoop=0.0):
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
        if vib or scoop:  # 농현: 뒤로 갈수록 깊어지는 떨림(반음 단위), scoop: 아래에서 끌어올리는 시작음
            tt = np.arange(len(a)) / SR
            semi = vib * np.minimum(1, tt / .5) * np.sin(2 * np.pi * 5.2 * tt) - scoop * np.exp(-tt / .07)
            pos = np.cumsum(2 ** (semi / 12)); pos = pos[pos < len(a) - 1]
            a = np.interp(pos, np.arange(len(a)), a)
        i = max(0, int(start * SR))
        if i >= len(self.buf): return
        a = a[:len(self.buf) - i] * vel * self.rng.uniform(.9, 1.05)
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.buf[i:i + len(a), 0] += a * l * 1.41; self.buf[i:i + len(a), 1] += a * r * 1.41

    def seq(self, inst, bar0, pattern, step, vel=.8, pan=0.0, legato=1.0, **kw):
        """pattern: [(midi|None, steps), ...] 를 bar0 부터 step 박 단위로 늘어놓는다."""
        pos = 0.0
        for m, k in pattern:
            b = pos * step
            self.note(inst, m, bar0 + int(b // self.beats), b % self.beats, k * step * legato,
                      vel=vel, pan=pan, **kw) if not isinstance(m, tuple) else None
            if isinstance(m, tuple):
                for mm in m: self.note(inst, mm, bar0 + int(b // self.beats), b % self.beats, k * step * legato, vel=vel * .8, pan=pan)
            pos += k

    def render(self, path, wet=.28, decay=2.4, gain=.9, lowcut=False):
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
        if lowcut:  # 낮은 웅웅거림 덜기: 60Hz 아래 크게, 60~180Hz 살짝 깎는다(태고 타격음은 그 위라 남는다)
            for c in range(2):
                X = np.fft.rfft(out[:, c], F2); fr = np.fft.rfftfreq(F2, 1 / SR)
                g = np.where(fr < 60, .25, np.where(fr < 180, .25 + .75 * (fr - 60) / 120 * .6 + .15, 1.0)); g = np.minimum(g, 1.0)
                out[:, c] = np.fft.irfft(X * g, F2)[:len(out)]
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
GYEMYEON = [0, 3, 5, 7, 10]      # 계면조(조선 단조풍)
PYEONGJO = [0, 2, 5, 7, 9]       # 평조(sol la do re mi 꼴)

# ── 1) 시작 화면·결과(11-16 조선풍): 정악풍으로 느리게. 가야금(GM 고토) 산조식 뜯음 + 대금(GM 샤쿠하치) 농현 선율 + 해금(GM 피들) 지속음,
#     장구 대신 태고를 드문드문(덩·쿵). 평조 G. 서양 현악·종은 뺐다. (G, 60BPM, 20마디 ≈ 80초)
def title():
    T = Track(60, 20, seed=11); sc, r = PYEONGJO, 55  # G
    prog = [0, 0, -1, 0, 2, 1, 0, -1, 0, 0, -1, 0, 2, 3, 1, 0, 0, -1, -2, 0]
    for b, c in enumerate(prog):
        T.note('fiddle', deg(sc, r, c + 2), b, 0, 3.8, vel=.17, pan=.3, vib=.25)
        pluck = [(0, c), (1, c + 2), (1.5, c + 3), (2, c + 4), (3, c + 2)] if b % 2 == 0 else [(0, c + 4), (.5, c + 3), (1, c + 2), (2, c), (2.5, c + 1), (3, c + 2)]
        for at, d in pluck: T.note('koto', deg(sc, r - 12, d), b, at, 1.4, vel=.4 + .12 * (at == 0), pan=-.35 + .1 * d % .3, vib=.12 if at == 0 else 0)
        if b % 2 == 0: T.note('taiko_drum', 47, b, 0, 1, vel=.28, pan=0)
        if b % 4 == 3: T.note('taiko_drum', 52, b, 2.5, .5, vel=.2, pan=.2); T.note('taiko_drum', 50, b, 3, .5, vel=.22, pan=.2)
    T.seq('shakuhachi', 4, mel(sc, r, '4:3 3:1 2:2 3:1 2:1 0:6 -:2 2:2 4:2 5:3 4:1 3:4 -:4'), 1, vel=.5, pan=.15, vib=.4, scoop=.8)
    T.seq('shakuhachi', 12, mel(sc, r, '5:2 4:1 3:1 2:2 3:2 4:4 -:2 3:1 2:1 0:2 -1:2 0:8'), 1, vel=.48, pan=.15, vib=.4, scoop=.8)
    T.render(f'{OUT}/title.mp3', wet=.36, decay=3.0, lowcut=True)

# ── 2) 도중(11-16 조선풍): 굿거리 장단(한 박 3분할, 마디 12칸)을 태고로, 높은 잔북과 박(나무토막)이 받친다.
#     계면조 A. 가야금 3분할 리프, 대금 선율, 해금이 받는다. 낮은 콘트라베이스는 뺐다. (A, 점4분 92BPM, 32마디 ≈ 83초)
def field():
    T = Track(92, 32, seed=22); sc, r = GYEMYEON, 57  # A
    sub = 1 / 3
    gut = {0: (41, .5), 3: (50, .3), 5: (45, .26), 6: (41, .38), 8: (50, .26), 9: (45, .3), 11: (50, .28)}
    prog = [0, 0, -1, 0, 1, 0, -1, 0]
    for b in range(32):
        c = prog[b % 8] + (1 if 16 <= b < 24 else 0)
        for k in range(12):
            if k in gut: n, v = gut[k]; T.note('taiko_drum', n, b, k * sub, .4, vel=v, pan=.15 if n == 50 else 0)
            if k % 3 == 0: T.note('taiko_drum', 52, b, k * sub, .2, vel=.1, pan=.35)
        if b % 2 == 0: T.note('woodblock', 77, b, 0, .3, vel=.16, pan=.45)
        if b % 8 == 7:
            for i in range(6): T.note('taiko_drum', 50, b, 2 + i * sub, .2, vel=.2 + .05 * i, pan=-.2 + .08 * i)
        fig = [0, 2, 3, 4, 3, 2, 0, 2, 3, 2, 0, -1] if b % 2 == 0 else [0, 3, 4, 5, 4, 3, 2, 3, 2, 0, -1, 0]
        for k, d in enumerate(fig): T.note('koto', deg(sc, r - 12, c + d), b, k * sub, .45, vel=.32 + .1 * (k % 3 == 0), pan=-.3)
    A = '4:1 5:1 7:2 6:1 5:1 4:2 2:1 4:1 5:4 -:2 7:1 9:1 8:2 7:2 5:2 4:2 2:6 -:2'
    B = '9:2 8:1 7:1 5:2 7:2 8:4 7:2 5:2 4:1 5:1 4:1 2:1 0:4 -:4'
    T.seq('shakuhachi', 4, mel(sc, r - 12, A), 1, vel=.55, pan=.2, vib=.35, scoop=.8)
    T.seq('fiddle', 12, mel(sc, r - 12, B), 1, vel=.38, pan=.3, vib=.35, scoop=.9)
    T.seq('shakuhachi', 16, mel(sc, r - 12, B), 1, vel=.55, pan=.2, vib=.35, scoop=.8)
    T.seq('fiddle', 20, mel(sc, r - 24, A), 1, vel=.3, pan=.3, vib=.3)
    T.seq('shakuhachi', 24, mel(sc, r - 12, A), 1, vel=.5, pan=.2, vib=.35, scoop=.8)
    T.render(f'{OUT}/field.mp3', wet=.22, decay=1.8, lowcut=True)

# ── 3) 보스전: 조선풍(11-16 사용자 "긴박감 있게" → "태고 좋고 높게 타닥닥 좋음, 낮은음 거슬림, 조선풍 느낌나게").
#     자진모리 장단(한 박 = 3분할, 마디 4박 = 12칸)을 태고로 치고, 높은 잔북을 12칸 내내 타닥닥 굴린다.
#     계면조(E G A B D)에 태평소가 앞에서 외치고(농현 떨림·끌어올림), 해금이 한 옥타브 아래로 받고, 가야금이 3분할 오스티나토.
#     낮은 악기(팀파니·콘트라베이스)는 빼고 60Hz 아래·60~180Hz 를 깎는다. (E, 점4분 132BPM, 40마디 ≈ 73초)
def boss():
    T = Track(132, 40, seed=33); sc, r = GYEMYEON, 52  # E
    sub = 1 / 3
    jang = {0: ('big', .62), 2: ('mid', .32), 3: ('hi', .4), 5: ('mid', .3), 6: ('hi', .42), 8: ('mid', .3), 9: ('big', .5), 11: ('hi', .38)}
    drum = {'big': 41, 'mid': 45, 'hi': 50}
    for b in range(40):
        peak = b >= 24; climb = (b // 4) % 3 if b < 24 else 1 + (b // 2) % 3
        c = [0, 0, 1, -1][b % 4] + climb
        for k in range(12):
            if k in jang:
                kind, v = jang[k]; T.note('taiko_drum', drum[kind], b, k * sub, .4, vel=v * (1.12 if peak else 1), pan={'big': 0, 'mid': -.15, 'hi': .2}[kind])
            T.note('taiko_drum', 52, b, k * sub, .2, vel=.13 + .05 * (k % 3 == 0) + (.04 if peak else 0), pan=.35)  # 높은 잔북 타닥닥
        if b % 4 == 3:  # 마디 끝 몰아치기(휘몰이)
            for i in range(9): T.note('taiko_drum', 50, b, 3 + i * sub / 3 * 1.0, .12, vel=.18 + .045 * i, pan=-.3 + .07 * i)
        if b >= 4:  # 가야금: 3분할로 굴리는 오스티나토
            fig = [5, 7, 6, 5, 7, 8, 7, 5, 6, 5, 4, 5] if b % 2 == 0 else [5, 6, 7, 8, 7, 6, 5, 7, 6, 5, 3, 4]
            for k, d in enumerate(fig): T.note('koto', deg(sc, r - 12, c + d), b, k * sub, .4, vel=.34 + .1 * (k % 3 == 0), pan=-.35)
        if b % 2 == 0:  # 해금: 낮지 않은 음역에서 떨며 버티는 소리
            T.note('fiddle', deg(sc, r, c + 2), b, 0, 7.6, vel=.26 if not peak else .32, pan=.3, vib=.35)
    call = '7:1.5 6:.5 7:1 9:1 8:3 7:1 5:2 7:2 6:4 -:4 9:1.5 8:.5 9:1 10:1 9:3 8:1 7:2 6:2 5:4 -:4'
    T.seq('shanai', 4, mel(sc, r - 12, call), 1, vel=.55, pan=.05, vib=.45, scoop=1.2)
    T.seq('fiddle', 9, mel(sc, r - 24, call.split(' -:4 ')[1]), 1, vel=.3, pan=.35, vib=.4, scoop=1.0)
    T.seq('shanai', 14, mel(sc, r - 12, call.replace('6:4 -:4', '7:2 9:2 10:4').replace('5:4 -:4', '7:8')), 1, vel=.58, pan=.05, vib=.45, scoop=1.2)
    peak = '10:1 9:1 10:2 12:3 11:1 10:2 9:2 10:4 -:4 12:1 11:1 12:2 13:3 12:1 10:2 9:2 7:4 -:4'
    T.seq('shanai', 24, mel(sc, r - 12, peak), 1, vel=.62, pan=.05, vib=.5, scoop=1.4)
    T.seq('fiddle', 24, mel(sc, r - 24, peak), 1, vel=.28, pan=.35, vib=.4)
    T.seq('shanai', 34, mel(sc, r - 12, '9:2 10:1 9:1 7:2 9:2 10:4 -:4'), 1, vel=.6, pan=.05, vib=.5, scoop=1.2)
    T.render(f'{OUT}/boss.mp3', wet=.18, decay=1.6, gain=.95, lowcut=True)

# ── 4) 마지막 보스(11-16 조선풍): 진양조처럼 무겁게 시작해 휘모리로 몰아친다. 태평소 둘이 겹쳐 외치고 해금·가야금이 받친다.
#     큰북은 박마다, 높은 잔북은 쉬지 않고. 계면조 D, 저음 깎음. (D, 점4분 120BPM, 40마디 ≈ 80초)
def final():
    T = Track(120, 40, seed=44); sc, r = GYEMYEON, 50  # D
    sub = 1 / 3
    for b in range(40):
        fast = b >= 16; c = [0, 0, 1, -1, 0, 2, 1, 0][b % 8] + (1 if b >= 32 else 0)
        for k in range(12):
            if k % 3 == 0: T.note('taiko_drum', 41 if k in (0, 6) else 45, b, k * sub, .45, vel=(.6 if k == 0 else .42) * (1.1 if fast else .9))
            if fast or k % 3 == 0: T.note('taiko_drum', 52, b, k * sub, .2, vel=.12 + .05 * (k % 3 == 0), pan=.35)
            if fast and k % 3 == 2: T.note('taiko_drum', 50, b, k * sub, .2, vel=.24, pan=-.2)
        if b % 4 == 3:
            for i in range(9): T.note('taiko_drum', 50, b, 3 + i / 9, .1, vel=.2 + .045 * i, pan=-.3 + .07 * i)
        T.note('fiddle', deg(sc, r, c + 2), b, 0, 3.8, vel=.24 if fast else .2, pan=.3, vib=.35)
        if b >= 8:
            fig = [5, 7, 8, 7, 5, 4, 5, 7, 5, 4, 2, 4] if b % 2 == 0 else [7, 8, 9, 8, 7, 5, 4, 5, 7, 5, 4, 3]
            for k, d in enumerate(fig): T.note('koto', deg(sc, r - 12, c + d), b, k * sub, .4, vel=.34 + .1 * (k % 3 == 0), pan=-.35)
    M1 = '7:3 8:1 9:2 8:2 7:4 5:2 6:2 7:3 6:1 5:2 4:2 2:8'
    M2 = '9:2 10:2 12:3 10:1 9:2 8:2 7:4 8:2 9:2 8:2 7:1 6:1 5:4 7:4 5:8'
    T.seq('shakuhachi', 4, mel(sc, r - 12, M1), 1, vel=.5, pan=.15, vib=.4, scoop=.8)
    T.seq('shanai', 12, mel(sc, r - 12, M1), 1, vel=.55, pan=.05, vib=.45, scoop=1.2)
    T.seq('shanai', 20, mel(sc, r - 12, M2), 1, vel=.6, pan=-.05, vib=.5, scoop=1.3)
    T.seq('shanai', 20, mel(sc, r - 24, M2), 1, vel=.32, pan=.25, vib=.45)
    T.seq('shanai', 30, mel(sc, r - 12, M2.replace('5:4 7:4 5:8', '12:2 10:2 9:4')), 1, vel=.62, pan=.05, vib=.5, scoop=1.3)
    T.render(f'{OUT}/final.mp3', wet=.26, decay=2.2, gain=.95, lowcut=True)

for f in (title, field, boss, final): f()
