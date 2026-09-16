// GET /api/report?date=YYYY-MM-DD&days=6&org=월평2동
//   → 그날짜 동향보고 HTML 한 장을 그대로 반환한다.

const { collect, todayKST, ymdToDate, kdate, shortDate, esc } = require("./_shared");
const { isRelevant, matchTier, reason } = require("./_org");
const { STYLE } = require("./_style");

const EDIT = '<span contenteditable="true" style="color:var(--warn)">□ 확인</span>';
const RN = ["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ"];

// linked=false 면 제목만 싣는다. 이미 지난 일은 원문을 열 일이 드물어
// 링크가 줄줄이 붙으면 정작 눌러야 할 앞으로의 건이 묻힌다.
function row(it, linked) {
  const tag = it.tags.length ? ' <small>[' + it.tags.join("·") + "]</small>" : "";
  const t = (linked !== false && it.link)
    ? '<a href="' + esc(it.link) + '" target="_blank" rel="noopener">' + esc(it.title) + "</a>"
    : esc(it.title);
  const file = it.board === "주간행사계획" ? ' <small>(첨부파일 내려받기)</small>' : "";
  return (
    '<td class="c d">' + shortDate(ymdToDate(it.date)) + "</td>" +
    '<td class="c">' + esc(it.dept || it.board) + "</td>" +
    "<td>" + t + file + tag + "</td>"
  );
}

function buildBody(data, org) {
  const base = ymdToDate(data.baseDate);
  const since = ymdToDate(data.since);
  // posted = 수집 기간 안에 올라온 것. 아직 안 끝나서 딸려 온 옛 공고는
  // 「앞으로 챙길 일」에만 싣고 지난 동향 목록에는 넣지 않는다.
  const news = data.items.filter((i) => i.board !== "주간행사계획" && i.posted !== false);
  // 주간행사계획은 지난 주·이번 주·다음 주가 모두 쓸모 있으므로 posted 로 거르지 않는다.
  const plan = data.items.filter((i) => i.board === "주간행사계획");
  // 1등급 = 1:1로 맞는 우리 건, 2등급 = 지역명만 겹치는 건. 섹션을 나눠 싣는다.
  const direct = org ? news.filter(function (i) { return matchTier(i, org) === 1; }) : [];
  const loose = org ? news.filter(function (i) { return matchTier(i, org) === 2; }) : [];
  const p = [];
  let n = 1;

  // 앞으로 챙길 일 — 공고가 아직 살아 있는 것을 마감 가까운 순으로.
  // 아침에 보는 문서라면 일주일 지난 소식보다 이게 먼저다.
  const ahead = data.items
    .filter(function (i) { return i.endsAt && i.endsAt >= data.baseDate; })
    .sort(function (a, b) { return a.endsAt.localeCompare(b.endsAt); });

  if (ahead.length) {
    p.push("<h2>" + RN[n++] + '. 앞으로 챙길 일 <span class="en">(' +
      ahead.length + "건 · 마감 가까운 순)</span></h2>");
    p.push('<table class="t"><thead><tr><th style="width:13%">마감</th>' +
      '<th style="width:13%">게시 부서</th><th>내 용</th>' +
      '<th style="width:12%">' + (org ? "우리 관련" : "구 분") + "</th></tr></thead><tbody>");
    ahead.forEach(function (it) {
      const d = ymdToDate(it.endsAt);
      const left = Math.round((d - ymdToDate(data.baseDate)) / 86400000);
      const dd = left === 0 ? "오늘" : "D-" + left;
      const cls = left <= 3 ? "ing" : left <= 7 ? "" : "wait";
      const t = org ? matchTier(it, org) : 0;
      const mark = t === 1 ? '<td class="c ing">해당</td>'
        : t === 2 ? '<td class="c wait">인근</td>'
        : '<td class="c">' + esc(it.board) + "</td>";
      p.push('<tr><td class="c d"><b class="' + cls + '">' + dd + "</b><br>" +
        '<small>' + shortDate(d) + "</small></td>" +
        '<td class="c">' + esc(it.dept || it.board) + "</td>" +
        "<td>" + (it.link
          ? '<a href="' + esc(it.link) + '" target="_blank" rel="noopener">' + esc(it.title) + "</a>"
          : esc(it.title)) + "</td>" + mark + "</tr>");
    });
    p.push("</tbody></table>");
    p.push('<div class="note">※ 공고에 적힌 게재 종료일 기준입니다. ' +
      "접수·신청 마감일과 다를 수 있으니 원문을 확인하세요.</div>");
  }

  // 채워 넣을 자리(총괄 요약·주민생활·지역 현안·조치사항)는 두지 않는다.
  // 자동으로 채울 수 없는 칸이라 어느 부서로 열어도 늘 비어 있었고,
  // 빈 표가 앞뒤로 붙으면 정작 내용이 있는 표를 안 보게 된다.
  // 이 문서는 "모아 온 것"만 싣고, 판단은 사람이 따로 쓴다.

  // 우리 소속 사항 — 1:1로 맞는 건만. 맨 앞에 두어야 파악이 빠르다.
  if (org) {
    p.push("<h2>" + RN[n++] + ". " + esc(org) + ' 사항 <span class="en">(' + direct.length + "건 · 먼저 확인)</span></h2>");
    p.push('<table class="t"><thead><tr><th style="width:11%">일 자</th><th style="width:13%">게시 부서</th><th>내 용</th><th style="width:13%">걸린 사유</th></tr></thead><tbody>');
    if (!direct.length) {
      p.push('<tr><td colspan="4" class="c wait">해당 없음 — 수집 기간 중 ' + esc(org) + " 건 없음</td></tr>");
    } else {
      direct.forEach(function (it) {
        p.push("<tr>" + row(it) + '<td class="c ing">' + esc(reason(it, org)) + "</td></tr>");
      });
    }
    p.push("</tbody></table>");
  }

  // 인근·유사 이름 — 우리 건은 아니지만 지역이 겹쳐 참고할 것. 있을 때만 만든다.
  if (loose.length) {
    p.push("<h2>" + RN[n++] + '. 인근 · 유사 명칭 참고 사항 <span class="en">(' + loose.length + "건 · " + esc(org) + " 건 아님)</span></h2>");
    p.push('<table class="t"><thead><tr><th style="width:11%">일 자</th><th style="width:13%">게시 부서</th><th>내 용</th><th style="width:13%">겹치는 부분</th></tr></thead><tbody>');
    loose.forEach(function (it) {
      p.push("<tr>" + row(it) + '<td class="c wait">' + esc(reason(it, org)) + "</td></tr>");
    });
    p.push("</tbody></table>");
    p.push('<div class="note">※ 지역명이 겹쳐 딸려 온 항목입니다. ' + esc(org) +
      " 소관이 아니므로 참고만 하십시오.</div>");
  }

  // 구정 주요 동향 (전체, 최신순)
  p.push("<h2>" + RN[n++] + '. 구정 주요 동향 <span class="en">(' + kdate(since) + " ~ " + kdate(base) + " · 최신순 " + news.length + "건)</span></h2>");
  p.push('<table class="t"><thead><tr><th style="width:11%">일 자</th><th style="width:13%">게시 부서</th><th>내 용</th><th style="width:13%">' + (org ? "우리 관련" : "소관 여부") + "</th></tr></thead><tbody>");
  if (!news.length) p.push('<tr><td colspan="4" class="c">수집 기간 중 신규 게시물 없음</td></tr>');
  news.forEach((it) => {
    // 전체 목록에서도 Ⅰ·Ⅱ와 같은 기준으로 표시한다.
    // 지역명만 겹치는 건을 '해당'이라 하면 우리 일인 줄 알고 챙기게 된다.
    const t = org ? matchTier(it, org) : 0;
    const mark = t === 1 ? '<td class="c ing">해당</td>'
      : t === 2 ? '<td class="c wait">인근</td>'
      : '<td class="c">' + EDIT + "</td>";
    p.push("<tr>" + row(it, false) + mark + "</tr>");
  });
  p.push("</tbody></table>");
  p.push('<div class="note">※ 이미 지난 건이라 제목만 싣습니다. 원문이 필요하면 위 「앞으로 챙길 일」에서 누르시거나 구 홈페이지에서 찾으세요. 날짜는 가까운 날부터 먼 날 순입니다.</div>');

  // 구 주간행사계획 — 지난 주와 앞으로의 주가 섞여 나오므로 어느 주인지 밝히고,
  // 내용이 파일 안에 있으니 내려받기 단추를 눈에 띄게 둔다.
  if (plan.length) {
    p.push("<h2>" + RN[n++] + '. 구 주간행사계획 <span class="en">(' + plan.length + "건)</span></h2>");
    p.push('<table class="t"><thead><tr><th style="width:24%">주 간</th>' +
      '<th style="width:12%">구 분</th><th>내려받기</th></tr></thead><tbody>');
    plan
      .slice()
      .sort(function (a, b) { return (b.span ? b.span[0] : b.date).localeCompare(a.span ? a.span[0] : a.date); })
      .forEach(function (it) {
        const s0 = it.span ? it.span[0] : it.date;
        const s1 = it.span ? it.span[1] : it.date;
        const when = s0 > data.baseDate ? ["앞으로", "ing"]
          : s1 < data.baseDate ? ["지난 주", "wait"]
          : ["이번 주", "ing"];
        const span = it.span
          ? shortDate(ymdToDate(s0)) + " ~ " + shortDate(ymdToDate(s1))
          : shortDate(ymdToDate(it.date));
        p.push('<tr><td class="c d">' + span + "</td>" +
          '<td class="c ' + when[1] + '">' + when[0] + "</td><td>" +
          (it.link
            ? '<a href="' + esc(it.link) + '" target="_blank" rel="noopener"><b>한글 파일 내려받기</b></a>' +
              ' <small>' + esc(it.title) + "</small>"
            : esc(it.title)) + "</td></tr>");
      });
    p.push("</tbody></table>");
    p.push('<div class="note">※ 행사 일정은 첨부파일 안에 있습니다. 내려받아 열어 보셔야 합니다.</div>');
  }

  if (data.failed.length) {
    p.push('<div class="note warn"><b>※ 수집 실패 게시판:</b> ' + esc(data.failed.join(", ")) +
      " — 해당 게시판 내용이 빠져 있습니다. 구 홈페이지에서 직접 확인하세요.</div>");
  }
  p.push('<div class="note warn"><b>※ 서구청 게시판에서 기계적으로 모아 온 목록입니다.</b> ' +
    '제목·날짜·게시부서까지만 옮겼을 뿐, 무엇이 왜 중요한지는 담겨 있지 않습니다. ' +
    '보고용으로 쓰시려면 이 목록을 근거로 판단을 더하시고, 소관 부서에 사실관계를 확인하십시오.</div>');

  return p.join("\n  ");
}

module.exports = async (req, res) => {
  const url = new URL(req.url, "http://x");
  const q = url.searchParams.get("date");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q || "") ? q : todayKST();
  let back = parseInt(url.searchParams.get("back") || "3", 10);
  let ahead = parseInt(url.searchParams.get("ahead") || "7", 10);
  if (!(back >= 0)) back = 3;
  if (!(ahead >= 0)) ahead = 7;
  back = Math.min(back, 30);
  ahead = Math.min(ahead, 60);
  const org = (url.searchParams.get("org") || "").trim().slice(0, 20);

  let data;
  try {
    data = await collect(date, back, ahead);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("수집에 실패했습니다: " + ((e && e.message) || e));
    return;
  }

  const base = ymdToDate(data.baseDate);
  const since = ymdToDate(data.since);
  const head = org ? esc(org) + " 동향보고" : "대전 서구 동향보고";
  const title = base.getUTCFullYear() + ". " + (base.getUTCMonth() + 1) + ". " + base.getUTCDate() +
    ". " + (org ? org + " " : "") + "동향보고";

  const html =
    '<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    "<title>" + esc(title) + "</title>\n" +
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css">\n' +
    "<style>" + STYLE + "</style>\n</head>\n<body>\n" +
    '<div class="toolbar">\n  <span class="ttl">' + esc(kdate(base)) +
    (org ? " · " + esc(org) : "") + ' 동향보고 〈서구청 게시판 수집분〉</span>\n' +
    '  <a href="/">← 처음으로</a>\n' +
    '  <button onclick="window.print()">인쇄 / PDF 저장</button>\n</div>\n' +
    '<div class="page">\n  <h1 class="doc-title">' + head + "</h1>\n" +
    '  <div class="doc-sub">기준일 : ' + esc(kdate(base)) +
    " &nbsp;|&nbsp; 보는 기간 : " + esc(kdate(since)) + " ~ " + esc(kdate(ymdToDate(data.aheadUntil))) +
    " (지난 " + data.back + "일 + 앞으로 " + data.ahead + "일)" +
    " &nbsp;|&nbsp; 보고일 : " + esc(kdate(base)) + "</div>\n" +
    '  <hr class="rule">\n  ' + buildBody(data, org) + "\n</div>\n</body>\n</html>";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
  res.end(html);
};
