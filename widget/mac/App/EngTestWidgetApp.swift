// 위젯을 담는 작은 앱: 연결 코드 확인 + 위젯 추가 방법 안내 (코드는 위젯 '편집'에 넣음)
import SwiftUI
import WidgetKit

@main
struct EngTestWidgetApp: App {
    var body: some Scene {
        WindowGroup("영어 채점 위젯") { ContentView().frame(width: 460) }
            .windowResizability(.contentSize)
    }
}

struct ContentView: View {
    @State private var code = ""
    @State private var result: String?
    @State private var ok = false
    @State private var busy = false
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("영어 채점 위젯", systemImage: "checklist").font(.title2.bold())
            Text("채점 대기·AI 제안·피드백 미공개·오늘 제출 건수를 바탕화면 위젯으로 보여 줘요. 학생 이름은 보이지 않아요.")
                .foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            GroupBox("1. 연결 코드 확인 (선택)") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("교사 화면 오른쪽 위 '위젯' → '연결 코드 만들기'에서 받은 코드를 붙여 넣고 확인해 보세요.").font(.callout).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                    HStack {
                        TextField("ew1.…", text: $code).textFieldStyle(.roundedBorder).font(.system(.body, design: .monospaced))
                        Button(busy ? "확인 중…" : "확인") { Task { await check() } }.disabled(busy || cleanCode(code).isEmpty)
                    }
                    if let r = result { Text(r).font(.callout).foregroundStyle(ok ? .green : .red).fixedSize(horizontal: false, vertical: true) }
                }.padding(4)
            }
            GroupBox("2. 위젯 추가") {
                VStack(alignment: .leading, spacing: 4) {
                    Text("① 바탕화면을 오른쪽 클릭 → '위젯 편집…'")
                    Text("② '영어 채점'을 찾아 작게·중간·크게 중 하나를 끌어다 놓기")
                    Text("③ 놓은 위젯을 오른쪽 클릭 → '위젯 편집' → 연결 코드 붙여 넣기")
                    Text("위젯은 약 15분마다 새로 고쳐져요. 누르면 교사 화면이 열려요.").foregroundStyle(.secondary).padding(.top, 4)
                }.font(.callout).frame(maxWidth: .infinity, alignment: .leading).padding(4)
            }
            HStack {
                Button("교사 화면 열기") { NSWorkspace.shared.open(TEACHER_URL) }
                Spacer()
                Button("위젯 지금 새로 고침") { WidgetCenter.shared.reloadAllTimelines() }
            }
        }.padding(20)
    }
    private func check() async {
        busy = true; defer { busy = false }
        do {
            let s = try await fetchSummary(code: code)
            let t = s.total
            ok = true
            result = "✓ 연결됐어요 (\(s.label ?? "")) — 채점 대기 \(t.wait), AI 제안 \(t.aiSuggest), 미공개 \(t.unpub), 오늘 제출 \(t.today)"
        } catch {
            ok = false; result = error.localizedDescription
        }
    }
}
