#!/usr/bin/env python3
"""출판사 단원평가 압축 파일 풀기 (한글 파일 이름 cp949 처리, 안쪽 음원 zip까지).

사용: python3 -I unpack_zip.py <download.zip> <출력 폴더>
결과: 출력 폴더/
  exam.hwp        문제지
  answer.hwp      정답 및 듣기 대본 (있으면)
  audio/q01.mp3…  문항별 음원 (파일 이름 끝 '-01.mp3' 번호 기준)
  other/…         그 밖의 파일 (전체 음원 mp3 등)
  manifest.txt    원래 파일 이름 목록 → 학년('영어3'/'영어4')·단원 확인용
"""
import io, os, re, sys, zipfile

def name(info):
    try:
        return info.filename.encode('cp437').decode('cp949')
    except Exception:
        return info.filename

def main(src, out):
    os.makedirs(os.path.join(out, 'audio'), exist_ok=True)
    os.makedirs(os.path.join(out, 'other'), exist_ok=True)
    log = []
    def handle(n, data, depth=0):
        log.append('  ' * depth + n)
        low = n.lower()
        if low.endswith('.zip'):
            z = zipfile.ZipFile(io.BytesIO(data))
            for i in z.infolist():
                if not i.is_dir():
                    handle(name(i), z.read(i), depth + 1)
        elif low.endswith('.hwp') or low.endswith('.hwpx'):
            kind = 'answer' if '정답' in n or '대본' in n else 'exam'
            ext = os.path.splitext(low)[1]
            path = os.path.join(out, kind + ext)
            if os.path.exists(path):  # 같은 종류가 둘이면 덮어쓰지 않고 번호 붙임
                k = 2
                while os.path.exists(os.path.join(out, f'{kind}{k}{ext}')): k += 1
                path = os.path.join(out, f'{kind}{k}{ext}')
            open(path, 'wb').write(data)
        elif low.endswith('.mp3') and re.search(r'-(\d+)\.mp3$', low):
            q = int(re.search(r'-(\d+)\.mp3$', low).group(1))
            open(os.path.join(out, 'audio', f'q{q:02d}.mp3'), 'wb').write(data)
        else:
            safe = re.sub(r'[^\w.\-가-힣]', '_', os.path.basename(n))
            open(os.path.join(out, 'other', safe), 'wb').write(data)
    if src.lower().endswith('.zip'):
        z = zipfile.ZipFile(src)
        for i in z.infolist():
            if not i.is_dir():
                handle(name(i), z.read(i))
    else:
        handle(os.path.basename(src), open(src, 'rb').read())
    open(os.path.join(out, 'manifest.txt'), 'w').write('\n'.join(log) + '\n')
    print('\n'.join(log))
    print('audio files:', len(os.listdir(os.path.join(out, 'audio'))))

if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
