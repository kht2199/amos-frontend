/* ============================================================================
 * Type Definitions
 * ============================================================================ */

export interface BuildingSpec {
	floors?: string; // 건물 층수
	process?: string; // 반도체 공정 종류 (예: "1a/1b nm")
	size?: string; // 건물 평면 크기 (가로×세로)
	logistics?: string; // 물류 시스템 유형 (예: AMHS)
	role?: string; // 건물의 역할 또는 기능
	link?: string; // 연결된 설비/시스템 (예: M16 OHT)
}

export interface BuildingInfo {
	type: string; // 건물 종류 레이블 (예: "DRAM 생산동")
	color: number; // 라벨/스프라이트에 사용될 hex 색상값
	detail: string; // 툴팁 패널에 표시할 상세 설명 (줄바꿈 포함)
	specs: BuildingSpec; // 건물 세부 사양 키-값 쌍
	processFlow: string[]; // 공정 순서 배열 (패널 하단에 화살표로 표시)
}

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
