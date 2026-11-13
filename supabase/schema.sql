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

-- 창원 급경사지 (data/slopes_changwon_utf8.csv · 경상남도 급경사지 현황 API에서 창원시만)
-- 자전거길 오르막이 아니라 붕괴 위험 비탈면이다. 좌표는 소수 3자리(약 100m 오차).
create table if not exists public.bike_slopes (
  gid            text primary key,   -- 순번
  district_name  text,               -- 지구명
  management     text,               -- 관리주체
  slope_type     text,               -- 종류 (도로 · 주택 · 철도 …)
  slope_category text,               -- 유형 (인공 · 자연 …)
  slope_rescue   text,               -- 구조 (석축 · 옹벽 · 토사 …)
  rating         text,               -- 등급 (A · B · C)
  designation    text,               -- 지정여부 (여 · 부)
  slope_length   integer,            -- 길이 (m)
  slope_height   integer,            -- 높이 (m)
  slope_angle    integer,            -- 경사 (°)
  addrs          text,               -- 주소
  gu             text,               -- 구
  lat            double precision,   -- 위도
  lng            double precision    -- 경도
);
alter table public.bike_slopes enable row level security;

-- 창원 자전거도로 (data/bike_roads_utf8.csv · 좌표가 없어 구별 목록으로만 보여 준다)
create table if not exists public.bike_roads (
  id          text primary key,      -- road-번호
  name        text not null,         -- 노선명
  road_type   text,                  -- 자전거전용도로 · 전용차로 · 보행자겸용도로
  start_addr  text,                  -- 기점 주소
  end_addr    text,                  -- 종점 주소
  gu_start    text,                  -- 기점 구
  gu_end      text,                  -- 종점 구
  length_km   numeric,               -- 총길이 (km)
  width_m     numeric,               -- 자전거도로 너비 (m)
  two_way     boolean,               -- 원본에 양방향 2줄로 있던 구간
  data_date   date                   -- 데이터 기준일
);
alter table public.bike_roads enable row level security;
