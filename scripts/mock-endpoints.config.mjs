/**
 * Mock 데이터 fetch 설정
 *
 * - file: 저장할 파일명 (src/mocks/data/{file})
 * - path: API 경로. 경로 파라미터는 :paramName 형식으로 작성
 * - pathParams: 경로 파라미터 값 (선택)
 * - queryParams: 쿼리 파라미터 값 (선택)
 *
 * 예시:
 *   {
 *     file: "icheon-metrics.json",
 *     path: "/api/v1/sites/:siteId/metrics",
 *     pathParams: { siteId: "icheon" },
 *     queryParams: { from: "2026-03-01", to: "2026-03-20" },
 *   }
 */
export const ENDPOINTS = [];
