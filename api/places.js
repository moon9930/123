// GET /api/places                       → { gus: [...], sources: [...] }                (구 목록 · 데이터 기준일)
// GET /api/places?lat=35.22&lng=128.68  → { mode: "near", places: [...10곳] }         (가까운 순)
// GET /api/places?gu=성산구              → { mode: "gu", places: [...], roads: [...] } (그 구 전체 + 자전거도로)
// 각 장소에는 300m 안 급경사지 요약(slopes)이 붙는다.
// 키는 서버에서만 읽는다(.env / Vercel 환경 변수). 화면 코드에는 키가 없다.
import { distanceMeters } from "../lib/distance.js";
import { rentalStatus, nowInSeoul } from "../lib/rental-status.js";
import { allData, num } from "../lib/data.js";

const NEAR_COUNT = 10;
const SLOPE_RADIUS_M = 300; // 급경사지 좌표가 약 100m 오차라 300m로 잡는다
const GUS = ["의창구", "성산구", "마산합포구", "마산회원구", "진해구"];
const SLOPES_FETCHED = "2026-11-13"; // 급경사지 API에는 기준일이 없어 받은 날을 적는다

// 화면 아래 출처: 어떤 행이 어느 원본에서 왔는지
const PLACE_SOURCES = [
  { key: "nubija", label: "누비자 터미널", name: "경상남도 창원시_누비자 터미널 (2025년)",
    match: (r) => r.service === "nubija" },
  { key: "storage", label: "자전거 보관소", name: "자전거보관소정보_경남창원시 (창원시 환경정책과)",
    match: (r) => r.racks != null, dateOf: (r) => (r.type === "storage" ? r.data_date : null) },
  { key: "rental", label: "기타 대여소", name: "전국자전거대여소표준데이터 (공공데이터포털)",
    match: (r) => r.type === "rental" && r.service !== "nubija" },
];


// 장소 반경 안 급경사지 요약 (가까운 순 최대 5곳)
function slopesNear(place, slopes) {
  if (!slopes) return null;
  const near = slopes
    .map((s) => ({ s, d: distanceMeters(place.lat, place.lng, Number(s.lat), Number(s.lng)) }))
    .filter(({ d }) => d <= SLOPE_RADIUS_M)
    .sort((a, b) => a.d - b.d);
  if (!near.length) return { count: 0 };
  const angles = near.map(({ s }) => num(s.slope_angle)).filter((a) => a != null);
  return {
    count: near.length,
    maxAngle: angles.length ? Math.max(...angles) : null,
    designated: near.filter(({ s }) => s.designation === "여").length,
    items: near.slice(0, 5).map(({ s, d }) => ({
      name: s.district_name,
      kind: [s.slope_type, s.slope_category, s.slope_rescue].filter(Boolean).join(" · "),
      angle: num(s.slope_angle),
      height: num(s.slope_height),
      rating: s.rating || null,
      designated: s.designation === "여",
      distance: Math.round(d / 10) * 10, // 좌표가 거칠어 10m 단위로
      lat: Number(s.lat),
      lng: Number(s.lng),
    })),
  };
}

// 화면에 보낼 모양으로 바꾼다
function toPlace(r, now, data, from) {
  const place = {
    id: r.id,
    type: r.type,
    service: r.service || null,
    name: r.name,
    address: r.address,
    gu: r.gu,
    lat: Number(r.lat),
    lng: Number(r.lng),
    racks: num(r.racks),
    bikes: num(r.bikes),
    terminalNo: r.terminal_no || null,
  };
  if (r.open_time || r.closed_days) {
    place.hours = r.open_time && r.close_time ? `${r.open_time}~${r.close_time}` : null;
    place.fee = r.fee || null;
    place.status = rentalStatus(r, now);
  }
  if (from) place.distance = Math.round(distanceMeters(from.lat, from.lng, place.lat, place.lng));
  place.slopes = slopesNear(place, data.slopes);
  return place;
}

const toRoad = (r) => ({
  name: r.name,
  type: r.road_type,
  from: r.start_addr,
  to: r.end_addr,
  lengthKm: num(r.length_km),
  widthM: num(r.width_m),
});

// 숫자이고 한국 근처 범위인지 확인 (이상한 값은 받지 않는다)
function readPoint(q) {
  const lat = Number(q.lat);
  const lng = Number(q.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
  return { lat, lng };
}

export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const now = nowInSeoul();

    // 위치로 찾기: 전부(기억해 둔 것) 거리를 재고 가까운 10곳만 보낸다
    if (q.lat !== undefined || q.lng !== undefined) {
      const from = readPoint(q);
      if (!from) return res.status(400).json({ error: "위치 값이 올바르지 않습니다." });
      const data = await allData();
      const places = data.places
        .map((r) => ({ r, d: distanceMeters(from.lat, from.lng, Number(r.lat), Number(r.lng)) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, NEAR_COUNT)
        .map(({ r }) => toPlace(r, now, data, from));
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ mode: "near", places });
    }

    // 구로 찾기 (이름순) + 그 구를 지나는 자전거도로
    if (q.gu !== undefined) {
      const gu = String(q.gu).trim();
      if (!GUS.includes(gu)) return res.status(400).json({ error: "구 이름이 올바르지 않습니다." });
      const data = await allData();
      const places = data.places
        .filter((r) => r.gu === gu)
        .sort((a, b) => a.name.localeCompare(b.name, "ko"))
        .map((r) => toPlace(r, now, data));
      const roads = data.roads
        ? data.roads
            .filter((r) => r.gu_start === gu || r.gu_end === gu)
            .sort((a, b) => num(b.length_km) - num(a.length_km))
            .map(toRoad)
        : null;
      res.setHeader("Cache-Control", "s-maxage=600");
      return res.status(200).json({ mode: "gu", gu, places, roads });
    }

    // 첫 화면용: 구 목록 + 원본별 곳 수 · 기준일 · 출처
    const data = await allData();
    const sources = PLACE_SOURCES.map(({ key, label, name, match, dateOf }) => {
      const mine = data.places.filter(match);
      const dates = mine.map((r) => (dateOf ? dateOf(r) : r.data_date)).filter(Boolean).sort();
      return { key, label, name, count: mine.length, dataDate: dates.pop() || null };
    });
    if (data.slopes) {
      sources.push({ key: "slopes", label: "급경사지", name: "경상남도 급경사지 현황 (공공데이터포털 API)",
        count: data.slopes.length, dataDate: `${SLOPES_FETCHED} 받음` });
    }
    if (data.roads) {
      sources.push({ key: "roads", label: "자전거도로 구간", name: "경상남도 창원시_자전거도로 (공공데이터포털)",
        count: data.roads.length, dataDate: data.roads.map((r) => r.data_date).filter(Boolean).sort().pop() || null });
    }
    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.status(200).json({ gus: GUS, sources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요." });
  }
}
