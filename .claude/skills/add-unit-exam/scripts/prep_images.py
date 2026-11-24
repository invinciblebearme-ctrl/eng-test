#!/usr/bin/env python3
"""HWP에서 뽑은 그림(BMP/PNG)을 웹용 JPG로 바꾸고, 확인용 한 장짜리 모음 그림을 만들기.

사용: python3 -I prep_images.py <그림 폴더> <출력 폴더> [건너뛸 BIN 이름…]
  - 투명 배경은 흰색으로, 긴 변 640px로 줄임
  - 문제지 머리 띠(가로로 아주 긴 그림, 보통 2480x479)는 자동으로 건너뜀
  - 출력 폴더/contact.png : 모든 그림을 이름과 함께 한 장에 → Read 도구로 보고 정답과 맞는지 확인
필요: pip install pillow
"""
import glob, os, sys
from PIL import Image, ImageDraw

def main(src, out, skip):
    os.makedirs(out, exist_ok=True)
    thumbs = []
    for f in sorted(glob.glob(os.path.join(src, 'BIN*'))):
        n = os.path.splitext(os.path.basename(f))[0]
        im = Image.open(f)
        if n in skip or (im.width > 4 * im.height and im.width > 1500):
            print('skip', n, im.size); continue
        if im.mode in ('RGBA', 'LA', 'P'):
            im = im.convert('RGBA'); bg = Image.new('RGB', im.size, 'white'); bg.paste(im, mask=im.split()[3]); im = bg
        else:
            im = im.convert('RGB')
        im.thumbnail((640, 640)); im.save(os.path.join(out, n + '.jpg'), quality=82)
        t = im.copy(); t.thumbnail((300, 230)); thumbs.append((n, t))
    W, x, y, rowh, pos = 1300, 0, 0, 0, []
    for n, t in thumbs:
        if x + t.width > W: x, y, rowh = 0, y + rowh + 26, 0
        pos.append((x, y)); x += t.width + 16; rowh = max(rowh, t.height)
    can = Image.new('RGB', (W, y + rowh + 26), 'white'); dr = ImageDraw.Draw(can)
    for (n, t), p in zip(thumbs, pos):
        can.paste(t, p); dr.text((p[0], p[1] + t.height + 2), n, fill='red')
    can.save(os.path.join(out, 'contact.png'))
    print(f'{len(thumbs)} images → {out} (contact.png)')

if __name__ == '__main__':
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], set(sys.argv[3:]))
