// 내 PC에서 확인용 서버: npm run dev → http://localhost:3000
// index.html을 보여 주고, /api/places는 Vercel과 똑같이 api/places.js가 처리한다.
// .env에 Supabase 키가 있으면 Supabase를, 없으면 data/의 CSV를 쓴다.
// 키가 있어도 CSV로 확인하고 싶으면: npm run dev:csv
import http from "node:http";
import fs from "node:fs";
import handler from "./api/places.js";

const PORT = Number(process.env.PORT) || 3000;
const SAMPLE_PREFIX = "/_sample/rest/v1/";
// Supabase 테이블 이름 → CSV 파일
const SAMPLE_TABLES = {
  bike_places: "data/stations_utf8.csv",
  bike_slopes: "data/slopes_changwon_utf8.csv",
  bike_roads: "data/bike_roads_utf8.csv",
};

if (fs.existsSync(".env")) process.loadEnvFile(".env");
const sampleMode =
  process.argv.includes("--csv") || !process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY;
if (sampleMode) {
  // api/places.js는 그대로 두고, 요청이 이 서버의 CSV 데이터로 오게 한다.
  process.env.SUPABASE_URL = `http://localhost:${PORT}/_sample`;
  process.env.SUPABASE_SECRET_KEY = "sample";
}

// CSV 한 줄을 칸으로 나눈다 ("따옴표, 안의 쉼표"도 처리)
function splitCsvLine(line) {
  const cells = [];
  let cell = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { cells.push(cell); cell = ""; }
    else cell += c;
  }
  cells.push(cell);
  return cells;
}

// Supabase 조회 흉내: select · limit만 지원 (api/places.js는 전부 읽어 기억해 두고 거른다)
function sampleQuery(file, params) {
  const [header, ...lines] = fs.readFileSync(file, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/);
  const cols = header.split(",");
  let rows = lines.map((line) => {
    const v = splitCsvLine(line);
    return Object.fromEntries(cols.map((c, i) => [c, v[i] === "" || v[i] === undefined ? null : v[i]]));
  });
  const limit = Number(params.get("limit"));
  if (limit) rows = rows.slice(0, limit);
  const select = params.get("select");
  if (select) rows = rows.map((r) => Object.fromEntries(select.split(",").map((c) => [c, r[c] ?? null])));
  return rows;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith(SAMPLE_PREFIX)) {
    const file = SAMPLE_TABLES[url.pathname.slice(SAMPLE_PREFIX.length)];
    if (!file || !fs.existsSync(file)) return res.writeHead(404).end("[]");
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(sampleQuery(file, url.searchParams)));
  }

  if (url.pathname === "/api/places") {
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
    ? "※ data/의 CSV로 실행합니다 (Supabase를 쓰지 않음)."
    : "Supabase 데이터로 실행합니다 (.env).");
});
