# CLAUDE.md

## 작업 규칙
- 답변은 한국어로, 초보자가 이해할 수 있게 설명한다.
- 파일을 수정한 뒤에는 무엇을 바꿨고 내가 무엇을 확인하면 되는지 알려준다.
- 기능은 PRD.md(v2)의 핵심 시나리오 안에서만 만든다. 밖의 기능은 docs/todo.md로.
- 키는 .env와 Vercel 환경 변수에만 둔다. 화면 코드·채팅·GitHub에 키를 쓰지 않는다.
- 화면은 데이터를 직접 부르지 않는다: 화면 → api/ → Supabase.
- 실패 항목은 한 번에 하나만 고친다.

## 프로젝트
- 창원 한파쉼터 찾기: 행정동 → 지금 운영 중인 쉼터 목록
- 구조: index.html · api/shelters.js · lib/hours.js · supabase/schema.sql · data/
- 문서: PRD.md · docs/plan.md · docs/learning.md · docs/poc.md · docs/todo.md
