# 창원 자전거 보관소·대여소 찾기 · 3주차 PoC

내 위치(또는 구)를 고르면 가까운 자전거 보관소·대여소를 거리순으로 보여 줍니다.
지금 데이터: 477곳 = 누비자 터미널 454 (그중 261곳은 같은 자리 보관소 합침) + 보관소만 22 + 기타 대여소 1

## 내 PC에서 실행
```
npm run dev
```
→ http://localhost:3000 · `.env`에 Supabase 키가 없으면 `data/stations_utf8.csv`로 바로 돌아갑니다.

## 배포 순서
1. Supabase SQL Editor에서 `supabase/schema.sql` 실행 (RLS 켬)
2. Table Editor → bike_places → Insert → Import data from CSV → `data/stations_utf8.csv`
3. "테이블 행 수가 stations_utf8.csv 행 수(477)와 같은지 확인해줘"
4. `.env.example`을 복사해 `.env`를 만들고 메모장으로 `SUPABASE_URL`, `SUPABASE_SECRET_KEY` 입력
5. GitHub에 올리기 (`.env` 제외 · `.gitignore` 확인)
6. vercel.com → Add New… → Project → 저장소 Import → Environment Variables에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY` → Deploy
7. 휴대폰으로 배포 주소(https)를 열어 "내 위치로 찾기" 한 번 해 보기

## 구조
| 파일 | 역할 |
|---|---|
| `index.html` | 화면 (위치 버튼 · 구 선택 · 목록 · 출처) |
| `api/places.js` | 위치 → 가까운 10곳 / 구 → 전체 / 구 목록·기준일 |
| `lib/distance.js` | 두 지점 사이 거리(m) |
| `lib/rental-status.js` | 대여소 휴무 기간·운영 시간 판단 (한국 시간) |
| `supabase/schema.sql` | bike_places 테이블 · RLS |
| `data/` | 원본 3개 · 합친 사본 `stations_utf8.csv` (합친 규칙은 data/README.md) |

## 막히면
| 증상 | 확인 |
|---|---|
| 404 | `index.html`이 저장소 맨 위에 있는지 |
| 목록이 안 나옴 · 500 | Vercel Logs의 오류 문장을 Claude에게 그대로 전달 · 환경 변수 이름 |
| 환경 변수를 나중에 넣음 | Deployments → 최신 배포 ⋯ → Redeploy |
| "위치 사용이 허용되지 않았어요" | 브라우저 주소창 자물쇠 → 위치 허용 · https 주소인지 확인 |

## 제출 전 보안 점검
저장소 어디에도 `.env`, Supabase Secret key, 공공데이터 인증키, OpenRouter 키가 없어야 합니다.
