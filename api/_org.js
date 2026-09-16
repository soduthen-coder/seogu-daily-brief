// 소속(동·부서) 관련 판정.
// 랜딩페이지의 선택값과 수집 항목을 맞춰 "내 소속 사항"을 앞으로 뽑아내는 데 쓴다.

// 대전 서구 24개 행정동 — 서구청 홈페이지 동 주민센터 링크에서 확인(2026. 9.)
const DONGS = [
  "복수동", "도마1동", "도마2동", "정림동", "변동", "괴정동", "가장동", "내동",
  "가수원동", "도안동", "관저1동", "관저2동", "기성동", "용문동", "탄방동",
  "갈마1동", "갈마2동", "둔산1동", "둔산2동", "둔산3동",
  "월평1동", "월평2동", "월평3동", "만년동",
];

// 구청 부서 — 서구청 부서안내 페이지에서 수집(2026. 9.)
const DEPTS = [
  "기획예산과", "운영지원과", "자치행정과", "홍보담당관", "전략사업과",
  "세정과", "세원관리과", "민원여권과",
  "복지정책과", "노인장애인과", "아동복지과", "여성가족복지과",
  "문화체육과", "지역경제과",
  "도시계획과", "도시정비과", "건축과", "공공건축과", "공동주택과", "토지정보과",
  "건설과", "교통과", "주차행정과", "공원녹지과",
  "기후환경과", "자원순환과", "위생과",
  "재난안전과", "보건소",
];

/** "월평2동" → "월평" (숫자 붙은 동은 형제 동 소식도 같이 챙기는 편이 유용하다) */
function baseName(org) {
  const m = /^(.+?)\d+동$/.exec(org || "");
  return m ? m[1] : null;
}

/**
 * 항목이 이 소속과 관련 있는가.
 *  - 게시 부서가 그 소속이거나
 *  - 제목에 소속 이름이 들어 있거나
 *  - 숫자 동이면 지역명(월평)이 제목·부서에 들어 있는 경우
 */
/**
 * 매칭 등급. 낮을수록 확실하다.
 *   1 = 우리 소속이 직접 걸린 건 (게시 부서가 우리이거나 제목에 우리 이름)
 *   2 = 지역명만 겹치는 건 (월평2동 ← 월평1동 공고)
 *   0 = 관련 없음
 * 1:1로 맞지 않는 2등급을 1등급 아래에 따로 두어야 무엇이 내 일인지 헷갈리지 않는다.
 */
function matchTier(item, org) {
  if (!org) return 0;
  if (item.dept === org || item.title.indexOf(org) >= 0) return 1;
  const b = baseName(org);
  if (b && b.length >= 2 && (item.title.indexOf(b) >= 0 || (item.dept || "").indexOf(b) === 0)) return 2;
  return 0;
}

function isRelevant(item, org) {
  return matchTier(item, org) > 0;
}

/** 왜 걸렸는지 한 마디로 — 표의 「사유」 칸에 넣는다 */
function reason(item, org) {
  if (item.dept === org) return "우리 소속 게시";
  if (item.title.indexOf(org) >= 0) return "제목에 명시";
  const b = baseName(org);
  if (b && item.title.indexOf(b) >= 0) return b + " 지역 언급";
  if (b && (item.dept || "").indexOf(b) === 0) return "인접 동 게시";
  return "관련";
}

module.exports = { DONGS, DEPTS, isRelevant, matchTier, reason, baseName };
