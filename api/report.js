// GET /api/report?date=YYYY-MM-DD&days=6&org=월평2동
//   → 그날짜 동향보고 HTML 한 장을 그대로 반환한다.

const { collect, todayKST, ymdToDate, kdate, shortDate, esc } = require("./_shared");
const { isRelevant, matchTier, reason } = require("./_org");
const { STYLE } = require("./_style");

const EDIT = '<span contenteditable="true" style="color:var(--warn)">□ 확인</span>';
const RN = ["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ", "Ⅵ", "Ⅶ", "Ⅷ"];

function row(it) {
  const tag = it.tags.length ? ' <small>[' + it.tags.join("·") + "]</small>" : "";
  // 제목이 곧 원문 링크다. 제목만 보고 다시 게시판을 뒤지게 만들면 일을 두 번 시키는 셈이다.
  const t = it.link
    ? '<a href="' + esc(it.link) + '" target="_blank" rel="noopener">' + esc(it.title) + "</a>"
    : esc(it.title);
  const file = it.board === "주간행사계획" ? ' <small>(첨부파일 내려받기)</small>' : "";
  return (
    '<td class="c">' + shortDate(ymdToDate(it.date)) + "</td>" +
    '<td class="c">' + esc(it.dept || it.board) + "</td>" +
    "<td>" + t + file + tag + "</td>"
  );
}

function buildBody(data, org) {
  const base = ymdToDate(data.baseDate);
  const since = ymdToDate(data.since);
  const news = data.items.filter((i) => i.board !== "주간행사계획");
  const plan = data.items.filter((i) => i.board === "주간행사계획");
  // 1등급 = 1:1로 맞는 우리 건, 2등급 = 지역명만 겹치는 건. 섹션을 나눠 싣는다.
  const direct = org ? news.filter(function (i) { return matchTier(i, org) === 1; }) : [];
  const loose = org ? news.filter(function (i) { return matchTier(i, org) === 2; }) : [];
  const p = [];
  let n = 1;

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
    const mark = org && isRelevant(it, org)
      ? '<td class="c ing">해당</td>'
      : '<td class="c">' + EDIT + "</td>";
    p.push("<tr>" + row(it) + mark + "</tr>");
  });
  p.push("</tbody></table>");
  p.push('<div class="note">※ 제목을 누르면 서구청 원문으로 갑니다. 「게시 부서」는 게시 주체, 대괄호는 제목 기준 자동 분류입니다. 날짜는 가까운 날부터 먼 날 순입니다.</div>');

  // 구 주간행사계획
  if (plan.length) {
    p.push("<h2>" + RN[n++] + ". 구 주간행사계획</h2>");
    p.push('<table class="t"><tbody>');
    plan.forEach((it) => {
      const a = it.link ? '<a href="' + esc(it.link) + '" target="_blank" rel="noopener">' + esc(it.title) + "</a>" : esc(it.title);
      p.push('<tr><td class="c" style="width:13%">' + it.date + "</td><td>" + a + ' <small>(첨부파일 내려받기)</small></td></tr>');
    });
    p.push("</tbody></table>");
    p.push('<div class="note">※ 제목을 누르면 한글 파일이 바로 내려받아집니다. 파일 안의 일정은 자동으로 읽지 못하니 열어서 확인하세요.</div>');
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
  let days = parseInt(url.searchParams.get("days") || "6", 10);
  if (!(days >= 0)) days = 6;
  days = Math.min(days, 30);
  const org = (url.searchParams.get("org") || "").trim().slice(0, 20);

  let data;
  try {
    data = await collect(date, days);
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
    " &nbsp;|&nbsp; 수집기간 : " + esc(kdate(since)) + " ~ " + esc(kdate(base)) +
    " &nbsp;|&nbsp; 보고일 : " + esc(kdate(base)) + "</div>\n" +
    '  <hr class="rule">\n  ' + buildBody(data, org) + "\n</div>\n</body>\n</html>";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=3600");
  res.end(html);
};
