// 사이트 /api/w/summary 응답과 가져오기 — 앱과 위젯이 같이 씀
import Foundation

let SITE = URL(string: "https://eng-test.allforedu.kr")!
let TEACHER_URL = URL(string: "https://eng-test.allforedu.kr/teacher")!

struct Counts: Codable, Hashable {
    var wait = 0, aiSuggest = 0, unpub = 0, today = 0
}
struct ClassRow: Codable, Hashable, Identifiable {
    var class_no: Int, students: Int, wait: Int, aiSuggest: Int, unpub: Int, today: Int
    var id: Int { class_no }
}
struct GradeRow: Codable, Hashable, Identifiable {
    var grade: Int, classes: [ClassRow], total: Counts
    var id: Int { grade }
}
struct Summary: Codable, Hashable {
    var at: String, grades: [GradeRow], errors24h: Int?, label: String?
    var total: Counts {
        grades.reduce(into: Counts()) { a, g in a.wait += g.total.wait; a.aiSuggest += g.total.aiSuggest; a.unpub += g.total.unpub; a.today += g.total.today }
    }
    static let sample = Summary(at: ISO8601DateFormatter().string(from: Date()), grades: [
        GradeRow(grade: 3, classes: [ClassRow(class_no: 1, students: 22, wait: 3, aiSuggest: 1, unpub: 0, today: 12), ClassRow(class_no: 2, students: 21, wait: 0, aiSuggest: 0, unpub: 2, today: 5)], total: Counts(wait: 3, aiSuggest: 1, unpub: 2, today: 17)),
        GradeRow(grade: 4, classes: [ClassRow(class_no: 1, students: 24, wait: 5, aiSuggest: 2, unpub: 1, today: 20), ClassRow(class_no: 2, students: 23, wait: 1, aiSuggest: 0, unpub: 0, today: 8)], total: Counts(wait: 6, aiSuggest: 2, unpub: 1, today: 28)),
    ], errors24h: 0, label: "예시")
}

enum FetchError: LocalizedError {
    case noCode, badCode, server(String), network
    var errorDescription: String? {
        switch self {
        case .noCode: return "연결 코드를 넣어 주세요"
        case .badCode: return "연결 코드가 맞지 않거나 끊겼어요"
        case .server(let m): return m
        case .network: return "인터넷 연결을 확인해 주세요"
        }
    }
}

func cleanCode(_ s: String?) -> String { (s ?? "").trimmingCharacters(in: .whitespacesAndNewlines) }

func fetchSummary(code: String) async throws -> Summary {
    let c = cleanCode(code)
    guard !c.isEmpty else { throw FetchError.noCode }
    var req = URLRequest(url: SITE.appendingPathComponent("api/w/summary"), timeoutInterval: 20)
    req.setValue("Bearer " + c, forHTTPHeaderField: "Authorization")
    req.cachePolicy = .reloadIgnoringLocalCacheData
    let data: Data, resp: URLResponse
    do { (data, resp) = try await URLSession.shared.data(for: req) } catch { throw FetchError.network }
    let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
    if status == 401 { throw FetchError.badCode }
    guard status == 200 else {
        let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
        throw FetchError.server(msg ?? "사이트 응답이 올바르지 않아요 (\(status))")
    }
    return try JSONDecoder().decode(Summary.self, from: data)
}

func shortTime(_ iso: String) -> String {
    let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    let d = f.date(from: iso) ?? ISO8601DateFormatter().date(from: iso) ?? Date()
    let o = DateFormatter(); o.locale = Locale(identifier: "ko_KR"); o.dateFormat = "a h:mm"
    return o.string(from: d)
}
