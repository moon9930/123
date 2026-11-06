// GET /api/places                       → { gus: [...], sources: [...] }        (구 목록 · 데이터 기준일)
// GET /api/places?lat=35.22&lng=128.68  → { mode: "near", places: [...10곳] } (가까운 순)
// GET /api/places?gu=성산구              → { mode: "gu", places: [...] }       (그 구 전체)
// 키는 서버에서만 읽는다(.env / Vercel 환경 변수). 화면 코드에는 키가 없다.
import { distanceMeters } from "../lib/distance.js";
import { rentalStatus, nowInSeoul } from "../lib/rental-status.js";

const TABLE = "bike_places";
const COLUMNS =
  "id,type,service,name,address,gu,lat,lng,racks,bikes,terminal_no,data_date,open_time,close_time,closed_days,fee";
const NEAR_COUNT = 10;
const GUS = ["의창구", "성산구", "마산합포구", "마산회원구", "진해구"];

// 화면 아래 출처: 어떤 행이 어느 원본에서 왔는지
const SOURCES = [
  { key: "nubija", label: "누비자 터미널", name: "경상남도 창원시_누비자 터미널 (2025년)",
    match: (r) => r.service === "nubija" },
  { key: "storage", label: "자전거 보관소", name: "자전거보관소정보_경남창원시 (창원시 환경정책과)",
    match: (r) => r.racks != null, dateOf: (r) => (r.type === "storage" ? r.data_date : null) },
  { key: "rental", label: "기타 대여소", name: "전국자전거대여소표준데이터 (공공데이터포털)",
    match: (r) => r.type === "rental" && r.service !== "nubija" },
];

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

// 477곳 전체를 한 번 읽어 10분 동안 기억해 둔다(캐시).
// 데이터는 1년에 한 번 정도 바뀌므로, 매 요청마다 Supabase에 다녀올 필요가 없다.
// 첫 화면이 열릴 때 /api/places가 불리므로, 버튼을 누를 때쯤에는 이미 기억된 상태다.
const CACHE_MS = 10 * 60 * 1000;
let cache = { rows: null, at: 0, loading: null };

async function allRows() {
  if (cache.rows && Date.now() - cache.at < CACHE_MS) return cache.rows;
  if (!cache.loading) {
    // 동시에 여러 요청이 와도 Supabase는 한 번만 부른다
    cache.loading = query(`select=${COLUMNS}&limit=5000`)
      .then((rows) => { cache = { rows, at: Date.now(), loading: null }; return rows; })
      .catch((err) => { cache.loading = null; throw err; });
  }
  return cache.loading;
}

const num = (v) => (v == null || v === "" ? null : Number(v));

// 화면에 보낼 모양으로 바꾼다
function toPlace(r, now, from) {
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

    // 위치로 찾기: 477곳뿐이라 전부(기억해 둔 것) 거리를 재고 가까운 10곳만 보낸다
    if (q.lat !== undefined || q.lng !== undefined) {
      const from = readPoint(q);
      if (!from) return res.status(400).json({ error: "위치 값이 올바르지 않습니다." });
      const rows = await allRows();
      const places = rows
        .map((r) => toPlace(r, now, from))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, NEAR_COUNT);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ mode: "near", places });
    }

    // 구로 찾기 (이름순)
    if (q.gu !== undefined) {
      const gu = String(q.gu).trim();
      if (!GUS.includes(gu)) return res.status(400).json({ error: "구 이름이 올바르지 않습니다." });
      const rows = (await allRows())
        .filter((r) => r.gu === gu)
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));
      res.setHeader("Cache-Control", "s-maxage=600");
      return res.status(200).json({ mode: "gu", gu, places: rows.map((r) => toPlace(r, now)) });
    }

    // 첫 화면용: 구 목록 + 원본별 곳 수 · 기준일 · 출처
    const rows = await allRows();
    const sources = SOURCES.map(({ key, label, name, match, dateOf }) => {
      const mine = rows.filter(match);
      const dates = mine.map((r) => (dateOf ? dateOf(r) : r.data_date)).filter(Boolean).sort();
      return { key, label, name, count: mine.length, dataDate: dates.pop() || null };
    });
    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.status(200).json({ gus: GUS, sources });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요." });
  }
}
