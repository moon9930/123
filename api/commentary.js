// POST /api/commentary  { win, wave, lives, towers } → { line }
// 산성 방어(tower-defense.html) 결과를 AI가 한 줄로 해설한다.
// 키는 서버에서만 읽는다(.env / Vercel 환경 변수). 화면 코드에는 키가 없다.
// Vercel 권장 방식: export default { fetch } (https://vercel.com/docs/functions)

const MODEL = "openrouter/free";
const MAX_WAVE = 50;

function readResult(body) {
  const { win, wave, lives, towers } = body ?? {};
  const isInt = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  if (typeof win !== "boolean") return null;
  if (!isInt(wave, 0, MAX_WAVE) || !isInt(lives, 0, 999) || !isInt(towers, 0, 99)) return null;
  return { win, wave, lives, towers };
}

function prompt({ win, wave, lives, towers }) {
  const result = win
    ? `승리: ${MAX_WAVE}개 웨이브를 모두 막음. 남은 성벽 ${lives}, 타워 ${towers}기.`
    : `패배: 웨이브 ${wave}에서 성벽이 무너짐. 타워 ${towers}기.`;
  return [
    { role: "system", content: "너는 타워 디펜스 게임 '산성 방어'의 해설자다. 주어진 숫자만 근거로 한국어 한 문장(40자 안팎)으로 재치 있게 해설한다. 숫자를 지어내지 말고, 따옴표·이모지·줄바꿈 없이 문장만 쓴다." },
    { role: "user", content: result },
  ];
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json({ error: "POST로만 요청할 수 있습니다." }, { status: 405, headers: { Allow: "POST" } });
    }

    let result;
    try {
      result = readResult(await request.json());
    } catch {
      result = null;
    }
    if (!result) {
      return Response.json({ error: "게임 결과 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      return Response.json({ error: "서버에 키가 설정되지 않았습니다." }, { status: 500 });
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        // openrouter/free는 추론(생각) 모델로 연결될 수 있어 토큰을 넉넉히 주고 추론은 짧게 한다
        body: JSON.stringify({
          model: MODEL,
          messages: prompt(result),
          max_tokens: 2000,
          reasoning: { effort: "low", exclude: true },
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      const line = text.split("\n").map((s) => s.trim()).find(Boolean)?.slice(0, 120);
      if (!line) throw new Error("빈 응답");
      return Response.json({ line });
    } catch (err) {
      console.error(err.message); // 키는 기록하지 않는다
      return Response.json({ error: "AI 해설을 만들지 못했습니다." }, { status: 502 });
    }
  },
};
