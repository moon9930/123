// 내 PC에서 확인용 서버: npm run dev → http://localhost:3000
// index.html을 보여 주고, /api/shelters는 Vercel과 똑같이 api/shelters.js가 처리한다.
// .env가 있으면 Supabase를, 없으면 data/shelters_sample.csv(예시 데이터)를 쓴다.
import http from "node:http";
import fs from "node:fs";
import handler from "./api/shelters.js";

const PORT = Number(process.env.PORT) || 3000;
const SAMPLE = "/_sample/rest/v1/shelters";

if (fs.existsSync(".env")) process.loadEnvFile(".env");
const sampleMode = !process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY;
if (sampleMode) {
  // api/shelters.js는 그대로 두고, 요청이 이 서버의 예시 데이터로 오게 한다.
  process.env.SUPABASE_URL = `http://localhost:${PORT}/_sample`;
  process.env.SUPABASE_SECRET_KEY = "sample";
}

// Supabase 조회 흉내: select · dong=eq.○○ · order · limit만 지원
function sampleQuery(params) {
  const [header, ...lines] = fs.readFileSync("data/shelters_sample.csv", "utf8").trim().split(/\r?\n/);
  const cols = header.split(",");
  let rows = lines.map((line) => {
    const v = line.split(",");
    return Object.fromEntries(cols.map((c, i) => [c, v[i] === "" ? null : v[i]]));
  });
  const dong = params.get("dong");
  if (dong) rows = rows.filter((r) => r.dong === dong.replace(/^eq\./, ""));
  const order = (params.get("order") || "").split(".")[0];
  if (order) rows.sort((a, b) => String(a[order]).localeCompare(String(b[order]), "ko"));
  const select = params.get("select");
  if (select) rows = rows.map((r) => Object.fromEntries(select.split(",").map((c) => [c, r[c] ?? null])));
  return rows.map((r) => (r.capacity != null ? { ...r, capacity: Number(r.capacity) } : r));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === SAMPLE) {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(sampleQuery(url.searchParams)));
  }

  if (url.pathname === "/api/shelters") {
    // Vercel의 req.query · res.status().json() 모양을 맞춰 준다
    req.query = Object.fromEntries(url.searchParams);
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(body));
    };
    return handler(req, res);
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync("index.html"));
  }

  res.writeHead(404).end("Not Found");
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT} 에서 열립니다.`);
  console.log(sampleMode
    ? "※ .env가 없어서 예시 데이터(data/shelters_sample.csv)로 실행합니다."
    : "Supabase 데이터로 실행합니다 (.env).");
});
