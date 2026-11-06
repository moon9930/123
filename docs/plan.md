# 첫 버전 계획 (Plan 결과)

PRD.md(v2)의 핵심 시나리오가 처음부터 끝까지 돌아가는 데 꼭 필요한 것만 계획했습니다.
작성일: 2026.11.06

## 화면 (1개)

| 화면 | 사용자가 하는 일 |
|---|---|
| 찾기 (`index.html`) | ① "내 위치로 찾기" 또는 ② 구(5개) 선택 → 목록 확인 → "지도에서 보기" → 맨 아래 기준일·출처 확인 |

목록 카드
- **[보관소]** 이름 · 도로명 주소 · 보관대수 · 거리
- **[대여소]** 이름 · 지번 주소 · 보유 자전거 수 · 운영시간 · 요금 · 거리 · 11월~3월이면 "휴무 기간" 표시
- "지도에서 보기": 카카오맵 링크 `https://map.kakao.com/link/map/이름,위도,경도` (키 필요 없음)
- `capacity`는 보관소 = "보관대수", 대여소 = "보유 자전거"로 이름을 다르게 표시

## 데이터 흐름

```
data/stations_utf8.csv → Supabase bike_places 테이블 (RLS 켬)
   → api/places.js?lat=…&lng=…  (가까운 10곳, 거리순)
   → api/places.js?gu=성산구    (그 구 전체)
   → 화면
```

- **Supabase에 넣는 이유**: 연 1회 수준으로 바뀌는 CSV라 API를 매번 부를 필요가 없다. 누비자 대여소를 받으면 같은 테이블에 `type = rental` 행만 추가하면 된다.
- **거리 계산은 서버 함수에서**: 477곳뿐이라 전부 읽어 거리를 재고 가까운 10곳을 고른다 (`lib/distance.js`).
- **대여소 휴무 기간 판단도 서버 함수에서** 한국 시간 기준으로 (`lib/rental-status.js`).
- 화면은 Supabase를 직접 부르지 않는다. `SUPABASE_SECRET_KEY`는 서버 함수에서만 쓴다.

## 파일 구성

| 파일 | 할 일 |
|---|---|
| `index.html` | 한파쉼터 화면을 덮어써서 새 화면 |
| `api/places.js` | 새로 만듦 (위치 또는 구 → 목록) |
| `lib/distance.js` · `lib/rental-status.js` | 새로 만듦 |
| `supabase/schema.sql` | `bike_places` 테이블로 덮어씀 |
| `dev.js` | `.env`가 없으면 `data/stations_utf8.csv`로 바로 실행되게 수정 |
| `api/shelters.js` · `lib/hours.js` | 한파쉼터용이라 삭제 |
| `README.md` · `docs/todo.md` | 자전거 프로젝트 내용으로 다시 씀 |

건드리지 않는 파일: `tower-defense.html` · `lotto.html` · `api/commentary.js` (따로 만든 게임 파일)

## AI 기능
핵심 시나리오에 없음 → 넣지 않는다.

## 나중에 (핵심 시나리오 밖)
- 보관소/대여소 종류 필터
- 화면 안 지도에 마커 표시
- 누비자 대여소 추가 (터미널 위치 파일 확보 후)
- 실시간 대여 가능 대수 (API 확인 필요)
- 많이 이용하는 대여소 표시 (2018 이용 기록 + 터미널 위치 필요)
- AI 안내 문구 (데이터 근거로만)

## ⭐ 처음 볼 가능성이 큰 기술: 브라우저 위치 API (Geolocation)
- `navigator.geolocation`으로 휴대폰의 현재 위도·경도를 받는다.
- https 주소에서만 동작한다 (localhost · Vercel 주소는 괜찮음).
- 사용자가 위치를 거부하는 경우를 반드시 처리한다 → 완료 기준 2번(구 선택)이 그 대비책.
- → 3단계 학습 루프에서 이 기술을 배운다.
