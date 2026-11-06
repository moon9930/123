-- 창원 자전거 대여소·보관소 테이블 (data/stations_utf8.csv와 열 이름이 같다)
-- RLS를 켜고 정책(policy)을 만들지 않는다 → 화면(anon)에서는 읽을 수 없고,
-- 서버 함수(api/places.js)가 Secret key로만 읽는다.
--
-- 한 행 = 한 장소. 누비자 터미널과 50m 안에서 겹치는 보관소는 그 터미널 행에 합쳤다(racks).

create table if not exists public.bike_places (
  id           text primary key,                                    -- nubija-번호 / 보관소 관리번호 / rental-…
  type         text not null check (type in ('rental', 'storage')), -- 대여소 / 보관소만
  service      text,                                                -- 'nubija' (누비자 터미널) / 빈 값
  name         text not null,                                       -- 이름
  address      text,                                                -- 주소
  gu           text not null,                                       -- 의창구 · 성산구 · 진해구 · 마산회원구 · 마산합포구
  lat          double precision not null,                           -- 위도 (WGS84)
  lng          double precision not null,                           -- 경도 (WGS84)
  racks        integer,                                             -- 자전거 보관대 수 (창원시 보관소 자료)
  bikes        integer,                                             -- 보유 자전거 수 (낙동강 무료대여소만)
  terminal_no  text,                                                -- 누비자 터미널 번호
  data_date    date,                                                -- 데이터 기준일
  open_time    text,                                                -- 운영 시작 (예: 10:00)
  close_time   text,                                                -- 운영 종료 (예: 17:00)
  closed_days  text,                                                -- 휴무 (예: 11월 ~ 3월)
  fee          text                                                 -- 요금 (예: 무료)
);

alter table public.bike_places enable row level security;

create index if not exists bike_places_gu_idx on public.bike_places (gu);
