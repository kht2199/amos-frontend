import type { BuildingInfo, SkyParams } from "./types";

/* ============================================================================
 * Data Definitions
 * ============================================================================ */

export const BLD_NAME_MAP: Record<string, string> = {
	M14A_B: "M14A/B",
	M10A: "M10A",
	M10B_R3: "M10B/R3",
	M10C: "M10C",
	M16A_B: "M16A/B",
	DRAM_WT: "DRAM_WT",
	P_T1: "P&T1",
	P_T4: "P&T4",
	P_T5: "P&T5",
};

export const BUILDING_DATA: Record<string, BuildingInfo> = {
	"M14A/B": {
		type: "DRAM 생산동",
		color: 0xecc94b,
		detail: "M14A/B FAB동\n1a/1b nm DRAM 생산\n최신 공정 라인\n8층(옥상)",
		specs: { floors: "8F", process: "1a/1b nm", size: "210m×160m" },
		processFlow: ["포토리소", "식각", "증착", "CMP", "이온주입"],
	},
	M10A: {
		type: "생산동",
		color: 0x63b3ed,
		detail: "M10A FAB동\nDRAM 생산",
		specs: { floors: "5F", process: "DRAM" },
		processFlow: ["웨이퍼투입", "생산공정", "검사", "이송"],
	},
	"M10B/R3": {
		type: "생산동",
		color: 0x63b3ed,
		detail: "M10B/R3 FAB동\nDRAM 생산",
		specs: { floors: "5F" },
		processFlow: ["웨이퍼투입", "생산공정", "검사", "이송"],
	},
	M10C: {
		type: "생산동",
		color: 0x63b3ed,
		detail: "M10C FAB동\nDRAM 생산",
		specs: { floors: "5F" },
		processFlow: ["웨이퍼투입", "생산공정", "검사", "이송"],
	},
	"M16A/B": {
		type: "DRAM 생산동",
		color: 0x48bb78,
		detail: "M16A/B FAB동\nAMHS 물류 시스템\n11층(옥상)",
		specs: { floors: "11F", logistics: "AMHS", size: "230m×120m" },
		processFlow: ["DRAM양산", "AMHS자동물류", "클린룸", "품질검증"],
	},
	DRAM_WT: {
		type: "웨이퍼 테스트",
		color: 0xe07098,
		detail: "DRAM 웨이퍼 테스트동",
		specs: { floors: "4F", role: "검사" },
		processFlow: ["프로브테스트", "전기특성", "수율판정", "불량마킹"],
	},
	"P&T1": {
		type: "패키지·테스트",
		color: 0xc4956a,
		detail: "P&T1 패키지 및 테스트동",
		specs: { floors: "3F" },
		processFlow: ["다이싱", "다이어태치", "와이어본딩", "몰딩", "최종테스트"],
	},
	"P&T4": {
		type: "패키지·테스트",
		color: 0xc4956a,
		detail: "P&T4 패키지 및 테스트동\n8층",
		specs: { floors: "8F", link: "M16 OHT" },
		processFlow: ["다이싱", "다이어태치", "와이어본딩", "몰딩", "최종테스트"],
	},
	"P&T5": {
		type: "패키지·테스트",
		color: 0xc4956a,
		detail: "P&T5 패키지 및 테스트동",
		specs: { floors: "4F" },
		processFlow: ["다이싱", "패키지조립", "품질검증", "출하대기"],
	},
};

export const BUILDING_NAMES = Object.keys(BUILDING_DATA);

/* ============================================================================
 * Sky & Lighting System
 * ============================================================================ */

export function getSkyParams(hours: number): SkyParams {
	// 태양 호(arc) 각도: 6시=0, 18시=π (반원 궤도)
	const sunAngle = ((hours - 6) / 12) * Math.PI;
	// 태양이 지평선 위에 있는 시간대 (5:30~18:30)
	const sunUp = hours >= 5.5 && hours <= 18.5;

	// skyProgress: 낮 밝기 진행도 (0=밤, 1=정오) — 색상·조명 보간의 기준값
	let skyProgress: number;
	if (hours >= 6 && hours <= 18) skyProgress = 1 - Math.abs(hours - 12) / 6;
	else skyProgress = 0;
	// 새벽(5~6시): 0에서 0.3까지 서서히 증가
	if (hours >= 5 && hours < 6) skyProgress = (hours - 5) * 0.3;
	// 황혼(18~19시): 0.3에서 0으로 서서히 감소
	if (hours > 18 && hours <= 19) skyProgress = (19 - hours) * 0.3;

	// 밤하늘 기저색 (진한 남색)
	const nightR = 0x05 / 255,
		nightG = 0x06 / 255,
		nightB = 0x10 / 255;
	// 낮하늘 기저색 (맑은 하늘색)
	const dayR = 0x55 / 255,
		dayG = 0x99 / 255,
		dayB = 0xdd / 255;
	// 새벽/황혼 기저색 (붉은 노을색)
	const dawnR = 0x88 / 255,
		dawnG = 0x44 / 255,
		dawnB = 0x33 / 255;
	let r: number, g: number, b: number;
	if (skyProgress > 0.3) {
		// 낮 구간: 낮 색과 밤 색을 t 비율로 선형 보간
		const t = (skyProgress - 0.3) / 0.7;
		r = dayR * t + nightR * (1 - t);
		g = dayG * t + nightG * (1 - t);
		b = dayB * t + nightB * (1 - t);
	} else if (skyProgress > 0) {
		// 새벽/황혼 구간: 노을 색과 밤 색을 선형 보간
		const t = skyProgress / 0.3;
		r = dawnR * t + nightR * (1 - t);
		g = dawnG * t + nightG * (1 - t);
		b = dawnB * t + nightB * (1 - t);
	} else {
		// 완전한 밤: 기저 밤 색 그대로 사용
		r = nightR;
		g = nightG;
		b = nightB;
	}

	// 환경광·방향광 세기와 톤매핑 노출값을 skyProgress에 따라 선형 보간
	const ambientIntensity = 0.8 + (1.5 - 0.8) * skyProgress;
	const dirIntensity = 0.5 + (1.8 - 0.5) * skyProgress;
	const exposure = 1.2 + skyProgress * 0.6;
	// skyProgress가 0.15 미만이면 야간으로 판정 (창문 발광 전환 기준)
	const isNight = skyProgress < 0.15;
	// 태양이 뜬 낮에는 흰빛/주황, 밤에는 청회색 방향광
	const dirColor = sunUp ? (skyProgress > 0.3 ? 0xffeedd : 0xff8844) : 0x334466;

	// 태양 메시 위치 계산: sunAngle 반원 궤도, y는 0.7 스케일로 납작하게
	let sunPos: { x: number; y: number; z: number } | null = null;
	if (sunUp) {
		const sx = 35 + 800 * Math.cos(sunAngle);
		const sy = 800 * Math.sin(sunAngle) * 0.7;
		sunPos = { x: sx, y: Math.max(sy, -20), z: 170 - 200 };
	}

	// 달은 18시를 기점으로 12시간 주기 호 궤도
	const moonAngle = (((hours - 18 + 24) % 24) / 12) * Math.PI;
	// 달이 뜨는 시간대 (17:30~익일 6:30)
	const moonUp = hours >= 17.5 || hours <= 6.5;
	let moonIntensity = 0;
	if (moonUp) {
		// 달 고도(my)에 비례해 포인트라이트 세기를 결정
		const my = 800 * Math.sin(moonAngle) * 0.6;
		moonIntensity = (2.5 * Math.max(0, my)) / (800 * 0.6);
	}

	return {
		r,
		g,
		b,
		ambientIntensity,
		dirIntensity,
		exposure,
		isNight,
		dirColor,
		sunPos,
		moonIntensity,
		skyProgress,
		sunUp,
		moonUp,
		moonAngle,
	};
}
