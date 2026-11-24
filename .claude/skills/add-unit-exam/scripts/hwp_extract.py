#!/usr/bin/env python3
"""한글(HWP 5) 문제지·정답에서 글자, 그림, '문항 순서대로 그림 위치'를 뽑기.

사용: python3 -I hwp_extract.py <file.hwp> <출력 폴더>
결과: 출력 폴더/
  text.txt   문단 글자 (그림 자리는 [obj])
  seq.txt    본문 순서대로 'T 글자' 와 '   P BIN000X.bmp crop(...)' — 어느 그림이 어느 문항·보기인지 보는 용도
  BIN000X.*  들어 있는 그림 원본
필요: pip install olefile
"""
import os, struct, sys, zlib
import olefile

def records(d):
    i = 0
    while i < len(d):
        h = struct.unpack_from('<I', d, i)[0]; tag = h & 0x3ff; size = (h >> 20) & 0xfff; i += 4
        if size == 0xfff:
            size = struct.unpack_from('<I', d, i)[0]; i += 4
        yield tag, d[i:i + size]; i += size

def para_text(rec, obj_mark):
    t, j = '', 0
    while j < len(rec):
        c = struct.unpack_from('<H', rec, j)[0]
        if c < 32 and c not in (10, 13, 24, 30, 31):   # 확장 제어문자(16바이트)
            t += obj_mark if c == 11 else ''; j += 16; continue
        t += '\n' if c == 10 else ('' if c == 13 else (' ' if c in (24, 30, 31) else chr(c))); j += 2
    return t

def main(src, out):
    os.makedirs(out, exist_ok=True)
    f = olefile.OleFileIO(src)
    comp = f.openstream('FileHeader').read()[36] & 1
    rd = lambda e: (zlib.decompress(f.openstream(e).read(), -15) if comp else f.openstream(e).read())
    # BinData 번호 → 파일 이름
    bins = []
    for tag, rec in records(rd('DocInfo')):
        if tag == 18 and (struct.unpack_from('<H', rec, 0)[0] & 0xf) in (1, 2):
            bid = struct.unpack_from('<H', rec, 2)[0]; ln = struct.unpack_from('<H', rec, 4)[0]
            bins.append(f'BIN{bid:04X}.{rec[6:6 + ln * 2].decode("utf-16le")}')
    text, seq = [], []
    for e in sorted([e for e in f.listdir() if e[0] == 'BodyText'], key=lambda e: int(e[1][7:])):
        for tag, rec in records(rd(e)):
            if tag == 67:
                text.append(para_text(rec, '[obj]'))
                t = para_text(rec, '#').strip()
                if t: seq.append('T ' + t)
            elif tag == 85:  # 그림
                crop = struct.unpack_from('<4i', rec, 44); bid = struct.unpack_from('<H', rec, 71)[0]
                seq.append(f'   P {bins[bid - 1] if 0 < bid <= len(bins) else bid} crop {crop}')
    open(os.path.join(out, 'text.txt'), 'w').write('\n'.join(text))
    open(os.path.join(out, 'seq.txt'), 'w').write('\n'.join(seq))
    for e in f.listdir():
        if e[0] == 'BinData':
            d = f.openstream(e).read()
            try: d = zlib.decompress(d, -15)
            except Exception: pass
            open(os.path.join(out, e[1]), 'wb').write(d)
    print(f'paragraphs {len(text)}, pictures {sum(1 for s in seq if s.startswith("   P"))}, bins {len(bins)} → {out}')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
