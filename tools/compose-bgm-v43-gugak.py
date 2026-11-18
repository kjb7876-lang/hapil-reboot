"""세로판 배경음악 9곡(제목·도중 4·보스 3·마지막 보스)을 직접 작곡·렌더링한다(2026-11-18, 국악 악기 보강).
  - 단소·거문고: 이 스크립트가 직접 합성한다(숨소리 섞인 관악, 술대로 치는 굵은 현). 샘플 없음.
  - 가야금(GM 고토)·태고(GM 태고 드럼)·해금(GM 피들)·박(GM 우드블록): Fluid R3 GM 사운드폰트(Frank Wen, CC BY 3.0) 샘플.
  - 곡(선율·장단·화성)은 모두 이 스크립트의 창작물이다. 반복 재생 때 이음매가 없게 잔향 꼬리를 앞으로 감는다.
사용: python3 compose-bgm-v43-gugak.py <samples dir(npy)> <out dir> [곡 이름...]"""
import sys, os, json, re, subprocess
import numpy as np
SR = 44100
SMP, OUT = sys.argv[1], sys.argv[2]
ONLY = sys.argv[3:]
NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
_cache, _norm, _syn = {}, {}, {}

def note_name(m): return NAMES[m % 12] + str(m // 12 - 1)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def sample(inst, midi):
    k = (inst, midi)
    if k not in _cache:
        if inst not in _norm:
            _norm[inst] = 0.9 / max(1e-4, float(np.abs(np.load(f'{SMP}/{inst}/A3.npy')).max()))
        _cache[k] = np.load(f'{SMP}/{inst}/{note_name(midi)}.npy').astype(np.float64) * _norm[inst]
    return _cache[k]

def extend(a, n):
    if len(a) >= n: return a
    s0, s1, xf = int(.6 * SR), int(2.2 * SR), int(.25 * SR)
    seg = a[s0:s1]; out = a[:s1].copy(); ramp = np.linspace(0, 1, xf)
    while len(out) < n:
        tail = out[-xf:] * (1 - ramp) + seg[:xf] * ramp
        out = np.concatenate([out[:-xf], tail, seg[xf:]])
    return out

def lp(x, fc):
    """FFT 저역통과(소리 합성용 잡음 다듬기)."""
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); X[fr > fc] = 0
    return np.fft.irfft(X, len(x))

def hp(x, fc):
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR); X[fr < fc] = 0
    return np.fft.irfft(X, len(x))

_rng = np.random.default_rng(5)

# ── 합성 악기 ─────────────────────────────────────────────────────────────────
def danso(m, dur, vib=.35, scoop=1.0, breath=1.0, over=0.0, trill=0.0):
    """단소: 숨소리가 섞인 맑고 얇은 관악. 소리 시작에 아래에서 끌어올리고(여음), 뒤로 갈수록 떨림이 깊어진다.
    over: 높은 음에서 숨을 세게 불어 거칠게(0~1). trill: 꺾는 소리(반음~온음, 빠른 왕복)."""
    n = int((dur + .3) * SR); t = np.arange(n) / SR
    f0 = mtof(m)
    sw = vib * np.clip((t - .25) / .5, 0, 1) * np.sin(2 * np.pi * 5.3 * t)
    semi = sw - scoop * np.exp(-t / .07)
    if trill: semi = semi + trill * (np.sin(2 * np.pi * 9 * t) > 0) * np.exp(-((t - .12) / .14) ** 2)
    th = 2 * np.pi * np.cumsum(f0 * 2 ** (semi / 12)) / SR
    tone = np.sin(th) + .30 * np.sin(2 * th + .3) + .11 * np.sin(3 * th + .8) + .05 * np.sin(4 * th)
    w = _rng.standard_normal(n)
    nb = lp(w, f0 * .14) * np.cos(th) + .6 * lp(_rng.standard_normal(n), f0 * .18) * np.cos(2 * th)
    nb *= .5 / (np.abs(nb).max() + 1e-9)
    hiss = hp(lp(w, 7000), 3000) * 1.0; hiss *= .5 / (np.abs(hiss).max() + 1e-9)
    chiff = hp(lp(w, 4500), 1500) * np.exp(-t / .03) * .9
    chiff *= .5 / (np.abs(chiff).max() + 1e-9)
    amp = np.clip(t / .06, 0, 1) ** .6 * (1 + .07 * np.sin(2 * np.pi * 4.7 * t + 1))
    amp *= np.where(t > dur, np.exp(-(t - dur) / .09), 1)
    sig = tone * .55 + (nb * .45 + hiss * .03) * breath * (1 + over * .6) * .5 + chiff * .18 * breath
    return sig * amp

def geomungo(m, dur, slide=0.0, vib=0.0, hit=1.0):
    """거문고: 술대로 내려치는 굵은 현. 낮은 소리에 둔탁한 타격, 짧은 울림, 눌러 흔드는(농현) 소리."""
    f0 = mtof(m); n = int((min(dur, 1.8) + .5) * SR); t = np.arange(n) / SR
    semi = .35 * np.exp(-t / .03) + slide * (1 - np.exp(-t / .1)) + vib * np.clip((t - .1) / .3, 0, 1) * np.sin(2 * np.pi * 4.6 * t)
    th = 2 * np.pi * np.cumsum(f0 * 2 ** (semi / 12)) / SR
    sig = np.zeros(n)
    tau0 = .95 * (110 / f0) ** .25
    for h in range(1, 10):
        if h * f0 > 5000: break
        sig += h ** -.85 * np.exp(-t / (tau0 / (1 + .55 * h))) * np.sin(h * th * np.sqrt(1 + 1.5e-4 * h * h))
    sig = np.tanh(1.7 * sig) / 1.4  # 술대에 쓸리는 거친 소리
    thump = lp(_rng.standard_normal(n), 380) * np.exp(-t / .02) * 3.0 * hit
    slap = hp(lp(_rng.standard_normal(n), 3500), 900) * np.exp(-t / .006) * .6 * hit
    sig += thump + slap
    sig *= np.where(t > dur, np.exp(-(t - dur) / .12), 1)
    return sig

def jing(m, dur):
    """징: 길게 울리며 일렁이는 큰 쇠소리(곡 머리·몰아치는 마디 끝에 한 번)."""
    f0 = mtof(m); n = int(3.2 * SR); t = np.arange(n) / SR; sig = np.zeros(n)
    for r, a, d in ((1, 1, 2.4), (1.5, .5, 1.6), (2.02, .45, 1.3), (2.77, .3, 1.0), (4.1, .15, .6)):
        sig += a * np.exp(-t / d) * np.sin(2 * np.pi * f0 * r * t + 1.6 * np.sin(2 * np.pi * (1.1 + r * .2) * t) * .3)
    sig += hp(lp(_rng.standard_normal(n), 3000), 800) * np.exp(-t / .03) * .3
    return sig * .6

def kkwaeng(m, dur):
    """꽹과리: 높고 짧은 쇳소리(농악풍 곡에서 장단 위에 얹음)."""
    f0 = mtof(m); n = int(.5 * SR); t = np.arange(n) / SR; sig = np.zeros(n)
    for r, a, d in ((1, 1, .12), (2.31, .7, .08), (3.42, .5, .05), (4.77, .35, .04)):
        sig += a * np.exp(-t / d) * np.sin(2 * np.pi * f0 * r * t)
    return sig * .5

SYN = {'danso': danso, 'geomungo': geomungo, 'jing': jing, 'kkwaeng': kkwaeng}
SUSTAIN = {'fiddle'}

class Track:
    def __init__(self, bpm, bars, beats=4, seed=1):
        self.spb = 60 / bpm; self.beats = beats; self.bars = bars
        self.length = int(round(bars * beats * self.spb * SR))
        self.buf = np.zeros((self.length + 6 * SR, 2))
        self.rng = np.random.default_rng(seed)

    def t(self, bar, beat): return (bar * self.beats + beat) * self.spb

    def note(self, inst, midi, bar, beat, dur, vel=.8, pan=0.0, jitter=.006, vib=0.0, scoop=0.0, **kw):
        if midi is None: return
        start = self.t(bar, beat) + self.rng.uniform(-jitter, jitter)
        n = int(dur * self.spb * SR)
        if inst in SYN:
            key = (inst, midi, round(dur * self.spb, 3), vib, scoop, tuple(sorted(kw.items())))
            if key not in _syn:
                f = SYN[inst]; d = dur * self.spb
                if inst == 'danso': _syn[key] = f(midi, d, vib=vib or .35, scoop=scoop if scoop else 1.0, **kw)
                elif inst == 'geomungo': _syn[key] = f(midi, d, vib=vib, **kw)
                else: _syn[key] = f(midi, d)
            a = _syn[key].copy()
        else:
            a = sample(inst, midi)
            if inst in SUSTAIN:
                a = extend(a, n + int(.4 * SR)); rel = int(.3 * SR); a = a[:n + rel].copy()
                a[-rel:] *= np.linspace(1, 0, rel) ** 2
                att = int(.07 * SR); a[:att] *= np.linspace(0, 1, att)
            else:
                cap = max(n + int(.25 * SR), int(.25 * SR))
                if len(a) > cap:
                    a = a[:cap].copy(); rel = min(int(.25 * SR), cap // 2); a[-rel:] *= np.linspace(1, 0, rel)
            if vib or scoop:  # 농현·여음
                tt = np.arange(len(a)) / SR
                semi = vib * np.minimum(1, tt / .5) * np.sin(2 * np.pi * 5.2 * tt) - scoop * np.exp(-tt / .07)
                pos = np.cumsum(2 ** (semi / 12)); pos = pos[pos < len(a) - 1]
                a = np.interp(pos, np.arange(len(a)), a)
        i = max(0, int(start * SR))
        if i >= len(self.buf): return
        a = a[:len(self.buf) - i] * vel * self.rng.uniform(.92, 1.05)
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.buf[i:i + len(a), 0] += a * l * 1.41; self.buf[i:i + len(a), 1] += a * r * 1.41

    def seq(self, inst, bar0, pattern, step, vel=.8, pan=0.0, legato=1.0, **kw):
        # 11-18 사용자 "너무 높고 귀 아픈 음": 단소·해금 선율이 A5(81)를 넘으면 구절 전체를 옥타브 내린다.
        cap = 81 if inst == 'danso' else 76 if inst == 'fiddle' else 999
        while max((m for m, _ in pattern if m is not None), default=0) > cap:
            pattern = [(None if m is None else m - 12, k) for m, k in pattern]
        pos = 0.0
        for m, k in pattern:
            b = pos * step
            self.note(inst, m, bar0 + int(b // self.beats), b % self.beats, k * step * legato, vel=vel, pan=pan, **kw)
            pos += k
        return pos * step / self.beats  # 마디 수

    def render(self, path, wet=.28, decay=2.4, gain=.9, lowcut=True, kbps=80):
        n = int(decay * SR); env = np.exp(-np.arange(n) / SR * 6.9 / decay)
        rng = np.random.default_rng(7); out = np.zeros_like(self.buf)
        L = len(self.buf) + n; F = 1 << (L - 1).bit_length()
        for c in range(2):
            ir = rng.standard_normal(n) * env; ir[:int(.012 * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
            wetsig = np.fft.irfft(np.fft.rfft(self.buf[:, c], F) * np.fft.rfft(ir, F), F)[:len(self.buf)]
            out[:, c] = self.buf[:, c] + wet * wetsig
        F2 = 1 << (len(out) - 1).bit_length()
        for c in range(2):
            X = np.fft.rfft(out[:, c], F2); fr = np.fft.rfftfreq(F2, 1 / SR)
            hpp = np.fft.irfft(X * (fr > 3000), F2)[:len(out)]
            g = np.abs(hpp).max() or 1
            out[:, c] += .02 * np.tanh(hpp / g * 3) * g / 3
        for c in range(2):  # 높은 소리 덜기: 4.5kHz 위 -6dB, 9kHz 위 -12dB 쪽으로 완만히
            X = np.fft.rfft(out[:, c], F2); fr = np.fft.rfftfreq(F2, 1 / SR)
            out[:, c] = np.fft.irfft(X / np.sqrt(1 + (fr / 4500) ** 2), F2)[:len(out)]
        if lowcut:
            for c in range(2):
                X = np.fft.rfft(out[:, c], F2); fr = np.fft.rfftfreq(F2, 1 / SR)
                g = np.where(fr < 60, .25, np.where(fr < 180, .25 + .75 * (fr - 60) / 120 * .6 + .15, 1.0)); g = np.minimum(g, 1.0)
                out[:, c] = np.fft.irfft(X * g, F2)[:len(out)]
        loop = out[:self.length].copy(); spill = out[self.length:]
        loop[:len(spill)] += spill[:self.length]
        # 이음매: 끝 40ms 를 앞 40ms 와 교차 페이드(합친 꼬리가 불연속이 되지 않게)
        peak = np.abs(loop).max(); loop = np.tanh(loop / peak * 1.25) / np.tanh(1.25) * gain
        pcm = (loop * 32767).astype('<i2').tobytes()
        inp = ['ffmpeg', '-hide_banner', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-']
        meas = subprocess.run(inp + ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                              input=pcm, capture_output=True).stderr.decode()
        m = json.loads(re.findall(r'\{[^{}]*\}', meas)[-1])
        af = ('loudnorm=I=-16:TP=-1.5:LRA=11:linear=true:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s'
              % (m['input_i'], m['input_tp'], m['input_lra'], m['input_thresh'], m['target_offset']))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', af,
                        '-ar', str(SR), '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', path], input=pcm, check=True)
        print(path, round(self.length / SR, 1), 's', os.path.getsize(path) // 1024, 'KB', flush=True)

def deg(scale, root, d):
    o, i = divmod(d, len(scale)); return root + 12 * o + scale[i]

def mel(scale, root, text, units=None):
    """'0:2 2:1 4:1 -:2' → [(midi,steps)], '-'는 쉼표. units 가 있으면 합이 마디 길이의 배수인지 확인한다."""
    out = []
    for tok in text.split():
        d, k = tok.split(':'); out.append((None if d == '-' else deg(scale, root, int(d)), float(k)))
    if units:
        tot = sum(k for _, k in out)
        assert tot % units == 0, f'phrase length {tot} not multiple of {units}: {text}'
    return out

GYEMYEON = [0, 3, 5, 7, 10]   # 계면조(E G A B D 꼴)
PYEONGJO = [0, 2, 5, 7, 9]    # 평조(G A C D E 꼴)
GYEONG = [0, 2, 4, 7, 9]      # 경토리 꼴(밝은 민요: 도 레 미 솔 라)
MENARI = [0, 3, 5, 8, 10]     # 메나리토리 꼴(동부 민요: 미 솔 라 도 레, 6도 낮음)

os.makedirs(OUT, exist_ok=True)
S3 = 1 / 3

def want(name): return not ONLY or name in ONLY

# ── 장단 도우미 ────────────────────────────────────────────────────────────────
def drums12(T, bars, jang, big=(41, 45, 50), hi=52, rim=.12, start=0, fill_every=0, vel=1.0):
    """12칸(한 박 3분할) 장단. jang: {칸: ('big'|'mid'|'hi', 세기)}"""
    drum = {'big': big[0], 'mid': big[1], 'hi': big[2]}
    for b in range(start, bars):
        for k in range(12):
            if k in jang:
                kind, v = jang[k]; T.note('taiko_drum', drum[kind], b, k * S3, .4, vel=v * vel, pan={'big': 0, 'mid': -.15, 'hi': .2}[kind])
            if rim and k % 3 == 0: T.note('taiko_drum', hi, b, k * S3, .2, vel=rim * vel, pan=.35)
        if fill_every and b % fill_every == fill_every - 1:
            for i in range(9): T.note('taiko_drum', big[2], b, 3 + i * S3 / 3, .12, vel=(.16 + .04 * i) * vel, pan=-.3 + .07 * i)

# ── 1) 제목: 느린 정악풍. 단소가 노래하고 가야금이 뜯고 거문고가 낮게 받친다. (G 평조, 56BPM, 18마디 ≈ 77초)
def title():
    T = Track(56, 18, seed=11); sc, r = PYEONGJO, 55
    prog = [0, 0, -1, 0, 2, 1, 0, -1, 0, 0, -1, 0, 2, 3, 1, 0, 0, -1]
    for b, c in enumerate(prog):
        T.note('fiddle', deg(sc, r, c + 2), b, 0, 3.9, vel=.14, pan=.3, vib=.25)
        pluck = [(0, c), (1, c + 2), (1.5, c + 3), (2, c + 4), (3, c + 2)] if b % 2 == 0 else [(0, c + 4), (.5, c + 3), (1, c + 2), (2, c), (2.5, c + 1), (3, c + 2)]
        for at, d in pluck: T.note('koto', deg(sc, r - 12, d), b, at, 1.4, vel=.42 + .12 * (at == 0), pan=-.35 + .1 * d % .3, vib=.12 if at == 0 else 0)
        if b % 2 == 0: T.note('geomungo', deg(sc, r - 24, c), b, 0, 1.4, vel=.5, pan=-.1, hit=.8)
        if b % 4 == 2: T.note('geomungo', deg(sc, r - 24, c + 2), b, 2.5, 1.2, vel=.34, pan=-.1, slide=-.4)
        if b % 2 == 0: T.note('taiko_drum', 47, b, 0, 1, vel=.26, pan=0)
        if b % 4 == 3: T.note('taiko_drum', 52, b, 2.5, .5, vel=.18, pan=.2); T.note('taiko_drum', 50, b, 3, .5, vel=.2, pan=.2)
    T.note('jing', r - 12, 0, 0, 4, vel=.28)
    A = '5:3 7:1 6:2 5:2 3:4 2:2 0:2'  # 16 beats
    B = '6:2 7:2 6:2 5:2 4:2 5:2 3:2 2:2'
    for bar0, txt, v in ((2, A, .5), (6, B, .5), (10, A, .5)):
        T.seq('danso', bar0, mel(sc, r, txt, 4), 1, vel=v, pan=.15, vib=.4, scoop=1.0)
    T.seq('danso', 14, mel(sc, r, '6:2 5:2 3:2 2:2 0:8', 4), 1, vel=.52, pan=.15, vib=.45, scoop=1.0)
    T.seq('fiddle', 6, mel(sc, r - 12, B, 4), 1, vel=.2, pan=.3, vib=.35, scoop=.5)
    T.render(f'{OUT}/title.mp3', wet=.36, decay=3.0)

# ── 2) 도중 1: 굿거리. 가야금 3분할 리프, 단소 선율, 거문고가 장단 첫 박을 짚는다. (A 계면조, 점4분 92BPM, 32마디 ≈ 83초)
def field1():
    T = Track(92, 32, seed=22); sc, r = GYEMYEON, 57
    gut = {0: ('big', .5), 3: ('mid', .3), 5: ('hi', .26), 6: ('big', .38), 8: ('mid', .26), 9: ('hi', .3), 11: ('hi', .28)}
    drums12(T, 32, gut, big=(41, 50, 52), rim=.1)
    prog = [0, 0, -1, 0, 1, 0, -1, 0]
    for b in range(32):
        c = prog[b % 8] + (1 if 16 <= b < 24 else 0)
        if b % 2 == 0: T.note('woodblock', 77, b, 0, .3, vel=.14, pan=.45)
        fig = [0, 2, 3, 4, 3, 2, 0, 2, 3, 2, 0, -1] if b % 2 == 0 else [0, 3, 4, 5, 4, 3, 2, 3, 2, 0, -1, 0]
        for k, d in enumerate(fig): T.note('koto', deg(sc, r - 12, c + d), b, k * S3, .45, vel=.3 + .1 * (k % 3 == 0), pan=-.3)
        T.note('geomungo', deg(sc, r - 24, c), b, 0, 1.2, vel=.46, pan=-.05)
        T.note('geomungo', deg(sc, r - 24, c + (2 if b % 4 == 3 else 0)), b, 2, .9, vel=.34, pan=-.05, slide=.0 if b % 4 != 3 else -.5)
        if b % 8 == 7:
            for i in range(6): T.note('taiko_drum', 50, b, 2 + i * S3, .2, vel=.2 + .05 * i, pan=-.2 + .08 * i)
    A = '3:4 5:2 4:2 3:2 2:2 3:6 -:2 2:1 3:1 4:2 5:4 6:2 5:2 4:2 3:2 2:3 3:1 1:2 0:6'
    B = '6:4 7:2 6:2 5:2 4:2 5:3 4:1 3:2 2:6 3:4 4:2 3:2 2:2 1:2 0:3 1:1 0:8'
    st = S3
    T.seq('danso', 4, mel(sc, r, A, 12), st, vel=.5, pan=.2, vib=.35, scoop=1.0)
    T.seq('fiddle', 8, mel(sc, r - 12, B, 12), st, vel=.38, pan=.3, vib=.3, scoop=.5)
    T.seq('danso', 12, mel(sc, r, B, 12), st, vel=.5, pan=.2, vib=.35, scoop=1.0)
    T.seq('danso', 16, mel(sc, r, B, 12), st, vel=.5, pan=.2, vib=.4, scoop=1.0)
    T.seq('fiddle', 20, mel(sc, r - 12, A, 12), st, vel=.34, pan=.3, vib=.3)
    T.seq('danso', 24, mel(sc, r, A, 12), st, vel=.5, pan=.2, vib=.35, scoop=1.0)
    T.seq('danso', 28, mel(sc, r, B, 12), st, vel=.52, pan=.2, vib=.4, scoop=1.0)
    T.render(f'{OUT}/field.mp3', wet=.22, decay=1.8)

# ── 3) 도중 2: 중모리. 한 마디 12칸을 넉넉히 짚고, 메나리토리 단조로 서정적. 가야금이 흐르고 해금이 노래한다. (E 메나리, 80BPM, 24마디 ≈ 72초)
def field2():
    T = Track(80, 24, seed=23); sc, r = MENARI, 52
    jm = {0: ('big', .5), 3: ('mid', .26), 4: ('hi', .2), 6: ('big', .36), 9: ('mid', .26), 10: ('hi', .2)}
    drums12(T, 24, jm, big=(43, 48, 52), rim=.07, start=2)
    prog = [0, 0, 1, 0, -1, 0, 2, 0]
    for b in range(24):
        c = prog[b % 8]
        fig = [0, 2, 4, 2, 0, 2, 3, 2, 0, 2, 4, 5] if b % 2 == 0 else [5, 4, 3, 2, 3, 4, 2, 0, 2, 0, -1, 0]
        for k, d in enumerate(fig):
            if b >= 2: T.note('koto', deg(sc, r, c + d), b, k * S3, .6, vel=.3 + .1 * (k % 3 == 0), pan=-.3)
        T.note('geomungo', deg(sc, r - 24, c), b, 0, 1.6, vel=.46, pan=-.05)
        if b % 2 == 1: T.note('geomungo', deg(sc, r - 24, c + 2), b, 2, 1.0, vel=.32, pan=-.05, slide=-.6)
    T.note('jing', r - 12, 2, 0, 4, vel=.26)
    A = '3:6 4:3 3:3 2:6 3:3 5:3 4:6 3:3 2:3 0:12'  # 4마디 = 48칸
    A = '4:6 5:3 4:3 3:6 4:3 2:3 3:6 2:3 0:3 2:12'
    B = '5:3 6:3 7:3 6:3 5:6 4:3 5:3 4:6 2:3 3:3 2:6 0:3 1:3 0:12'
    st = S3
    T.seq('fiddle', 4, mel(sc, r, A, 12), st, vel=.4, pan=.25, vib=.4, scoop=.6)
    T.seq('danso', 8, mel(sc, r + 12, A, 12), st, vel=.5, pan=.15, vib=.4, scoop=1.0)
    T.seq('danso', 12, mel(sc, r + 12, B, 12), st, vel=.5, pan=.15, vib=.4, scoop=1.0)
    T.seq('fiddle', 16, mel(sc, r, B, 12), st, vel=.4, pan=.25, vib=.4, scoop=.6)
    T.seq('danso', 20, mel(sc, r + 12, A, 12), st, vel=.52, pan=.15, vib=.45, scoop=1.0)
    T.render(f'{OUT}/field2.mp3', wet=.3, decay=2.2)

# ── 4) 도중 3: 세마치. 한 마디 9칸(3박×3분할)으로 흔들리는 경쾌한 민요풍. 경토리 꼴 장조 느낌. (D, 점4분 100BPM, 40마디 ≈ 72초)
def field3():
    T = Track(100, 40, beats=3, seed=24); sc, r = GYEONG, 50
    sm = {0: ('big', .5), 2: ('hi', .22), 3: ('mid', .32), 5: ('hi', .2), 6: ('mid', .32), 7: ('hi', .22), 8: ('hi', .2)}
    drum = {'big': 41, 'mid': 45, 'hi': 50}
    prog = [0, 0, 2, 0, 1, 0, -1, 0]
    for b in range(40):
        c = prog[b % 8]
        for k in range(9):
            if k in sm: kind, v = sm[k]; T.note('taiko_drum', drum[kind], b, k * S3, .4, vel=v, pan={'big': 0, 'mid': -.15, 'hi': .2}[kind])
        T.note('woodblock', 77, b, 0, .3, vel=.12, pan=.45); T.note('woodblock', 72, b, 1.0, .3, vel=.08, pan=.45)
        fig = [0, 2, 3, 2, 3, 4, 3, 2, 0] if b % 2 == 0 else [4, 3, 2, 3, 2, 0, 2, 0, -1]
        for k, d in enumerate(fig): T.note('koto', deg(sc, r, c + d), b, k * S3, .5, vel=.3 + .1 * (k % 3 == 0), pan=-.3)
        T.note('geomungo', deg(sc, r - 24, c), b, 0, .9, vel=.44, pan=-.05)
        T.note('geomungo', deg(sc, r - 24, c + 4), b, 2, .6, vel=.28, pan=-.05)
    A = '4:3 5:2 4:1 2:3 3:3 4:3 3:3 2:3 0:3 2:3 3:2 4:1 2:3 0:3'
    B = '7:3 8:2 7:1 5:3 4:3 5:3 4:3 3:3 2:3 4:3 5:2 4:1 2:3 0:3'
    st = S3
    T.seq('danso', 4, mel(sc, r + 12, A, 9), st, vel=.5, pan=.2, vib=.3, scoop=1.0)
    T.seq('fiddle', 8, mel(sc, r, A, 9), st, vel=.4, pan=.3, vib=.3, scoop=.5)
    T.seq('danso', 12, mel(sc, r + 12, B, 9), st, vel=.5, pan=.2, vib=.35, scoop=1.0)
    T.seq('danso', 16, mel(sc, r + 12, A, 9), st, vel=.5, pan=.2, vib=.3, scoop=1.0)
    T.seq('fiddle', 20, mel(sc, r, B, 9), st, vel=.4, pan=.3, vib=.3, scoop=.5)
    T.seq('danso', 24, mel(sc, r + 12, B, 9), st, vel=.52, pan=.2, vib=.35, scoop=1.0)
    T.seq('fiddle', 28, mel(sc, r, A, 9), st, vel=.4, pan=.3, vib=.3, scoop=.5)
    T.seq('danso', 32, mel(sc, r + 12, A, 9), st, vel=.5, pan=.2, vib=.3, scoop=1.0)
    T.seq('danso', 36, mel(sc, r + 12, B, 9), st, vel=.54, pan=.2, vib=.35, scoop=1.0)
    T.render(f'{OUT}/field3.mp3', wet=.2, decay=1.6)

# ── 5) 도중 4: 농악풍 휘모리. 빠르고 흥겹게, 꽹과리가 얹히고 가야금이 달린다. (G 평조, 점4분 128BPM, 32마디 ≈ 64초)
def field4():
    T = Track(128, 32, seed=25); sc, r = PYEONGJO, 55
    jm = {0: ('big', .52), 3: ('mid', .3), 5: ('hi', .28), 6: ('big', .4), 9: ('mid', .3), 10: ('hi', .26), 11: ('hi', .3)}
    drums12(T, 32, jm, big=(41, 47, 52), rim=.12, fill_every=8)
    prog = [0, 0, -1, 0, 1, 0, -1, 0]
    for b in range(32):
        c = prog[b % 8]
        fig = [0, 2, 4, 2, 4, 5, 4, 2, 0, 2, 0, -1] if b % 2 == 0 else [5, 4, 2, 4, 2, 0, 2, 0, -1, 0, 2, 0]
        for k, d in enumerate(fig): T.note('koto', deg(sc, r, c + d), b, k * S3, .4, vel=.3 + .1 * (k % 3 == 0), pan=-.3)
        T.note('geomungo', deg(sc, r - 24, c), b, 0, .8, vel=.46, pan=-.05)
        T.note('geomungo', deg(sc, r - 24, c), b, 2, .6, vel=.32, pan=-.05)
        for k in (0, 5, 9, 11) if b % 2 == 0 else (0, 3, 6, 9): T.note('kkwaeng', 81 + (5 if k % 2 else 0), b, k * S3, .2, vel=.05 + .02 * (k == 0), pan=.4)
    A = '4:3 5:3 7:3 5:3 4:3 2:3 4:6 5:3 4:3 7:3 5:3 4:3 2:3 0:3 2:3'
    B = '9:3 10:3 12:3 10:3 9:3 7:3 9:6 10:3 9:3 7:3 5:3 4:3 2:3 0:6'
    st = S3
    T.seq('danso', 4, mel(sc, r, A, 12), st, vel=.5, pan=.2, vib=.3, scoop=1.0)
    T.seq('fiddle', 8, mel(sc, r - 12, A, 12), st, vel=.34, pan=.3, vib=.3)
    T.seq('danso', 12, mel(sc, r, B, 12), st, vel=.52, pan=.2, vib=.3, scoop=1.0)
    T.seq('danso', 16, mel(sc, r, A, 12), st, vel=.5, pan=.2, vib=.3, scoop=1.0)
    T.seq('danso', 20, mel(sc, r, B, 12), st, vel=.54, pan=.2, vib=.35, scoop=1.0)
    T.seq('fiddle', 24, mel(sc, r - 12, B, 12), st, vel=.34, pan=.3, vib=.3)
    T.seq('danso', 28, mel(sc, r, A, 12), st, vel=.54, pan=.2, vib=.35, scoop=1.0)
    T.render(f'{OUT}/field4.mp3', wet=.2, decay=1.5)

# ── 6) 보스 1: 자진모리. 태고 장단과 높은 잔북, 단소가 날카롭게 외치고 가야금이 굴린다. (E 계면조, 132BPM, 40마디 ≈ 73초)
def boss():
    T = Track(132, 40, seed=33); sc, r = GYEMYEON, 52
    jang = {0: ('big', .62), 2: ('mid', .32), 3: ('hi', .4), 5: ('mid', .3), 6: ('hi', .42), 8: ('mid', .3), 9: ('big', .5), 11: ('hi', .38)}
    for b in range(40):
        peak = b >= 24; climb = (b // 4) % 3 if b < 24 else 1 + (b // 2) % 3
        c = [0, 0, 1, -1][b % 4] + climb
        drums12(T, b + 1, jang, big=(41, 45, 50), rim=.13 + (.04 if peak else 0), start=b, fill_every=4, vel=1.12 if peak else 1)
        if b >= 4:
            fig = [5, 7, 6, 5, 7, 8, 7, 5, 6, 5, 4, 5] if b % 2 == 0 else [5, 6, 7, 8, 7, 6, 5, 7, 6, 5, 3, 4]
            for k, d in enumerate(fig): T.note('koto', deg(sc, r - 12, c + d), b, k * S3, .4, vel=.34 + .1 * (k % 3 == 0), pan=-.35)
        T.note('geomungo', deg(sc, r - 24, c), b, 0, .7, vel=.54 if peak else .46, pan=-.05, hit=1.2)
        T.note('geomungo', deg(sc, r - 24, c + (2 if b % 4 == 3 else 0)), b, 2, .5, vel=.36, pan=-.05, hit=1.1)
        if b % 2 == 0: T.note('fiddle', deg(sc, r, c + 2), b, 0, 7.6, vel=.24 if not peak else .3, pan=.3, vib=.35)
    T.note('jing', r - 12, 0, 0, 4, vel=.3); T.note('jing', r - 12, 24, 0, 4, vel=.34)
    call = '7:1.5 6:.5 7:1 9:1 8:3 7:1 5:2 7:2 6:4 -:4 9:1.5 8:.5 9:1 10:1 9:3 8:1 7:2 6:2 5:4 -:4'
    T.seq('danso', 4, mel(sc, r, call), 1, vel=.58, pan=.05, vib=.45, scoop=1.2, over=.4)
    T.seq('fiddle', 9, mel(sc, r - 12, call.split(' -:4 ')[1]), 1, vel=.3, pan=.35, vib=.4, scoop=1.0)
    T.seq('danso', 14, mel(sc, r, call.replace('6:4 -:4', '7:2 9:2 10:4').replace('5:4 -:4', '7:8')), 1, vel=.6, pan=.05, vib=.45, scoop=1.2, over=.5)
    peakm = '10:1 9:1 10:2 12:3 11:1 10:2 9:2 10:4 -:4 12:1 11:1 12:2 13:3 12:1 10:2 9:2 7:4 -:4'
    T.seq('danso', 24, mel(sc, r, peakm), 1, vel=.62, pan=.05, vib=.5, scoop=1.4, over=.7)
    T.seq('fiddle', 24, mel(sc, r - 12, peakm), 1, vel=.28, pan=.35, vib=.4)
    T.seq('danso', 34, mel(sc, r, '9:2 10:1 9:1 7:2 9:2 10:4 -:4'), 1, vel=.6, pan=.05, vib=.5, scoop=1.2, over=.5)
    T.render(f'{OUT}/boss.mp3', wet=.18, decay=1.6, gain=.95)

# ── 7) 보스 2(11-18 다시 만듦): 엇모리 장단(한 마디 10칸 = 3+2+3+2). 절룩이듯 엇박으로 몰아치는 신비롭고 불길한 곡.
#     거문고가 3+2 엇박 가락을 굵게 짚고, 태고가 무리마다 내려치며, 가야금이 흔들고, 단소는 낮게 휘감는다. 높은 소리는 쓰지 않는다.
#     (A 계면조, 한 칸 = 8분, 박 200BPM, 44마디 ≈ 66초)
def boss2():
    T = Track(200, 44, beats=5, seed=36); sc, r = GYEMYEON, 57
    U = .5  # 한 칸 = 반 박
    groups = [(0, 3), (3, 2), (5, 3), (8, 2)]
    for b in range(44):
        peak = b >= 24; c = [0, 0, -1, 1, 0, 2, 1, 0][b % 8] + (1 if b >= 32 else 0)
        for gi, (g0, gl) in enumerate(groups):
            big = gi in (0, 2)
            T.note('taiko_drum', 41 if gi == 0 else 45 if big else 47, b, g0 * U, .4, vel=(.6 if gi == 0 else .42 if big else .3) * (1.1 if peak else 1), pan=0 if big else -.15)
            for k in range(1, gl):
                T.note('taiko_drum', 52, b, (g0 + k) * U, .2, vel=.12 + (.05 if peak else 0), pan=.3)
        if b % 4 == 3:
            for i in range(6): T.note('taiko_drum', 50, b, 3.5 + i * .25, .1, vel=.16 + .045 * i, pan=-.3 + .1 * i)
        geo = [(0, c, .55), (3, c + 2, .4), (5, c + 1, .48), (8, c, .4)] if b % 2 == 0 else [(0, c, .55), (3, c - 1, .4), (5, c + 2, .48), (8, c + 1, .4)]
        for at, d, v in geo: T.note('geomungo', deg(sc, r - 24, d), b, at * U, .9, vel=v * (1.08 if peak else 1), pan=-.1, hit=1.2, slide=-.4 if at == 8 else 0)
        if b >= 4:
            fig = [5, 4, 3, 4, 5, 7, 5, 4, 3, 2] if b % 2 == 0 else [3, 4, 5, 4, 3, 2, 0, 2, 3, 4]
            for k, d in enumerate(fig): T.note('koto', deg(sc, r - 12, c + d), b, k * U, .45, vel=.3 + .1 * (k in (0, 3, 5, 8)), pan=-.35)
        if b % 4 == 0 and b >= 8: T.note('fiddle', deg(sc, r - 12, c + 4), b, 0, 19.6, vel=.24, pan=.3, vib=.4)
    T.note('jing', r - 12, 0, 0, 4, vel=.3); T.note('jing', r - 12, 24, 0, 4, vel=.34)
    A = '5:3 4:2 3:3 2:2 3:3 5:2 4:5 3:3 2:2 0:3 2:2 3:5 -:5'          # 4마디(40칸)
    B = '7:3 6:2 5:3 4:2 5:5 4:3 3:2 2:3 3:2 4:3 2:2 0:8 -:2'
    C = '7:3 8:2 7:3 5:2 7:5 6:3 5:2 4:3 5:2 3:3 2:2 3:8 -:2'
    for bar0, txt, v, o in ((4, A, .5, .2), (8, B, .5, .2), (12, A, .52, .3), (16, B, .52, .3), (24, C, .56, .4), (28, B, .56, .4), (32, C, .58, .4), (36, A, .56, .3), (40, B, .54, .3)):
        T.seq('danso', bar0, mel(sc, r, txt, 10), U, vel=v, pan=.05, vib=.45, scoop=1.2, over=o)
    T.seq('fiddle', 16, mel(sc, r - 12, A, 10), U, vel=.3, pan=.35, vib=.4)
    T.seq('fiddle', 32, mel(sc, r - 12, C, 10), U, vel=.3, pan=.35, vib=.4)
    T.render(f'{OUT}/boss2.mp3', wet=.2, decay=1.6, gain=.95)

# ── 8) 보스 3: 중중모리 행진. 묵직하게 걸어오는 태고, 거문고의 굵은 가락, 해금이 울부짖는다. (D 계면조, 점4분 108BPM, 36마디 ≈ 80초)
def boss3():
    T = Track(108, 36, seed=35); sc, r = GYEMYEON, 50
    jm = {0: ('big', .66), 3: ('mid', .3), 4: ('hi', .26), 6: ('big', .5), 8: ('hi', .28), 9: ('mid', .34), 10: ('hi', .26), 11: ('hi', .3)}
    drums12(T, 36, jm, big=(41, 45, 50), rim=.1, fill_every=4)
    for b in range(36):
        c = [0, 0, -1, 1, 0, 2, 1, -1][b % 8] + (1 if b >= 24 else 0)
        T.note('geomungo', deg(sc, r - 24, c), b, 0, 1.0, vel=.56, pan=-.05, hit=1.3)
        T.note('geomungo', deg(sc, r - 24, c + 2), b, 1.5, .6, vel=.4, pan=-.05, hit=1.2, slide=-.4)
        T.note('geomungo', deg(sc, r - 24, c), b, 2, .8, vel=.46, pan=-.05, hit=1.2)
        if b >= 4:
            fig = [5, 7, 8, 7, 5, 4, 5, 7, 5, 4, 2, 4] if b % 2 == 0 else [7, 8, 9, 8, 7, 5, 4, 5, 7, 5, 4, 3]
            for k, d in enumerate(fig): T.note('koto', deg(sc, r - 12, c + d), b, k * S3, .4, vel=.34 + .1 * (k % 3 == 0), pan=-.35)
        if b % 2 == 0: T.note('fiddle', deg(sc, r, c + 2), b, 0, 7.6, vel=.26, pan=.3, vib=.35)
    T.note('jing', r - 12, 0, 0, 4, vel=.32); T.note('jing', r - 12, 12, 0, 4, vel=.32); T.note('jing', r - 12, 24, 0, 4, vel=.36)
    M1 = '7:6 8:3 9:3 8:6 7:3 5:3 7:6 6:3 5:3 4:12'            # 4마디
    M2 = '9:6 10:3 12:3 10:6 9:3 8:3 9:6 7:3 5:3 7:12'
    st = S3
    T.seq('danso', 4, mel(sc, r, M1, 12), st, vel=.56, pan=.05, vib=.45, scoop=1.2, over=.3)
    T.seq('fiddle', 8, mel(sc, r - 12, M1, 12), st, vel=.34, pan=.3, vib=.4, scoop=.6)
    T.seq('danso', 12, mel(sc, r, M2, 12), st, vel=.58, pan=.05, vib=.45, scoop=1.2, over=.4)
    T.seq('danso', 16, mel(sc, r, M1, 12), st, vel=.58, pan=.05, vib=.45, scoop=1.2, over=.4)
    T.seq('fiddle', 20, mel(sc, r - 12, M2, 12), st, vel=.34, pan=.3, vib=.4)
    T.seq('danso', 24, mel(sc, r, M2, 12), st, vel=.62, pan=.05, vib=.5, scoop=1.3, over=.6)
    T.seq('danso', 28, mel(sc, r, M1.replace('4:12', '9:12'), 12), st, vel=.62, pan=.05, vib=.5, scoop=1.3, over=.7)
    T.seq('danso', 32, mel(sc, r, M2, 12), st, vel=.62, pan=.05, vib=.5, scoop=1.3, over=.7)
    T.render(f'{OUT}/boss3.mp3', wet=.2, decay=1.8, gain=.95)

# ── 9) 마지막 보스: 진양조처럼 무겁게 시작해 휘모리로 몰아친다. 단소·해금이 겹쳐 외치고 거문고·태고가 짓누른다. (D 계면조, 120BPM, 40마디 ≈ 80초)
def final():
    T = Track(120, 40, seed=44); sc, r = GYEMYEON, 50
    for b in range(40):
        fast = b >= 16; c = [0, 0, 1, -1, 0, 2, 1, 0][b % 8] + (1 if b >= 32 else 0)
        for k in range(12):
            if k % 3 == 0: T.note('taiko_drum', 41 if k in (0, 6) else 45, b, k * S3, .45, vel=(.6 if k == 0 else .42) * (1.1 if fast else .9))
            if fast or k % 3 == 0: T.note('taiko_drum', 52, b, k * S3, .2, vel=.12 + .05 * (k % 3 == 0), pan=.35)
            if fast and k % 3 == 2: T.note('taiko_drum', 50, b, k * S3, .2, vel=.24, pan=-.2)
        if b % 4 == 3:
            for i in range(9): T.note('taiko_drum', 50, b, 3 + i / 9, .1, vel=.2 + .045 * i, pan=-.3 + .07 * i)
        T.note('geomungo', deg(sc, r - 24, c), b, 0, 1.2, vel=.54, pan=-.05, hit=1.3)
        if fast: T.note('geomungo', deg(sc, r - 24, c), b, 2, .7, vel=.4, pan=-.05, hit=1.2)
        T.note('fiddle', deg(sc, r, c + 2), b, 0, 3.8, vel=.24 if fast else .2, pan=.3, vib=.35)
        if b >= 8:
            fig = [5, 7, 8, 7, 5, 4, 5, 7, 5, 4, 2, 4] if b % 2 == 0 else [7, 8, 9, 8, 7, 5, 4, 5, 7, 5, 4, 3]
            for k, d in enumerate(fig): T.note('koto', deg(sc, r - 12, c + d), b, k * S3, .4, vel=.34 + .1 * (k % 3 == 0), pan=-.35)
    T.note('jing', r - 12, 0, 0, 4, vel=.34); T.note('jing', r - 12, 16, 0, 4, vel=.38); T.note('jing', r - 12, 32, 0, 4, vel=.4)
    M1 = '7:3 8:1 9:2 8:2 7:4 5:2 6:2 7:3 6:1 5:2 4:2 2:8'
    M2 = '9:2 10:2 12:3 10:1 9:2 8:2 7:4 8:2 9:2 8:2 7:1 6:1 5:4 7:4 5:8'
    T.seq('danso', 4, mel(sc, r, M1), 1, vel=.52, pan=.1, vib=.4, scoop=1.0, over=.2)
    T.seq('danso', 12, mel(sc, r, M1), 1, vel=.56, pan=.05, vib=.45, scoop=1.2, over=.4)
    T.seq('danso', 20, mel(sc, r, M2), 1, vel=.62, pan=-.05, vib=.5, scoop=1.3, over=.6)
    T.seq('fiddle', 20, mel(sc, r - 12, M2), 1, vel=.32, pan=.25, vib=.45)
    T.seq('danso', 30, mel(sc, r, M2.replace('5:4 7:4 5:8', '12:2 10:2 9:4')), 1, vel=.64, pan=.05, vib=.5, scoop=1.3, over=.8)
    T.render(f'{OUT}/final.mp3', wet=.26, decay=2.2, gain=.95)

for name, f in (('title', title), ('field', field1), ('field2', field2), ('field3', field3), ('field4', field4),
                ('boss', boss), ('boss2', boss2), ('boss3', boss3), ('final', final)):
    if want(name): f()
