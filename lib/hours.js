// 운영 요일·시간 문자열을 "지금 운영 중" 판단으로 바꾸는 함수 모음
// 공공데이터는 표기 형식이 제각각이라("09:00~18:00", "9시-18시" 등) 여러 형식을 받아들인다.
// 읽을 수 없는 형식은 "운영 중"으로 추측하지 않고 "확인 필요(unknown)"로 돌려준다.

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const RANGE = /([일월화수목금토])(?:요일)?[~\-–]([일월화수목금토])(?:요일)?/g;

// "월~금", "평일", "주말", "매일", "토,일", "월·수·금" → 요일 번호 집합(0=일)
export function parseDays(text) {
  const s = String(text || "").replace(/\s/g, "");
  if (!s) return null;
  if (/매일|연중|상시|전일/.test(s)) return new Set([0, 1, 2, 3, 4, 5, 6]);
  const days = new Set();
  if (s.includes("평일")) [1, 2, 3, 4, 5].forEach((d) => days.add(d));
  if (s.includes("주말")) [0, 6].forEach((d) => days.add(d));
  for (const m of s.matchAll(RANGE)) {
    let a = DAY_NAMES.indexOf(m[1]);
    const b = DAY_NAMES.indexOf(m[2]);
    for (let i = 0; i < 7; i++) { days.add(a); if (a === b) break; a = (a + 1) % 7; }
  }
  const rest = s.replace(RANGE, "").replace(/평일|주말/g, "");
  for (const ch of rest) { const i = DAY_NAMES.indexOf(ch); if (i >= 0) days.add(i); }
  return days.size ? days : null;
}

// "09:00~18:00", "9시-18시", "9:00 ~ 18:00", "09시30분~18시" → { open: 분, close: 분 }
export function parseHours(text) {
  const s = String(text || "").replace(/\s/g, "");
  if (!s) return null;
  if (/24시간/.test(s)) return { open: 0, close: 24 * 60 };
  const t = "(\\d{1,2})(?::(\\d{2})|시(?:(\\d{1,2})분)?)";
  const m = s.match(new RegExp("^" + t + "[~\\-–]" + t + "$"));
  if (!m) return null;
  const toMin = (h, m1, m2) => Number(h) * 60 + Number(m1 || m2 || 0);
  return { open: toMin(m[1], m[2], m[3]), close: toMin(m[4], m[5], m[6]) };
}

// 한국 시간 기준 현재 요일·분 (Vercel 서버는 UTC로 돌기 때문에 직접 9시간을 더한다)
export function nowInSeoul(date = new Date()) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return { day: kst.getUTCDay(), minutes: kst.getUTCHours() * 60 + kst.getUTCMinutes() };
}

const fmt = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");

// 운영 구간 여러 개(기본·연장·추가) 중 오늘 해당하는 것으로 상태 판단
// 반환: { status: "open" | "closed" | "unknown", todayHours: "09:00~18:00" | null }
export function shelterStatus(slots, now = nowInSeoul()) {
  let readable = false;
  let unreadable = false;
  const today = [];
  for (const { days, hours } of slots) {
    if (!days && !hours) continue;
    const d = parseDays(days);
    const h = parseHours(hours);
    if (!d || !h) { unreadable = true; continue; }
    readable = true;
    if (d.has(now.day)) today.push(h);
  }
  if (!readable) return { status: "unknown", todayHours: null };
  if (!today.length) return { status: unreadable ? "unknown" : "closed", todayHours: null };
  const open = today.some((h) => now.minutes >= h.open && now.minutes < h.close);
  const todayHours = today.map((h) => fmt(h.open) + "~" + fmt(h.close)).join(", ");
  return { status: open ? "open" : "closed", todayHours };
}
