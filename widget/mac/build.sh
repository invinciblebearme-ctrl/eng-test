#!/bin/bash
# 맥 위젯 만들기 → widget/mac/build/EngTestWidget.app (Apple 개발자 계정 없이 이 맥에서만 쓰는 서명)
# 설치: ./build.sh install  (응용 프로그램 폴더로 복사하고 한 번 실행)
set -euo pipefail
cd "$(dirname "$0")"
command -v xcodegen >/dev/null || { echo "xcodegen이 필요해요: brew install xcodegen"; exit 1; }
xcodegen generate --quiet
xcodebuild -project EngTestWidget.xcodeproj -scheme EngTestWidget -configuration Release \
  -derivedDataPath build/dd CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=YES -quiet build
rm -rf build/app && mkdir -p build/app
cp -R "build/dd/Build/Products/Release/EngTestWidget.app" build/app/
echo "✅ build/app/EngTestWidget.app"
if [ "${1:-}" = "install" ]; then
  osascript -e 'quit app "EngTestWidget"' 2>/dev/null || true
  rm -rf "/Applications/EngTestWidget.app"
  cp -R "build/app/EngTestWidget.app" /Applications/
  open "/Applications/EngTestWidget.app"
  echo "✅ /Applications 에 설치하고 열었어요"
fi
