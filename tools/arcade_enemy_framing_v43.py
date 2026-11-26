"""Measure pose registration once, from the actual arcade WebPs.

Each animation keeps a single scale and offset. Never trim or recenter individual
frames: a stride, a sword swing and a collapsing body should keep their motion.
"""
import itertools
from bisect import bisect_left
import json
from pathlib import Path
from statistics import median
from PIL import Image

OUT = Path('media/arcade-v43')


def quantiles(profile, fractions):
    sums = list(itertools.accumulate(profile))
    total = sums[-1]
    if not total:
        return None
    return [(bisect_left(sums, total * p) + .5) for p in fractions]


def body_sample(name, entry):
    with Image.open(OUT / name) as image:
        alpha = image.convert('RGBA').getchannel('A')
        width, height = entry.get('cell', alpha.size)
        # Alpha above 64 excludes faint pen strokes and cast shadows.
        mask = alpha.point(lambda a: 255 if a > 64 else 0)
        samples = []
        for frame in range(entry.get('frames', 1)):
            cell = mask.crop((width * frame, 0, width * (frame + 1), height))
            px = cell.resize((width, 1), Image.Resampling.BOX)
            py = cell.resize((1, height), Image.Resampling.BOX)
            x = quantiles(px.tobytes(), [.5])
            y = quantiles(py.tobytes(), [.15, .5, .85])
            if x and y:
                samples.append(((y[2] - y[0]) / height, (x[0] - width / 2) / height,
                                (y[1] - height / 2) / height))
                if name.endswith('@death.webp'):
                    break  # Register the standing pose; later frames may be mostly ash.
    return tuple(map(median, zip(*samples))) if samples else None


def update_framing(manifest, keys=None):
    keys = keys or [name[:-5] for name, e in manifest.items()
                    if e['group'] in ('actors', 'mobs') and '@' not in name]
    for key in keys:
        name = key + '.webp'
        base = manifest[name]
        # Preserve intentional proportions. Only wide poses that would spill into other
        # enemies reduce the whole family's size; the cap never changes between frames.
        width, height = base.get('cell', base['size'])
        span = width / height
        motions = base.get('motions', [])
        idle = body_sample(name, base) if motions else None
        for motion in motions:
            sheet = key + '@' + motion + '.webp'
            entry = manifest.get(sheet)
            if not entry:
                continue
            sample = body_sample(sheet, entry)
            if not idle or not sample or not sample[0]:
                continue
            # Limit compensation so a deliberately crouching or leaning pose still reads.
            scale = max(.85, min(1.18, idle[0] / sample[0]))
            dx = max(-.15, min(.15, idle[1] - scale * sample[1]))
            dy = max(-.15, min(.15, idle[2] - scale * sample[2]))
            fit = [round(v, 3) for v in (scale, dx, dy)]
            entry['poseFit'] = fit
            if motion != 'death':
                w, h = entry.get('cell', entry['size'])
                span = max(span, w / h * fit[0] + 2 * abs(fit[1]))
        cap = 1.45 if base['group'] == 'mobs' else 1.65
        if span > cap:
            base['fieldScale'] = round(cap / span, 3)
        else:
            base.pop('fieldScale', None)


if __name__ == '__main__':
    path = OUT / 'manifest.json'
    data = json.loads(path.read_text())
    update_framing(data)
    path.write_text(json.dumps(data, indent=1, ensure_ascii=False, sort_keys=True))
