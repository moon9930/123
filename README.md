# 창원 한파쉼터 찾기 · 3주차 PoC

행정동을 고르면 지금 이 시각에 운영 중인 한파쉼터를 보여 줍니다.

## 실행 순서
1. Supabase SQL Editor에서 `supabase/schema.sql` 실행 (RLS 켬)
2. Table Editor → shelters → Insert → Import data from CSV → `data/shelters_sample.csv` (원본을 받으면 교체)
3. "테이블 행 수가 원본 파일 행 수와 같은지 확인해줘"
4. `.env.example`을 복사해 `.env`를 만들고 메모장으로 키 입력
5. GitHub에 올리기 (`.env` 제외 · `.gitignore` 확인)
6. vercel.com → Add New… → Project → 저장소 Import → Environment Variables에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY` → Deploy
7. 휴대폰으로 배포 주소를 열어 핵심 시나리오 한 번 해 보기

## 막히면
| 증상 | 확인 |
|---|---|
| 404 | `index.html`이 저장소 맨 위에 있는지 |
| 목록이 안 나옴 · 500 | Vercel Logs의 오류 문장을 Claude에게 그대로 전달 · 환경 변수 이름 |
| 환경 변수를 나중에 넣음 | Deployments → 최신 배포 ⋯ → Redeploy |
| "운영 시간 확인 필요"가 많음 | 원본 시간 표기 형식 확인 → `lib/hours.js`에 형식 추가 |

## 제출 전 보안 점검
저장소 어디에도 `.env`, Supabase Secret key, 공공데이터 인증키, OpenRouter 키가 없어야 합니다.
