// GET /api/shelters            → { dongs: [...], dataDate }
// GET /api/shelters?dong=반송동 → { dong, dataDate, shelters: [...] }
// 키는 서버에서만 읽는다(.env / Vercel 환경 변수). 화면 코드에는 키가 없다.
import { shelterStatus, nowInSeoul } from "../lib/hours.js";

const COLUMNS =
  "name,dong,road_address,capacity,base_days,base_hours,ext_days,ext_hours,add_days,add_hours,data_date";

async function query(params) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("환경 변수 SUPABASE_URL · SUPABASE_SECRET_KEY가 없습니다.");
  const res = await fetch(`${url}/rest/v1/shelters?${params}`, {
    headers: { apikey: key, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Supabase 조회 실패 (${res.status}): ${await res.text()}`);
  return res.json();
}

export default async function handler(req, res) {
  try {
    const dong = (req.query.dong || "").trim();

    // 행정동 목록
    if (!dong) {
      const rows = await query("select=dong,data_date&order=dong.asc&limit=5000");
      const dongs = [...new Set(rows.map((r) => r.dong))];
      const dataDate = rows.map((r) => r.data_date).filter(Boolean).sort().pop() || null;
      res.setHeader("Cache-Control", "s-maxage=3600");
      return res.status(200).json({ dongs, dataDate });
    }

    // 선택한 동의 쉼터 + 지금 운영 여부
    const rows = await query(
      `select=${COLUMNS}&dong=eq.${encodeURIComponent(dong)}&order=name.asc`
    );
    const now = nowInSeoul();
    const shelters = rows.map((r) => {
      const { status, todayHours } = shelterStatus(
        [
          { days: r.base_days, hours: r.base_hours },
          { days: r.ext_days, hours: r.ext_hours },
          { days: r.add_days, hours: r.add_hours },
        ],
        now
      );
      return {
        name: r.name,
        address: r.road_address,
        capacity: r.capacity,
        status,
        todayHours,
        rawHours: [r.base_days, r.base_hours].filter(Boolean).join(" "),
      };
    });
    const dataDate = rows.map((r) => r.data_date).filter(Boolean).sort().pop() || null;
    return res.status(200).json({ dong, dataDate, shelters });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요." });
  }
}
