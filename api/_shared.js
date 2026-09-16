// 서구청 게시판 수집 + 보고서 HTML 생성 공통 모듈.
// collect.py 와 같은 규칙을 쓴다. 한쪽을 고치면 다른 쪽도 맞춰야 한다.

const BASE = "https://www.seogu.go.kr";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const WEEKDAYS = "월화수목금토일";

// [이름, 목록경로, 상세링크를 만드는 방식]
//   bbs   : 행의 onclick 에 든 nttId 로 view.do?nttId=
//   gosi  : td[data-key-no] 값으로 view.do?notAncmtMgtNo=
//   file  : 첨부파일 직행 링크(주간행사계획은 내용이 파일 안에 있다)
const BOARDS = [
  ["언론보도", "/bbs/BBSMSTR_000000000277/list.do", "bbs"],
  ["공지사항", "/bbs/BBSMSTR_000000000275/list.do", "bbs"],
  ["고시공고", "/prog/saeolGosi/GOSI/kor/sub04_02_01/list.do", "gosi"],
  ["채용공고", "/prog/saeolGosi/05/kor/sub04_02_05/list.do", "gosi"],
  ["주간행사계획", "/bbs/BBSMSTR_000000000278/list.do", "file"],
];

// 제목에 이 말이 들어가면 동 단위에서 챙길 가능성이 높아 표시해 둔다.
const FLAGS = [
  ["주민총회", "주민자치"], ["주민자치", "주민자치"],
  ["행정복지센터", "동 관련"], ["동 청사", "동 관련"],
  ["추석", "명절"], ["연휴", "명절"], ["설날", "명절"],
  ["폐기물", "청소"], ["자원순환", "청소"], ["재활용", "청소"],
  ["모집", "접수"], ["신청", "접수"], ["접수", "접수"], ["열람", "접수"],
  ["납부", "세무"], ["재산세", "세무"], ["공시지가", "세무"],
  ["안전", "안전"], ["점검", "안전"], ["공사", "안전"],
  ["복지", "복지"], ["위문", "복지"], ["지원금", "복지"], ["급여", "복지"],
];

/** 서울 기준 오늘 (Vercel은 UTC로 도니 직접 보정한다) */
function todayKST() {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

function ymdToDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function kdate(d) {
  return `${d.getUTCFullYear()}. ${d.getUTCMonth() + 1}. ${d.getUTCDate()}.(${WEEKDAYS[(d.getUTCDay() + 6) % 7]})`;
}

function shortDate(d) {
  return `${d.getUTCMonth() + 1}. ${d.getUTCDate()}.(${WEEKDAYS[(d.getUTCDay() + 6) % 7]})`;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}

/**
 * 한 번에 두 개까지만 요청한다.
 * 구청 서버가 동시 접속 3개 이상을 끊어 버린다 — 5개를 한꺼번에 보내면
 * 두 개가 10초쯤 매달렸다가 실패한다. 순차로 돌리는 편이 오히려 빠르다.
 */
function pool(tasks, limit = 2) {
  const out = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      out[i] = await tasks[i]();
    }
  }
  return Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker)).then(() => out);
}

/** 구청 서버가 간헐적으로 응답하지 않아 재시도를 둔다. */
async function fetchWithRetry(path, attempts = 2) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      const r = await fetch(BASE + path, {
        headers: { "User-Agent": UA },
        signal: ctl.signal,
      });
      clearTimeout(timer);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      last = e;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw last;
}

/** 행(tr) 원본에서 그 게시물로 바로 가는 절대 URL을 뽑는다. 못 찾으면 목록 주소. */
function rowLink(tr, kind, listPath) {
  if (kind === "file") {
    // 첨부파일 직행 — 주간행사계획은 제목만 봐선 쓸모가 없고 파일을 열어야 한다
    const f = tr.match(/href="(\/cmm\/fms\/FileDown\.do\?[^"]+)"/);
    if (f) return BASE + f[1].replace(/&amp;/g, "&");
  }
  if (kind === "bbs" || kind === "file") {
    const m = tr.match(/fn_search_detail\('([^']+)'\)/);
    if (m) return BASE + listPath.replace(/list\.do$/, "view.do") + "?nttId=" + m[1];
  }
  if (kind === "gosi") {
    const m = tr.match(/data-key-no="(\d+)"/);
    if (m) return BASE + listPath.replace(/list\.do$/, "view.do") + "?notAncmtMgtNo=" + m[1];
  }
  return BASE + listPath;
}

/**
 * 주간행사계획 제목에 든 주간 범위를 뽑는다.
 *   "서구 주간행사계획(2026. 9. 14. ~ 2026. 9. 20.)" → ["2026-09-14","2026-09-20"]
 * 이 게시판은 제목이 곧 기간이라 지난 주 것과 이번 주 것을 가릴 수 있다.
 */
function planSpan(title) {
  const m = title.match(
    /\((\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*~\s*(?:(\d{4})\.\s*)?(\d{1,2})\.\s*(\d{1,2})\.?\)/);
  if (!m) return null;
  const p = (y, mo, d) =>
    y + "-" + String(+mo).padStart(2, "0") + "-" + String(+d).padStart(2, "0");
  return [p(m[1], m[2], m[3]), p(m[4] || m[1], m[5], m[6])];
}

async function parseBoard(name, path, since, until, aheadUntil, kind) {
  let txt;
  try {
    txt = await fetchWithRetry(path);
  } catch (e) {
    return { name, items: [], error: String(e.message || e) };
  }

  const tb = txt.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
  if (!tb) return { name, items: [], error: "목록(tbody)을 찾지 못함" };

  const items = [];
  for (const m of tb[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)]
      .map((c) => stripTags(c[1]))
      .filter((c) => c && !c.startsWith("function "));
    if (!cells.length) continue;

    const dc = cells.find((c) => /^20\d{2}-\d{2}-\d{2}$/.test(c));
    if (!dc) continue;

    const cand = cells.filter((c) => /[가-힣]/.test(c) && !/^\d+$/.test(c));
    if (!cand.length) continue;
    const title = cand.reduce((a, b) => (b.length > a.length ? b : a))
      .replace(/\s*새글\s*$/, "").trim();

    // 고시·채용 공고에는 「개재일」(공고가 살아 있는 기간)이 붙는다.
    const per = m[1].match(/(20\d{2}-\d{2}-\d{2})\s*~\s*(20\d{2}-\d{2}-\d{2})/);
    const endsAt = per ? per[2] : null;

    const posted = dc >= since && dc <= until;             // 최근 올라온 것인가
    // 앞으로 마감될 공고 — 올라온 날짜가 기간 밖이어도 챙겨야 하니 남긴다.
    const openAhead = endsAt !== null && endsAt >= until && endsAt <= aheadUntil;
    // 주간행사계획 — 제목의 주간 범위가 보는 기간과 겹치면 남긴다.
    const span = kind === "file" ? planSpan(title) : null;
    const spanHit = span !== null && span[1] >= since && span[0] <= aheadUntil;

    if (!posted && !openAhead && !spanHit) continue;

    const dept = cand.find(
      (c) => c !== title && c.length >= 2 && c.length <= 10 && /(과|단|실|동|관)$/.test(c)
    ) || "";

    const tags = [...new Set(FLAGS.filter(([k]) => title.includes(k)).map(([, v]) => v))].sort();
    items.push({ board: name, date: dc, dept, title, tags,
                 endsAt, posted, span,
                 link: rowLink(m[1], kind, path) });
  }
  return { name, items };
}

/**
 * 기준일 앞뒤로 훑는다.
 *   back  — 며칠 전까지의 게시물을 볼지 (지난 일)
 *   ahead — 며칠 뒤까지의 마감·계획을 볼지 (앞으로의 일)
 * 아침에 보는 문서라 지난 일은 짧게, 앞으로의 일은 길게 잡는 편이 쓸모 있다.
 */
async function collect(baseDate, back = 3, ahead = 7) {
  const base = ymdToDate(baseDate);
  const sinceStr = new Date(base.getTime() - back * 86400000).toISOString().slice(0, 10);
  const aheadStr = new Date(base.getTime() + ahead * 86400000).toISOString().slice(0, 10);

  const results = await pool(
    BOARDS.map(([n, p, kind]) => () => parseBoard(n, p, sinceStr, baseDate, aheadStr, kind)),
    2
  );

  const items = results.flatMap((r) => r.items)
    .sort((a, b) => (a.date === b.date ? a.board.localeCompare(b.board) : b.date.localeCompare(a.date)));

  return {
    baseDate,
    since: sinceStr,
    aheadUntil: aheadStr,
    back, ahead,
    collectedAt: new Date().toISOString(),
    items,
    perBoard: results.map((r) => ({ name: r.name, count: r.items.length, error: r.error || null })),
    failed: results.filter((r) => r.error).map((r) => r.name),
  };
}

module.exports = { collect, todayKST, ymdToDate, kdate, shortDate, esc, BOARDS, WEEKDAYS };
