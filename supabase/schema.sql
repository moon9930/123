-- 창원 한파쉼터 테이블
-- RLS를 켜고 정책(policy)을 만들지 않는다 → 화면(anon)에서는 읽을 수 없고,
-- 서버 함수(api/)가 Secret key로만 읽는다.

create table if not exists public.shelters (
  id           bigint generated always as identity primary key,
  name         text not null,          -- 쉼터명칭
  dong         text not null,          -- 행정동
  road_address text,                   -- 도로명주소
  lot_address  text,                   -- 지번주소
  area_m2      numeric,                -- 면적
  capacity     integer,                -- 이용가능 인원
  base_days    text,                   -- 기본 운영 요일
  base_hours   text,                   -- 기본 운영 시간
  ext_days     text,                   -- 연장 운영 요일
  ext_hours    text,                   -- 연장 운영 시간
  add_days     text,                   -- 추가 운영 요일
  add_hours    text,                   -- 추가 운영 시간
  data_date    date                    -- 데이터 기준일
);

alter table public.shelters enable row level security;

create index if not exists shelters_dong_idx on public.shelters (dong);
