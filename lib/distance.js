// 두 지점(위도·경도) 사이의 거리를 미터로 계산한다 (하버사인 공식, 지구 반지름 6,371km).
// 창원 안 거리(수십 km 이내)에서는 오차가 몇 m 수준이라 목록 정렬에 충분하다.
const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}
