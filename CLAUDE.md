# CLAUDE.md

## 작업 규칙
- 답변은 한국어로, 초보자가 이해할 수 있게 설명한다.
- 파일을 수정한 뒤에는 무엇을 바꿨고 내가 무엇을 확인하면 되는지 알려준다.
- 기능은 PRD.md(v2)의 핵심 시나리오 안에서만 만든다. 밖의 기능은 docs/todo.md로.
- 키는 .env와 Vercel 환경 변수에만 둔다. 화면 코드·채팅·GitHub에 키를 쓰지 않는다.
- 화면은 데이터를 직접 부르지 않는다: 화면 → api/ → Supabase.
- 실패 항목은 한 번에 하나만 고친다.

## 프로젝트
- 창원 자전거 대여소·보관소 찾기: 내 위치(또는 구 선택) → 가까운 대여소·보관소 거리순 목록
- 데이터 477곳: 누비자 터미널 454 (그중 261곳은 50m 안 보관소를 합침) + 보관소만 22 + 기타 대여소 1
- 데이터: data/stations_utf8.csv (원본 3개 · 합친 규칙은 data/README.md, 원본 수정 금지)
- 구조: index.html · api/places.js · lib/distance.js · lib/rental-status.js · supabase/schema.sql · data/
- 따로 만든 게임(PRD 밖, 건드리지 않음): tower-defense.html · lotto.html · api/commentary.js
- 문서: PRD.md · docs/plan.md · docs/learning.md · docs/poc.md · docs/todo.md
