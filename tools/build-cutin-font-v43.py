#!/usr/bin/env python3
"""기억사수 필살 컷인·성장 글자용 명조 글꼴 조각(woff2)을 만든다.
헤드리스·아이폰처럼 한글 명조가 없는 기기에서 컷인 제목이 고딕으로 떨어지던 문제(11-16 실검증) 해결용.
원본: Noto Serif KR Bold (SIL OFL 1.1, notofonts/noto-cjk Serif/SubsetOTF/KR). 사용:
  python3 tools/build-cutin-font-v43.py <NotoSerifKR-Bold.otf>
src/hero-memory-v43.js 와 src/arcade-v43.js 의 BOMB_NAMES 에서 쓰는 글자만 뽑아 media/fonts/hapil-serif-v43.woff2 로 굽는다."""
import re, sys, pathlib
from fontTools import subset
from fontTools.ttLib import TTFont
root = pathlib.Path(__file__).resolve().parent.parent
code = re.sub(r'/\*.*?\*/|//[^\n]*', '', (root/'src/hero-memory-v43.js').read_text(encoding='utf8'), flags=re.S)
text = ''.join(re.findall(r"'([^'\n]*)'", code))  # 주석 빼고 문자열 글자만
m = re.search(r"BOMB_NAMES=\[(.*?)\]", (root/'src/arcade-v43.js').read_text(encoding='utf8'))
text += m.group(1) if m else ''
chars = {c for c in text if '가' <= c <= '힣' or '一' <= c <= '鿿'}
chars |= set('0123456789 .·Lv-「」')
src = sys.argv[1]
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
font = TTFont(src); s = subset.Subsetter(opts); s.populate(text=''.join(sorted(chars))); s.subset(font)
out = root/'media/fonts/hapil-serif-v43.woff2'; out.parent.mkdir(parents=True, exist_ok=True)
font.flavor = 'woff2'; font.save(str(out))
print(len(chars), 'glyphs ->', out, out.stat().st_size, 'bytes')
