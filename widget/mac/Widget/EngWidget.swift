// 영어 채점 위젯: 연결 코드는 위젯 '편집'에서 넣음 (앱과 공유 저장소가 필요 없게)
import WidgetKit
import SwiftUI
import AppIntents

struct ConfigIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "영어 채점 위젯 설정"
    static var description = IntentDescription("교사 화면 '위젯' 버튼에서 만든 연결 코드를 붙여 넣어 주세요.")
    @Parameter(title: "연결 코드", default: "")
    var code: String
}

struct Entry: TimelineEntry {
    let date: Date
    let summary: Summary?
    let error: String?
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: .now, summary: .sample, error: nil) }
    func snapshot(for configuration: ConfigIntent, in context: Context) async -> Entry {
        if context.isPreview { return placeholder(in: context) }
        return await load(configuration)
    }
    func timeline(for configuration: ConfigIntent, in context: Context) async -> Timeline<Entry> {
        let e = await load(configuration)
        // 맥이 새로 고침 횟수를 정하므로 15분은 '최소'. 오류면 5분 뒤 다시
        let next = Calendar.current.date(byAdding: .minute, value: e.error == nil ? 15 : 5, to: .now)!
        return Timeline(entries: [e], policy: .after(next))
    }
    private func load(_ c: ConfigIntent) async -> Entry {
        do { return Entry(date: .now, summary: try await fetchSummary(code: c.code), error: nil) }
        catch { return Entry(date: .now, summary: nil, error: error.localizedDescription) }
    }
}

// ---------- 화면 ----------
struct Stat: View {
    let label: String, value: Int, strong: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("\(value)").font(.system(size: strong ? 30 : 17, weight: .bold, design: .rounded))
                .foregroundStyle(value > 0 && strong ? Color.orange : Color.primary)
                .contentTransition(.numericText())
            Text(label).font(.system(size: 10)).foregroundStyle(.secondary).lineLimit(1)
        }
    }
}

struct Header: View {
    let s: Summary?
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "checklist").font(.system(size: 11, weight: .semibold))
            Text("영어 채점").font(.system(size: 12, weight: .semibold))
            Spacer(minLength: 0)
            if let e = s?.errors24h, e > 0 { Label("\(e)", systemImage: "exclamationmark.triangle.fill").font(.system(size: 10)).foregroundStyle(.red).labelStyle(.titleAndIcon) }
            if let s { Text(shortTime(s.at)).font(.system(size: 10)).foregroundStyle(.secondary) }
        }
    }
}

struct ErrorView: View {
    let msg: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Header(s: nil)
            Spacer(minLength: 0)
            Text(msg).font(.system(size: 12, weight: .semibold))
            Text("위젯을 오른쪽 클릭 → '위젯 편집'에서 연결 코드를 넣어 주세요.").font(.system(size: 10)).foregroundStyle(.secondary)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct SmallView: View {
    let s: Summary
    var body: some View {
        let t = s.total
        VStack(alignment: .leading, spacing: 6) {
            Header(s: s)
            Spacer(minLength: 0)
            Stat(label: "채점 대기", value: t.wait, strong: true)
            HStack(spacing: 10) {
                Stat(label: "AI 제안", value: t.aiSuggest, strong: false)
                Stat(label: "미공개", value: t.unpub, strong: false)
                Stat(label: "오늘 제출", value: t.today, strong: false)
            }
        }
    }
}

struct GradeBox: View {
    let g: GradeRow
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("\(g.grade)학년").font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary)
            Stat(label: "채점 대기", value: g.total.wait, strong: true)
            HStack(spacing: 8) {
                Stat(label: "AI 제안", value: g.total.aiSuggest, strong: false)
                Stat(label: "미공개", value: g.total.unpub, strong: false)
                Stat(label: "오늘", value: g.total.today, strong: false)
            }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct MediumView: View {
    let s: Summary
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Header(s: s)
            Spacer(minLength: 0)
            HStack(alignment: .top, spacing: 12) {
                ForEach(s.grades) { g in GradeBox(g: g) }
            }
        }
    }
}

struct LargeView: View {
    let s: Summary
    func cell(_ v: Int, _ hi: Bool = false) -> some View {
        Text(v == 0 ? "·" : "\(v)").font(.system(size: 13, weight: v > 0 ? .bold : .regular, design: .rounded))
            .foregroundStyle(v > 0 && hi ? Color.orange : v > 0 ? Color.primary : Color.secondary)
            .frame(width: 46, alignment: .trailing)
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Header(s: s)
            HStack {
                Text("반").frame(maxWidth: .infinity, alignment: .leading)
                ForEach(["대기", "AI", "미공개", "오늘"], id: \.self) { Text($0).frame(width: 46, alignment: .trailing) }
            }.font(.system(size: 10)).foregroundStyle(.secondary)
            ForEach(s.grades) { g in
                ForEach(g.classes) { c in
                    HStack {
                        Text("\(g.grade)-\(c.class_no)").font(.system(size: 13, weight: .medium)).frame(maxWidth: .infinity, alignment: .leading)
                        cell(c.wait, true); cell(c.aiSuggest); cell(c.unpub); cell(c.today)
                    }
                }
                if g.id != s.grades.last?.id { Divider() }
            }
            Spacer(minLength: 0)
            if let e = s.errors24h { Text(e > 0 ? "최근 24시간 오류 \(e)건 — 교사 화면에서 확인해 주세요" : "최근 24시간 오류 없음").font(.system(size: 10)).foregroundStyle(e > 0 ? .red : .secondary) }
        }
    }
}

struct EngWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: Entry
    var body: some View {
        Group {
            if let s = entry.summary {
                switch family {
                case .systemSmall: SmallView(s: s)
                case .systemLarge, .systemExtraLarge: LargeView(s: s)
                default: MediumView(s: s)
                }
            } else { ErrorView(msg: entry.error ?? "불러오는 중…") }
        }
        .containerBackground(.fill.tertiary, for: .widget)
        .widgetURL(TEACHER_URL)
    }
}

struct EngWidget: Widget {
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: "EngTestWidget", intent: ConfigIntent.self, provider: Provider()) { EngWidgetView(entry: $0) }
            .configurationDisplayName("영어 채점")
            .description("채점 대기·AI 제안·피드백 미공개·오늘 제출 건수 (학생 이름 없음)")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct EngWidgetBundle: WidgetBundle {
    var body: some Widget { EngWidget() }
}
