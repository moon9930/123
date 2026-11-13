// GET /api/route?from=35.2281,128.6811&to=35.2196,128.6920
//   → { distance, duration, line: [[lat,lng]...], bikeRoads: [...], onBikeRoadM, slopes: {...} }
//
// 경로는 OpenStreetMap 자전거 길찾기 서버(FOSSGIS · routing.openstreetmap.de, 키 없음)에서 받는다.
// 창원시 자전거도로 CSV에는 좌표가 없어 직접 경로를 계산할 수 없으므로,
// 받은 경로가 지나는 길 이름을 창원시 자전거도로 노선명과 맞춰 "이 경로의 자전거도로"를 보여 준다.
// 화면이 외부 서버를 직접 부르지 않도록 서버 함수에서 부른다 (화면 → api/ → 데이터).
import { allData, num } from "../lib/data.js";

const ROUTER = "https://routing.openstreetmap.de/routed-bike/route/v1/driving";
const MAX_STRAIGHT_M = 40000; // 창원 안 길찾기만 (직선 40km 이내)
const SLOPE_NEAR_ROUTE_M = 100; // 경로에서 100m 안 급경사지

// "35.2281,128.6811" → { lat, lng } · 창원 근처 범위만 받는다
function readPoint(s) {
  const [lat, lng] = String(s || "").split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < 34.9 || lat > 35.6 || lng < 128.2 || lng > 129.1) return null;
  return { lat, lng };
}

// 가까운 거리에서 쓰는 평면 근사 (미터)
const M_PER_DEG_LAT = 111320;
function toXY(p, lat0) {
  return [p.lng * M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180), p.lat * M_PER_DEG_LAT];
}
function pointToSegment(p, a, b) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// 노선명 "원이대로(정동로)" → ["원이대로", "정동로"]
const namesOf = (roadName) =>
  [roadName.replace(/\(.*\)/, ""), (/\((.*)\)/.exec(roadName) || [])[1]].filter(Boolean).map((s) => s.trim());

export default async function handler(req, res) {
  try {
    const from = readPoint(req.query?.from);
    const to = readPoint(req.query?.to);
    if (!from || !to) return res.status(400).json({ error: "출발지·도착지가 창원 범위가 아닙니다." });
    const [a, b] = [toXY(from, from.lat), toXY(to, from.lat)];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > MAX_STRAIGHT_M) {
      return res.status(400).json({ error: "창원 안에서 40km 이내만 길찾기를 할 수 있어요." });
    }

    // 1) 자전거 경로 받기 (8초 안에 못 받으면 포기)
    const url = `${ROUTER}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
    let route;
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "changwon-bike-places (student project)" },
      });
      const body = await r.json();
      if (!r.ok || body.code !== "Ok" || !body.routes?.length) throw new Error(body.message || body.code || r.status);
      route = body.routes[0];
    } catch (err) {
      console.error("[길찾기 서버]", err.message);
      return res.status(502).json({ error: "자전거 길찾기 서버에 연결하지 못했어요. 잠시 후 다시 시도하세요." });
    }

    const line = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const steps = route.legs.flatMap((leg) => leg.steps).filter((s) => s.distance > 0);

    // 2) 경로가 지나는 길 이름 ↔ 창원시 자전거도로 노선명
    const data = await allData();
    const roadsByName = new Map(); // "원이대로" → Set(종류)
    for (const r of data.roads || []) {
      for (const n of namesOf(r.name)) {
        if (!roadsByName.has(n)) roadsByName.set(n, new Set());
        roadsByName.get(n).add(r.road_type);
      }
    }
    const used = new Map(); // 길 이름 → 그 길로 달린 거리
    for (const s of steps) {
      const n = (s.name || "").trim();
      if (n && roadsByName.has(n)) used.set(n, (used.get(n) || 0) + s.distance);
    }
    const bikeRoads = [...used.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([name, m]) => ({ name, meters: Math.round(m), types: [...roadsByName.get(name)] }));
    const onBikeRoadM = Math.round([...used.values()].reduce((x, y) => x + y, 0));

    // 3) 경로 100m 안 급경사지
    let slopes = null;
    if (data.slopes) {
      const pts = line.map(([lat, lng]) => toXY({ lat, lng }, from.lat));
      const near = data.slopes
        .map((s) => {
          const p = toXY({ lat: Number(s.lat), lng: Number(s.lng) }, from.lat);
          let d = Infinity;
          for (let i = 1; i < pts.length; i++) d = Math.min(d, pointToSegment(p, pts[i - 1], pts[i]));
          return { s, d };
        })
        .filter(({ d }) => d <= SLOPE_NEAR_ROUTE_M);
      const angles = near.map(({ s }) => num(s.slope_angle)).filter((x) => x != null);
      slopes = {
        count: near.length,
        maxAngle: angles.length ? Math.max(...angles) : null,
        items: near.map(({ s }) => ({
          name: s.district_name, lat: Number(s.lat), lng: Number(s.lng),
          kind: [s.slope_type, s.slope_category, s.slope_rescue].filter(Boolean).join(" · "),
          angle: num(s.slope_angle), rating: s.rating || null,
        })),
      };
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      distance: Math.round(route.distance),
      duration: Math.round(route.duration),
      line,
      bikeRoads,
      onBikeRoadM,
      bikeRoadsLoaded: !!data.roads,
      slopes,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "길찾기를 하지 못했습니다. 잠시 후 다시 시도하세요." });
  }
}
