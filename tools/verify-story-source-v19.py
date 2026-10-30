"""Independent retained Git-source/runtime hash and image conversion check.

Reads an existing authorized read-only hapil1 clone. No network/auth/config or
source repository writes. This environment-specific audit is not a portable
Node unit test and does not certify browser/GPU/mobile rendering.
"""
from pathlib import Path
import argparse, hashlib, io, json, subprocess
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--source-repo', type=Path, default=Path(__file__).resolve().parents[2] / 'assets-chapter3/hapil1-readonly')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'docs/V19-STORY-ASSET-PROVENANCE-20261030.json').read_text())
rows = []
sha = lambda b: hashlib.sha256(b).hexdigest()
blob = lambda b: hashlib.sha1(b'blob ' + str(len(b)).encode() + b'\0' + b).hexdigest()
for item in manifest['runtimeFiles']:
    source_blob = subprocess.check_output(['git', '-C', str(args.source_repo), 'rev-parse', item['sourceCommit'] + ':' + item['sourcePath']], text=True).strip()
    assert source_blob == item['sourceGitBlob'], item['key'] + ': source path/commit mismatch'
    source = subprocess.check_output(['git', '-C', str(args.source_repo), 'cat-file', 'blob', source_blob])
    runtime = (root / item['path']).read_bytes()
    assert sha(source) == item['sourceSHA256'], item['key'] + ': original SHA mismatch'
    assert sha(runtime) == item['sha256'] and len(runtime) == item['bytes'], item['key'] + ': runtime SHA/size mismatch'
    assert blob(source) == source_blob and blob(runtime) == item['runtimeGitBlob']
    src = Image.open(io.BytesIO(source)).convert('RGBA')
    out = Image.open(io.BytesIO(runtime)).convert('RGBA')
    assert out.size == (item['width'], item['height'])
    transform = item['transformation']
    if transform == 'byte-preserving copy':
        assert source == runtime, item['key'] + ': claimed copy differs'
        verification = 'source bytes equal runtime bytes'
    elif 'pixel-preserving' in transform.lower() or src.size == out.size:
        assert src.tobytes() == out.tobytes(), item['key'] + ': claimed pixel-preserving conversion differs'
        verification = 'decoded RGBA pixels equal original source'
    else:
        expected = src.resize(out.size, Image.Resampling.LANCZOS)
        # Lossless WebP is allowed to discard invisible RGB in alpha-zero
        # pixels. Compare actual displayed premultiplied RGBA plus alpha.
        a, b = expected.tobytes(), out.tobytes()
        max_error = 0
        for i in range(0, len(a), 4):
            assert a[i+3] == b[i+3], item['key'] + ': resize alpha differs'
            for c in range(3):
                error = abs(a[i+c] * a[i+3] - b[i+c] * b[i+3])
                max_error = max(max_error, error)
        assert max_error == 0, item['key'] + ': visible Lanczos resized source pixels differ'
        verification = 'Lanczos resize matches every displayed premultiplied RGBA pixel'
    rows.append({'key': item['key'], 'runtimePath': item['path'], 'sourcePath': item['sourcePath'], 'sourceSHA256': sha(source), 'runtimeSHA256': sha(runtime), 'dimensions': out.size, 'verification': verification})
result = {'scope': 'Read-only Git source objects and Pillow decoded runtime images. Actual source commit/path/blob/SHA checks, exact copy or documented visible-pixel conversions. No network/security/config changes; not browser/GPU/mobile/natural-play validation.', 'sourceCommit': manifest['sourceCommit'], 'files': len(rows), 'exactCopies': sum(r['verification'] == 'source bytes equal runtime bytes' for r in rows), 'rows': rows}
output = root / 'docs/V19-INDEPENDENT-SOURCE-VERIFY-20261030.json'
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'files': len(rows), 'exactCopies': result['exactCopies'], 'report': str(output)}))
