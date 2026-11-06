-- 창원 자전거 보관소·대여소 테이블 (data/stations_utf8.csv와 열 이름이 같다)
-- RLS를 켜고 정책(policy)을 만들지 않는다 → 화면(anon)에서는 읽을 수 없고,
-- 서버 함수(api/places.js)가 Secret key로만 읽는다.

create table if not exists public.bike_places (
  id            text primary key,                                   -- 관리번호 (대여소는 rental-…)
  type          text not null check (type in ('storage', 'rental')), -- 보관소 / 대여소
  name          text not null,                                      -- 이름
  road_address  text,                                               -- 도로명주소
  jibun_address text,                                               -- 지번주소
  gu            text not null,                                      -- 구 (의창구 · 성산구 · 진해구 · 마산회원구 · 마산합포구)
  lat           double precision not null,                          -- 위도 (WGS84)
  lng           double precision not null,                          -- 경도 (WGS84)
  capacity      integer,                                            -- 보관소: 보관대수 / 대여소: 보유 자전거 수
  install_year  integer,                                            -- 설치연도 (보관소)
  data_date     date,                                               -- 데이터 기준일
  open_time     text,                                               -- 운영 시작 (대여소, 예: 10:00)
  close_time    text,                                               -- 운영 종료 (대여소, 예: 17:00)
  closed_days   text,                                               -- 휴무 (대여소, 예: 11월 ~ 3월)
  fee           text                                                -- 요금 (대여소, 예: 무료)
);

alter table public.bike_places enable row level security;

create index if not exists bike_places_gu_idx on public.bike_places (gu);
