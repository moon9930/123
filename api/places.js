// GET /api/places                       → { gus: [...], sources: [...] }        (구 목록 · 데이터 기준일)
// GET /api/places?lat=35.22&lng=128.68  → { mode: "near", places: [...10곳] } (가까운 순)
// GET /api/places?gu=성산구              → { mode: "gu", places: [...] }       (그 구 전체, 이름순)
// 키는 서버에서만 읽는다(.env / Vercel 환경 변수). 화면 코드에는 키가 없다.
import { distanceMeters } from "../lib/distance.js";
import { rentalStatus, nowInSeoul } from "../lib/rental-status.js";

const TABLE = "bike_places";
const COLUMNS =
  "id,type,name,road_address,jibun_address,gu,lat,lng,capacity,data_date,open_time,close_time,closed_days,fee";
const NEAR_COUNT = 10;
const GUS = ["의창구", "성산구", "마산합포구", "마산회원구", "진해구"];
const SOURCES = {
  storage: "자전거보관소정보_경남창원시 (창원시 환경정책과)",
  rental: "전국자전거대여소표준데이터 (공공데이터포털)",
};

async function query(params) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("환경 변수 SUPABASE_URL · SUPABASE_SECRET_KEY가 없습니다.");
  const res = await fetch(`${url}/rest/v1/${TABLE}?${params}`, {
    headers: { apikey: key, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Supabase 조회 실패 (${res.status}): ${await res.text()}`);
  return res.json();
}

// 화면에 보낼 모양으로 바꾼다 (대여소는 지금 상태를 붙인다)
function toPlace(r, now, from) {
  const place = {
    id: r.id,
    type: r.type,
    name: r.name,
    address: r.road_address || r.jibun_address,
    gu: r.gu,
    lat: Number(r.lat),
    lng: Number(r.lng),
    capacity: r.capacity == null ? null : Number(r.capacity),
  };
  if (r.type === "rental") {
    place.hours = r.open_time && r.close_time ? `${r.open_time}~${r.close_time}` : null;
    place.fee = r.fee || null;
    place.closedDays = r.closed_days || null;
    place.status = rentalStatus(r, now);
  }
  if (from) place.distance = Math.round(distanceMeters(from.lat, from.lng, place.lat, place.lng));
  return place;
}

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

    // 위치로 찾기: 284곳뿐이라 전부 읽어 거리를 재고 가까운 10곳만 보낸다
    if (q.lat !== undefined || q.lng !== undefined) {
      const from = readPoint(q);
      if (!from) return res.status(400).json({ error: "위치 값이 올바르지 않습니다." });
      const rows = await query(`select=${COLUMNS}&limit=5000`);
      const places = rows
        .map((r) => toPlace(r, now, from))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, NEAR_COUNT);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ mode: "near", places });
    }

    // 구로 찾기
    if (q.gu !== undefined) {
      const gu = String(q.gu).trim();
      if (!GUS.includes(gu)) return res.status(400).json({ error: "구 이름이 올바르지 않습니다." });
      const rows = await query(`select=${COLUMNS}&gu=eq.${encodeURIComponent(gu)}&order=name.asc&limit=5000`);
      // 대여소를 먼저, 그다음 보관소 이름순
      const places = rows
        .map((r) => toPlace(r, now))
        .sort((a, b) => (a.type === b.type ? 0 : a.type === "rental" ? -1 : 1));
      res.setHeader("Cache-Control", "s-maxage=600");
      return res.status(200).json({ mode: "gu", gu, places });
    }

    // 첫 화면용: 구 목록 + 데이터별 기준일 · 출처
    const rows = await query("select=type,data_date&limit=5000");
    const sources = Object.entries(SOURCES).map(([type, name]) => {
      const mine = rows.filter((r) => r.type === type);
      const dataDate = mine.map((r) => r.data_date).filter(Boolean).sort().pop() || null;
      return { type, name, count: mine.length, dataDate };
    });
    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.status(200).json({ gus: GUS, sources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요." });
  }
}
