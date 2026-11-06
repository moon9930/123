# 나만의 기술 노트

## 기술: 브라우저 위치 API (Geolocation)
- 근거 문서: MDN `Geolocation.getCurrentPosition()` · `GeolocationPositionError.code` · Geolocation API (2026.11.06 확인)
- 연습 파일: `learn/geo-example.html` (19줄)

### 개념 5개 (Claude 정리)
| # | 개념 | 쉬운 설명 |
|---|---|---|
| 1 | `navigator.geolocation.getCurrentPosition()` | 브라우저에게 지금 위치를 **한 번** 묻는다. 답을 바로 돌려주지 않고, 위치를 알아내면 넘겨 준 함수(콜백)를 나중에 부른다 → 기다리는 동안 "위치 확인 중…" 표시가 필요하다. |
| 2 | 위치 권한 | 처음 부르면 브라우저가 허용/차단 창을 띄운다. 페이지가 열리자마자가 아니라 **버튼을 눌렀을 때만** 부른다. |
| 3 | `pos.coords` | 성공하면 `pos.coords` 안에 `latitude`(위도) · `longitude`(경도) · `accuracy`(정확도, 미터)가 들어 있다. 우리 데이터의 `lat`/`lng`와 같은 방식이라 바로 거리 계산에 쓴다. |
| 4 | `err.code` 1·2·3 | 1 = 권한 거부(`PERMISSION_DENIED`) · 2 = 위치를 못 알아냄(`POSITION_UNAVAILABLE`) · 3 = 시간 초과(`TIMEOUT`). 어느 경우든 "구를 골라 주세요"로 안내한다 (완료 기준 2번). |
| 5 | 옵션 · 보안 주소 | `timeout`은 기본값이 무한대라 직접 정한다(우리는 5000ms). `enableHighAccuracy`는 기본 `false`, `maximumAge`는 기본 `0`. **https 주소와 localhost에서만** 동작한다. |

### 내 말 요약 (내가 직접 3줄)
1.
2.
3.

### 예측 후 실행 (④)
- 바꾼 값: `timeout: 5000` → `timeout: 0` (위치 허용 · 창원시청 좌표로 실행)
- 내 예측: (나) `실패: code 3`이 나온다
- 실제 결과: `timeout: 5000`은 `위도 35.22806 · 경도 128.68111 · 정확도 약 30m` / `timeout: 0`은 3번 모두 `실패: code 3 (Timeout expired)`
- 알게 된 점: 권한을 허용해도 제한 시간이 너무 짧으면 실패한다. 권한 문제(code 1)와 시간 문제(code 3)는 다르다. → PoC는 `timeout` 5000 + code 3이면 "다시 시도"와 구 선택을 보여 준다.

### 내가 낸 오류 (⑤)
- 넣은 실수: 10번째 줄 `pos.coords` → `pos.coord` (s 하나 빠짐)
- 증상: 화면이 "위치 확인 중…"에서 멈춤. 실패 함수도 안 불림 → 오류는 **콘솔에만** 보임
- 오류 문장: `TypeError: Cannot destructure property 'latitude' of 'pos.coord' as it is undefined. (geo-example.html:10:15)`
- 읽는 순서: ① 몇 번째 줄(10번) → ② 무엇이 undefined인지(`pos.coord`) → ③ 왜 없는지(이름 오타)
- 고친 방법 한 줄 (내가 직접):
