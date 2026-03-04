/* ============================================================================
 * Type Definitions
 * ============================================================================ */

export interface SkyParams {
	r: number; // 배경 하늘색 R 채널 (0~1)
	g: number; // 배경 하늘색 G 채널 (0~1)
	b: number; // 배경 하늘색 B 채널 (0~1)
	ambientIntensity: number; // 환경광 세기 (낮이 클수록 밝음)
	dirIntensity: number; // 방향광(태양/달) 세기
	exposure: number; // 렌더러 톤매핑 노출값 (낮=어두움)
	isNight: boolean; // 야간 여부 (skyProgress < 0.15 이면 true)
	dirColor: number; // 방향광 색상 (새벽=주황, 낮=흰빛, 밤=청회색)
	sunPos: { x: number; y: number; z: number } | null; // 태양 메시 월드 좌표 (지평선 아래이면 null)
	moonIntensity: number; // 달 포인트라이트 세기 (달이 높을수록 큰 값)
	skyProgress: number; // 낮 진행도 0(밤)~1(정오) — 색상 보간 기준
	sunUp: boolean; // 태양이 지평선 위에 있는지 여부
	moonUp: boolean; // 달이 지평선 위에 있는지 여부
	moonAngle: number; // 달의 호(arc) 각도 (라디안, 18시 기준 12시간 주기)
}

export type TimeMode = "morning" | "auto" | "night";
