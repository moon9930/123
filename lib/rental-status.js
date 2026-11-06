// 대여소의 지금 상태를 한국 시간 기준으로 판단한다.
// Vercel 서버는 UTC로 돌기 때문에 9시간을 더해 한국 시각을 만든다.
//
// 반환: { status, label }
//   status = "season-closed"(휴무 기간) | "open"(운영 중) | "closed"(운영 시간 아님) | "unknown"(확인 필요)

export function nowInSeoul(date = new Date()) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return { month: kst.getUTCMonth() + 1, minutes: kst.getUTCHours() * 60 + kst.getUTCMinutes() };
}

// "11월 ~ 3월" → 이번 달이 그 기간이면 true. 형식을 모르면 null.
export function inClosedSeason(closedDays, month) {
  const m = /^\s*(\d{1,2})\s*월\s*[~\-]\s*(\d{1,2})\s*월\s*$/.exec(closedDays || "");
  if (!m) return null;
  const [from, to] = [Number(m[1]), Number(m[2])];
  return from <= to ? month >= from && month <= to : month >= from || month <= to; // 해를 넘기는 기간 (11월~3월)
}

const toMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || "").trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export function rentalStatus({ open_time, close_time, closed_days }, now = nowInSeoul()) {
  if (closed_days) {
    const season = inClosedSeason(closed_days, now.month);
    if (season === true) return { status: "season-closed", label: `휴무 기간 (${closed_days})` };
    if (season === null) return { status: "unknown", label: `휴무: ${closed_days} (확인 필요)` };
  }
  const open = toMinutes(open_time);
  const close = toMinutes(close_time);
  if (open == null || close == null) return { status: "unknown", label: "운영 시간 확인 필요" };
  // "~17:00"은 17시에 닫는다는 뜻 → 닫는 시각과 같으면 운영 종료
  return now.minutes >= open && now.minutes < close
    ? { status: "open", label: "지금 운영 중" }
    : { status: "closed", label: "지금은 운영 시간이 아님" };
}
