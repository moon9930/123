// Supabase에서 세 테이블을 읽어 10분 동안 기억해 둔다(캐시). api/places.js · api/route.js가 함께 쓴다.
// 키는 서버에서만 읽는다(.env / Vercel 환경 변수).

const PLACE_COLUMNS =
  "id,type,service,name,address,gu,lat,lng,racks,bikes,terminal_no,data_date,open_time,close_time,closed_days,fee";
const SLOPE_COLUMNS =
  "gid,district_name,slope_type,slope_category,slope_rescue,rating,designation,slope_height,slope_angle,addrs,gu,lat,lng";
const ROAD_COLUMNS = "id,name,road_type,start_addr,end_addr,gu_start,gu_end,length_km,width_m,data_date";

export const num = (v) => (v == null || v === "" ? null : Number(v));

async function query(table, params) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("환경 변수 SUPABASE_URL · SUPABASE_SECRET_KEY가 없습니다.");
  const res = await fetch(`${url}/rest/v1/${table}?${params}`, {
    headers: { apikey: key, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Supabase ${table} 조회 실패 (${res.status}): ${await res.text()}`);
  return res.json();
}

// 급경사지 · 자전거도로는 없어도 핵심 기능(대여소·보관소 찾기)은 돌아가야 한다 → 실패하면 null
async function optional(table, columns) {
  try {
    return await query(table, `select=${columns}&limit=5000`);
  } catch (err) {
    console.error(`[선택 데이터] ${err.message}`);
    return null;
  }
}

// 데이터는 1년에 한 번 정도 바뀌므로, 매 요청마다 Supabase에 다녀올 필요가 없다.
// 첫 화면이 열릴 때 /api/places가 불리므로, 버튼을 누를 때쯤에는 이미 기억된 상태다.
const CACHE_MS = 10 * 60 * 1000;
let cache = { data: null, at: 0, loading: null };

export async function allData() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  if (!cache.loading) {
    // 동시에 여러 요청이 와도 Supabase는 한 번만 부른다
    cache.loading = Promise.all([
      query("bike_places", `select=${PLACE_COLUMNS}&limit=5000`),
      optional("bike_slopes", SLOPE_COLUMNS),
      optional("bike_roads", ROAD_COLUMNS),
    ])
      .then(([places, slopes, roads]) => {
        const data = { places, slopes, roads };
        // 선택 데이터가 빠졌으면 오래 기억하지 않고 30초 뒤 다시 시도한다
        cache = { data, at: slopes && roads ? Date.now() : Date.now() - CACHE_MS + 30000, loading: null };
        return data;
      })
      .catch((err) => { cache.loading = null; throw err; });
  }
  return cache.loading;
}
