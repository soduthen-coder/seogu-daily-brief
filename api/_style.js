// 보고서 문서의 스타일. 랜딩페이지와 같은 토큰을 쓴다.
const STYLE = `
  :root {
    color-scheme: only light;
    --ink-00:#FFFFFF;
    --ink-50:#FAFAF7; --ink-100:#F2F2EE; --ink-200:#E2E2DC; --ink-300:#C4C4BC;
    --ink-400:#8E8E84; --ink-500:#6E6E64; --ink-600:#5C5C54; --ink-700:#42423A;
    --ink-800:#26261F; --ink-900:#0A0A08;
    --accent:#EAB308; --accent-50:#FEFCE8; --accent-100:#FEF9C3; --accent-300:#FDE047;
    --accent-600:#CA8A04; --accent-700:#A16207;
    --warn:#B45309; --warn-50:#FFF7ED; --warn-100:#FFEDD5;
    --ok:#15803D;
    --font:'Pretendard Variable','Pretendard','맑은 고딕','Malgun Gothic',-apple-system,'Apple SD Gothic Neo',sans-serif;
    --ease:cubic-bezier(.16,1,.3,1);
    --sh-card:0 2px 6px -2px rgba(10,10,8,.05),0 18px 40px -16px rgba(234,179,8,.16);
  }
  * { box-sizing: border-box; }
  body {
    margin:0; background:var(--ink-100); color:var(--ink-900); font-family:var(--font);
    font-size:10.5pt; line-height:1.65; letter-spacing:-0.011em;
    word-break:keep-all; overflow-wrap:break-word; -webkit-font-smoothing:antialiased;
  }
  .toolbar {
    position:sticky; top:0; z-index:10; background:var(--ink-900); color:var(--ink-50);
    padding:11px 18px; display:flex; flex-wrap:wrap; gap:10px; align-items:center;
  }
  .toolbar .ttl { font-weight:600; margin-right:auto; font-size:11pt; letter-spacing:-0.02em; }
  .toolbar a { font-size:9.5pt; font-weight:600; text-decoration:none; color:var(--ink-400); padding:7px 4px; }
  .toolbar a:hover { color:var(--accent-300); }
  .toolbar button {
    font-family:inherit; font-size:9.5pt; font-weight:700;
    background:var(--accent); color:var(--ink-900); border:0; border-radius:6px;
    padding:7px 14px; cursor:pointer; transition:background .18s var(--ease);
  }
  .toolbar button:hover { background:var(--accent-300); }
  .page {
    width:210mm; min-height:297mm; margin:20px auto; padding:18mm 15mm;
    background:var(--ink-00); box-shadow:var(--sh-card);
  }
  h1.doc-title { text-align:center; font-size:21pt; font-weight:800; letter-spacing:-0.035em; margin:18px 0 6px; }
  .doc-sub { text-align:center; font-size:9.5pt; color:var(--ink-500); margin-bottom:6px; }
  .rule { border:0; border-top:2px solid var(--accent); margin:12px 0 20px; }
  h2 {
    font-size:12pt; font-weight:700; margin:24px 0 9px; padding-left:10px;
    border-left:3px solid var(--accent); letter-spacing:-0.03em;
  }
  h2 .en { font-weight:400; font-size:9pt; color:var(--ink-400); margin-left:7px; }
  table.t { width:100%; border-collapse:collapse; margin-bottom:8px; font-size:10pt; }
  table.t th, table.t td { border:1px solid var(--ink-200); padding:7px 10px; vertical-align:middle; }
  table.t th { background:var(--ink-50); font-weight:600; text-align:center; white-space:nowrap; color:var(--ink-700); }
  table.t thead th { background:var(--ink-100); color:var(--ink-800); }
  table.t td.c { text-align:center; }
  table.t tbody tr:hover { background:var(--accent-50); }
  table.t small { color:var(--ink-400); font-size:8.5pt; }
  table.t a {
    color:inherit; text-decoration:underline;
    text-decoration-color:var(--accent); text-decoration-thickness:1.5px;
    text-underline-offset:2px;
  }
  table.t a:hover { color:var(--accent-700); }
  /* 인쇄물에는 링크 밑줄이 의미가 없다 */
  @media print { table.t a { text-decoration:none; color:inherit; } }
  ul.dash { margin:4px 0 0; padding-left:17px; }
  ul.dash li { margin-bottom:3px; }
  .done { color:var(--ok); font-weight:700; }
  .ing { color:var(--warn); font-weight:700; }
  .wait { color:var(--ink-400); font-weight:700; }
  .note {
    font-size:9pt; color:var(--ink-600); background:var(--ink-50);
    border:1px solid var(--ink-200); border-radius:6px; padding:10px 13px; margin-top:8px;
  }
  .note b { color:var(--ink-800); }
  .note.warn { background:var(--warn-50); border-color:var(--warn-100); }
  [contenteditable="true"]:focus { background:var(--accent-100); outline:2px solid var(--accent-600); border-radius:3px; }
  @media screen { h2, table.t, .note { animation:rise .5s var(--ease) both; } }
  @keyframes rise { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:none;} }
  @media (prefers-reduced-motion: reduce) { h2, table.t, .note { animation:none; } }
  @media print {
    @page { size:A4; margin:12mm; }
    body { background:#fff; }
    .toolbar { display:none; }
    .page { width:auto; min-height:auto; margin:0; padding:0; box-shadow:none; }
    h2, table.t { break-inside:avoid; animation:none; }
    table.t tbody tr:hover { background:none; }
  }
  @media screen and (max-width:820px) {
    .page { width:auto; padding:18px; margin:10px; }
    table.t { font-size:9.5pt; }
    table.t th, table.t td { padding:6px 7px; }
    h1.doc-title { font-size:18pt; }
  }
`;
module.exports = { STYLE };
