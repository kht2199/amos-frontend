import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadGLTF } from "../lib/loaders";

/* ============================================================================
 * Type Definitions
 * ============================================================================ */

interface BuildingSpec {
	floors?: string; // 건물 층수
	process?: string; // 반도체 공정 종류 (예: "1a/1b nm")
	size?: string; // 건물 평면 크기 (가로×세로)
	logistics?: string; // 물류 시스템 유형 (예: AMHS)
	role?: string; // 건물의 역할 또는 기능
	link?: string; // 연결된 설비/시스템 (예: M16 OHT)
}

interface BuildingInfo {
	type: string; // 건물 종류 레이블 (예: "DRAM 생산동")
	color: number; // 라벨/스프라이트에 사용될 hex 색상값
	detail: string; // 툴팁 패널에 표시할 상세 설명 (줄바꿈 포함)
	specs: BuildingSpec; // 건물 세부 사양 키-값 쌍
	processFlow: string[]; // 공정 순서 배열 (패널 하단에 화살표로 표시)
}

interface SkyParams {
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

type TimeMode = "morning" | "auto" | "night";

/* ============================================================================
 * Data Definitions
 * ============================================================================ */

const BLD_NAME_MAP: Record<string, string> = {
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

const BUILDING_DATA: Record<string, BuildingInfo> = {
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

const BUILDING_NAMES = Object.keys(BUILDING_DATA);

/* ============================================================================
 * Sky & Lighting System
 * ============================================================================ */
function getSkyParams(hours: number): SkyParams {
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

/* ============================================================================
 * Camera Constants
 * ============================================================================ */
const CAM_POS = new THREE.Vector3(35, 210, 500);
const CAM_TARGET = new THREE.Vector3(35, 0, 170);
const DEG15 = (15 * Math.PI) / 180;
const INIT_PHI = 1.04;

/* ============================================================================
 * Main Component
 * ============================================================================ */
export default function Campus3D() {
	const mountRef = useRef<HTMLDivElement>(null);
	const animFrameRef = useRef<number | null>(null);
	const startTimeRef = useRef<number>(Date.now());
	const lightsRef = useRef<{
		ambient?: THREE.AmbientLight;
		dirLight?: THREE.DirectionalLight;
		hemi?: THREE.HemisphereLight;
	}>({});
	const sunMeshRef = useRef<THREE.Mesh | null>(null);
	const moonMeshRef = useRef<THREE.Mesh | null>(null);
	const buildingGroupsRef = useRef<Record<string, THREE.Object3D>>({});
	const busesRef = useRef<THREE.Object3D[]>([]);
	const warningsRef = useRef<THREE.Mesh[]>([]);
	const windowsRef = useRef<THREE.Mesh[]>([]);
	const smokesRef = useRef<THREE.Points[]>([]);
	const controlsRef = useRef<OrbitControls | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

	const [timeMode, setTimeMode] = useState<TimeMode>("morning");
	const timeModeRef = useRef<TimeMode>("morning");
	const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
	const [panelData, setPanelData] = useState<BuildingInfo | null>(null);
	const [panelPos, setPanelPos] = useState<{ x: number; y: number }>({
		x: 0,
		y: 0,
	});
	const [loading, setLoading] = useState<boolean>(true);
	const [loadProgress, setLoadProgress] = useState<number>(0);
	const [focusBuilding, setFocusBuilding] = useState<string>("");

	useEffect(() => {
		timeModeRef.current = timeMode;
	}, [timeMode]);

	const handleBuildingClick = useCallback((name: string) => {
		const data = BUILDING_DATA[name];
		if (data) {
			setSelectedBuilding(name);
			setPanelData(data);
		}
	}, []);

	const closePanel = useCallback(() => {
		setSelectedBuilding(null);
		setPanelData(null);
	}, []);

	const handleFocusBuilding = useCallback(
		(name: string) => {
			setFocusBuilding(name);
			if (!name || !controlsRef.current || !buildingGroupsRef.current[name])
				return;
			const group = buildingGroupsRef.current[name];
			const box = new THREE.Box3().setFromObject(group);
			const center = new THREE.Vector3();
			box.getCenter(center);
			controlsRef.current.target.copy(center);
			controlsRef.current.update();
			handleBuildingClick(name);
		},
		[handleBuildingClick],
	);

	useEffect(() => {
		if (!mountRef.current) return;
		const container = mountRef.current;
		const W = container.clientWidth,
			H = container.clientHeight;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x345384);
		scene.fog = new THREE.FogExp2(0x345384, 0.0006);

		const camera = new THREE.PerspectiveCamera(45, W / H, 1, 5000);
		camera.position.copy(CAM_POS);
		camera.lookAt(CAM_TARGET);
		cameraRef.current = camera;

		// ── 렌더러: ACES 필름 톤매핑 + PCF 소프트 그림자 활성화 ──
		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(W, H);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 고DPI 지원 (최대 2배)
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 부드러운 그림자 필터
		renderer.toneMapping = THREE.ACESFilmicToneMapping; // 영화적 색감 보정
		renderer.toneMappingExposure = 1.6;
		container.appendChild(renderer.domElement);
		rendererRef.current = renderer;

		// ── OrbitControls: 수직 회전각을 초기 phi ±15° 범위로 제한 ──
		const controls = new OrbitControls(camera, renderer.domElement);
		controls.target.copy(CAM_TARGET);
		controls.enableDamping = false;
		controls.rotateSpeed = 0.5;
		controls.minDistance = 150;
		controls.maxDistance = 700;
		// 초기 仰角(phi) 기준으로 상하 15° 이내만 허용
		controls.minPolarAngle = Math.max(0.1, INIT_PHI - DEG15);
		controls.maxPolarAngle = Math.min(Math.PI / 2 - 0.05, INIT_PHI + DEG15);
		controls.minAzimuthAngle = -Infinity; // 수평 방위각 제한 없음
		controls.maxAzimuthAngle = Infinity;
		controls.enablePan = false; // 패닝(이동) 비활성화
		controls.update();
		controlsRef.current = controls;
		// 카메라 스냅 단위: 5° 간격으로 각도를 반올림
		const ANGLE_STEP = (5 * Math.PI) / 180;

		// ── 조명 설정 ──
		// 환경광: 장면 전체를 균일하게 밝히는 기저 조명
		const ambient = new THREE.AmbientLight(0x8899bb, 1.4);
		scene.add(ambient);

		// 방향광: 태양 역할, 4096 해상도 그림자맵으로 선명한 그림자 생성
		const dirLight = new THREE.DirectionalLight(0xfff0dd, 2.2);
		dirLight.position.set(300, 500, 200);
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.set(4096, 4096); // 고해상도 그림자
		dirLight.shadow.camera.left = -600;
		dirLight.shadow.camera.right = 600;
		dirLight.shadow.camera.top = 600;
		dirLight.shadow.camera.bottom = -600;
		dirLight.shadow.camera.near = 0.5;
		dirLight.shadow.camera.far = 1500;
		dirLight.shadow.bias = -0.0005; // 그림자 자기 교차(acne) 방지
		dirLight.shadow.normalBias = 0.02; // 곡면 그림자 오프셋 보정
		scene.add(dirLight);

		// 반구광: 하늘(위)과 지면(아래)에서 오는 환경 반사광 시뮬레이션
		const hemi = new THREE.HemisphereLight(0xaaccee, 0x556677, 1.2);
		scene.add(hemi);

		// 포인트라이트: 중심부에 배치해 국소 반사 하이라이트 추가
		const pointLight = new THREE.PointLight(0x4488ff, 0.5, 600);
		pointLight.position.set(200, 150, 300);
		scene.add(pointLight);

		lightsRef.current = { ambient, dirLight, hemi };

		// ── 태양 메시: 코어(22) + 1차 글로우(35, 30%) + 2차 글로우(50, 12%) ──
		const sunMesh = new THREE.Mesh(
			new THREE.SphereGeometry(22, 32, 32),
			new THREE.MeshBasicMaterial({ color: 0xffee66 }),
		);
		const sunGlow = new THREE.Mesh(
			new THREE.SphereGeometry(35, 32, 32),
			new THREE.MeshBasicMaterial({
				color: 0xffcc33,
				transparent: true,
				opacity: 0.3, // 반투명 후광 1단계
			}),
		);
		sunMesh.add(sunGlow);
		const sunGlow2 = new THREE.Mesh(
			new THREE.SphereGeometry(50, 32, 32),
			new THREE.MeshBasicMaterial({
				color: 0xffaa22,
				transparent: true,
				opacity: 0.12, // 반투명 후광 2단계 (더 희미)
			}),
		);
		sunMesh.add(sunGlow2);
		scene.add(sunMesh);
		sunMeshRef.current = sunMesh;

		// ── 달 메시: 코어(20) + 글로우(30, 25%) + 내장 포인트라이트 ──
		const moonMesh = new THREE.Mesh(
			new THREE.SphereGeometry(20, 32, 32),
			new THREE.MeshBasicMaterial({ color: 0xfffff0 }),
		);
		const moonGlow = new THREE.Mesh(
			new THREE.SphereGeometry(30, 32, 32),
			new THREE.MeshBasicMaterial({
				color: 0xcceeff,
				transparent: true,
				opacity: 0.25,
			}),
		);
		moonMesh.add(moonGlow);
		// 달 메시에 포인트라이트를 자식으로 부착해 달 주변을 국소 조명
		const moonLight = new THREE.PointLight(0x8899cc, 0, 800);
		moonMesh.add(moonLight);
		scene.add(moonMesh);
		moonMeshRef.current = moonMesh;

		loadGLTF("/campus.gltf", (progress) => {
			if (progress.total > 0)
				setLoadProgress(Math.round((progress.loaded / progress.total) * 100));
		})
			.then((gltf) => {
				const model = gltf.scene;
				model.scale.set(0.9, 0.9, 0.9);

				// GLTF에 내장된 조명을 제거해 커스텀 조명만 사용
				const lightsToRemove: THREE.Object3D[] = [];
				model.traverse((child) => {
					if ((child as THREE.Light).isLight) lightsToRemove.push(child);
				});
				lightsToRemove.forEach((light) => {
					if (light.parent) light.parent.remove(light);
				});

				scene.add(model);

				const buildingGroups: Record<string, THREE.Object3D> = {};
				const buses: THREE.Object3D[] = [];
				const warnings: THREE.Mesh[] = [];
				const windows: THREE.Mesh[] = [];

				model.traverse((child) => {
					// userData.bld_name 이 있는 노드를 건물 그룹으로 등록
					if (child.userData?.bld_name) {
						const bldKey = child.userData.bld_name as string;
						// GLTF 내부 키를 표시용 이름(슬래시 포함)으로 변환
						const displayName = BLD_NAME_MAP[bldKey] ?? bldKey;
						buildingGroups[displayName] = child;
					}
					// 이름이 "Bus_"로 시작하는 오브젝트를 버스로 분류
					if (child.name?.startsWith("Bus_")) buses.push(child);
					if ((child as THREE.Mesh).isMesh) {
						const mesh = child as THREE.Mesh;
						mesh.castShadow = true;
						mesh.receiveShadow = true;
						if (mesh.material) {
							const mat = mesh.material as THREE.Material & { name?: string };
							const mname = (mat.name ?? "").toLowerCase();
							// 재질명이 "wm"으로 시작하면 창문 메시로 분류 (야간 발광 대상)
							if (mname.startsWith("wm")) windows.push(mesh);
							// 재질명이 "wrn"으로 시작하면 경고등 메시로 분류 (점멸 대상)
							if (mname.startsWith("wrn")) warnings.push(mesh);
						}
					}
				});

				model.updateMatrixWorld(true);
				// ── 경고등 위치마다 연기 파티클 시스템 생성 ──
				const smokeParticles: THREE.Points[] = [];
				warnings.forEach((warnMesh) => {
					const worldPos = new THREE.Vector3();
					warnMesh.getWorldPosition(worldPos); // 경고등의 월드 좌표 획득
					const smokeCount = 40;
					const positions = new Float32Array(smokeCount * 3);
					for (let i = 0; i < smokeCount; i++) {
						// 경고등 주변 ±1.5 범위에 파티클을 무작위 배치, 높이는 1~26 사이
						positions[i * 3] = worldPos.x + (Math.random() - 0.5) * 3;
						positions[i * 3 + 1] = worldPos.y + 1 + Math.random() * 25;
						positions[i * 3 + 2] = worldPos.z + (Math.random() - 0.5) * 3;
					}
					const geo = new THREE.BufferGeometry();
					geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
					const mat = new THREE.PointsMaterial({
						color: 0xcccccc,
						size: 4,
						transparent: true,
						opacity: 0.2,
						blending: THREE.AdditiveBlending, // 가산 혼합으로 연기 빛 표현
						depthWrite: false, // 뎁스 버퍼 쓰기 비활성화로 겹침 아티팩트 방지
					});
					const points = new THREE.Points(geo, mat);
					// 애니메이션 루프에서 참조할 연기 메타데이터 저장
					points.userData.smokeData = {
						baseX: worldPos.x,
						baseY: worldPos.y + 1,
						baseZ: worldPos.z,
						count: smokeCount,
						topRadius: 2.5, // 파티클이 리셋될 때 퍼지는 반경
					};
					scene.add(points);
					smokeParticles.push(points);
				});
				smokesRef.current = smokeParticles;

				// ── 건물별 라벨 스프라이트 생성 ──
				model.updateMatrixWorld(true);
				for (const [displayName, group] of Object.entries(buildingGroups)) {
					const data = BUILDING_DATA[displayName];
					if (!data) continue;

					const box = new THREE.Box3().setFromObject(group);
					const center = new THREE.Vector3();
					box.getCenter(center);
					const topY = box.max.y; // 건물 최상단 Y좌표 (스프라이트 기준점)
					const hexColor = `#${data.color.toString(16).padStart(6, "0")}`;

					// 캔버스에 건물명(굵게)과 유형(작게)을 그려 텍스처로 사용
					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");
					if (!ctx) continue;
					const fontSize = 32;
					const typeFontSize = 16;
					ctx.font = `bold ${fontSize}px 'Noto Sans KR', sans-serif`;
					const nameWidth = ctx.measureText(displayName).width;
					ctx.font = `${typeFontSize}px 'Noto Sans KR', sans-serif`;
					const typeWidth = ctx.measureText(data.type).width;
					// 캔버스 크기를 텍스트 너비에 맞게 동적으로 결정
					const cW = Math.max(nameWidth, typeWidth) + 40;
					const cH = fontSize + typeFontSize + 28;
					canvas.width = cW;
					canvas.height = cH;

					// 둥근 모서리(rr=10) 배경 사각형 그리기
					const rr = 10;
					ctx.fillStyle = "rgba(8,8,16,0.8)";
					ctx.beginPath();
					ctx.moveTo(rr, 0);
					ctx.lineTo(cW - rr, 0);
					ctx.quadraticCurveTo(cW, 0, cW, rr);
					ctx.lineTo(cW, cH - rr);
					ctx.quadraticCurveTo(cW, cH, cW - rr, cH);
					ctx.lineTo(rr, cH);
					ctx.quadraticCurveTo(0, cH, 0, cH - rr);
					ctx.lineTo(0, rr);
					ctx.quadraticCurveTo(0, 0, rr, 0);
					ctx.closePath();
					ctx.fill();

					// 건물 색상으로 하단 강조 바 그리기
					ctx.fillStyle = hexColor;
					ctx.fillRect(10, cH - 5, cW - 20, 3);

					ctx.font = `bold ${fontSize}px 'Noto Sans KR', sans-serif`;
					ctx.fillStyle = "#ffffff";
					ctx.textAlign = "center";
					ctx.textBaseline = "top";
					ctx.fillText(displayName, cW / 2, 8);

					ctx.font = `${typeFontSize}px 'Noto Sans KR', sans-serif`;
					ctx.fillStyle = hexColor;
					ctx.textAlign = "center";
					ctx.fillText(data.type, cW / 2, fontSize + 12);

					// 캔버스를 텍스처로 변환해 스프라이트 재질에 적용
					const tex = new THREE.CanvasTexture(canvas);
					tex.minFilter = THREE.LinearFilter; // 축소 시 선형 필터로 블러링 최소화
					const spriteMat = new THREE.SpriteMaterial({
						map: tex,
						transparent: true,
						depthTest: false, // 항상 최상위에 렌더링 (건물에 가려지지 않음)
					});
					const sprite = new THREE.Sprite(spriteMat);
					const spriteScale = 32;
					sprite.scale.set(spriteScale, spriteScale * (cH / cW), 1); // 캔버스 비율 유지
					sprite.position.set(center.x, topY + 3, center.z);
					sprite.renderOrder = 999; // 다른 오브젝트보다 나중에 렌더링해 앞에 표시
					scene.add(sprite);

					// 건물 꼭대기에서 스프라이트 하단까지 연결하는 짧은 수직 선
					const lineGeo = new THREE.BufferGeometry().setFromPoints([
						new THREE.Vector3(center.x, topY + 1, center.z),
						new THREE.Vector3(center.x, topY + 5, center.z),
					]);
					const lineMat = new THREE.LineBasicMaterial({
						color: data.color,
						transparent: true,
						opacity: 0.4,
					});
					const line = new THREE.Line(lineGeo, lineMat);
					scene.add(line);
				}

				buildingGroupsRef.current = buildingGroups;
				busesRef.current = buses;
				warningsRef.current = warnings;
				windowsRef.current = windows;
				setLoading(false);
			})
			.catch((error: unknown) => {
				console.error("GLTF Load Error:", error);
				setLoading(false);
			});

		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		// ── onClick: 레이캐스터로 클릭된 건물을 판별해 정보 패널 표시 ──
		function onClick(event: MouseEvent) {
			// 마우스 좌표를 NDC(-1~1) 공간으로 변환
			const rect = renderer.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			for (const [name, group] of Object.entries(buildingGroupsRef.current)) {
				const intersects = raycaster.intersectObjects(group.children, true);
				if (intersects.length > 0) {
					const data = BUILDING_DATA[name];
					if (data) {
						const box = new THREE.Box3().setFromObject(group);
						const center = new THREE.Vector3();
						box.getCenter(center);
						center.y = box.max.y; // 패널을 건물 상단 기준으로 배치
						// 3D 월드 좌표를 화면 2D 픽셀 좌표로 투영
						const screenPos = center.clone().project(camera);
						const sx = (screenPos.x * 0.5 + 0.5) * rect.width;
						const sy = (-screenPos.y * 0.5 + 0.5) * rect.height;
						setPanelPos({ x: sx, y: sy });
						setSelectedBuilding(name);
						setPanelData(data);
					}
					return; // 첫 번째 교차 건물에서 중단 (중복 선택 방지)
				}
			}
		}

		// ── onMouseMove: 건물 위에 마우스가 있으면 커서를 pointer로 변경 ──
		function onMouseMove(event: MouseEvent) {
			const rect = renderer.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			let found = false;
			for (const [, group] of Object.entries(buildingGroupsRef.current)) {
				if (raycaster.intersectObjects(group.children, true).length > 0) {
					renderer.domElement.style.cursor = "pointer"; // 건물 위: 손가락 커서
					found = true;
					break;
				}
			}
			if (!found) renderer.domElement.style.cursor = "default";
		}

		renderer.domElement.addEventListener("click", onClick);
		renderer.domElement.addEventListener("mousemove", onMouseMove);

		function animate() {
			animFrameRef.current = requestAnimationFrame(animate);
			const elapsed = Date.now() - startTimeRef.current; // 컴포넌트 마운트 후 경과 ms

			// timeMode에 따라 시뮬레이션할 시각(hours)을 결정
			let hours: number;
			const mode = timeModeRef.current;
			if (mode === "morning") hours = 10;
			else if (mode === "night") hours = 0;
			else {
				// "auto" 모드: 실제 현재 시각(시+분/60)을 사용
				const now = new Date();
				hours = now.getHours() + now.getMinutes() / 60;
			}

			const sky = getSkyParams(hours);
			(scene.background as THREE.Color).setRGB(sky.r, sky.g, sky.b);
			(scene.fog as THREE.FogExp2).color.setRGB(sky.r, sky.g, sky.b);
			if (lightsRef.current.ambient)
				lightsRef.current.ambient.intensity = sky.ambientIntensity;
			if (lightsRef.current.dirLight) {
				lightsRef.current.dirLight.intensity = sky.dirIntensity;
				lightsRef.current.dirLight.color.setHex(sky.dirColor);
			}
			renderer.toneMappingExposure = sky.exposure;

			// 태양 메시 위치 갱신 및 방향광을 태양 위치로 이동
			if (sky.sunPos && sunMeshRef.current) {
				sunMeshRef.current.position.set(
					sky.sunPos.x,
					sky.sunPos.y,
					sky.sunPos.z,
				);
				sunMeshRef.current.visible = true;
				// 방향광이 태양을 따라가도록 위치를 동기화
				if (sky.sunUp && lightsRef.current.dirLight)
					lightsRef.current.dirLight.position.copy(sunMeshRef.current.position);
			} else if (sunMeshRef.current) {
				sunMeshRef.current.visible = false;
				if (lightsRef.current.dirLight)
					lightsRef.current.dirLight.position.set(100, 300, 100); // 야간 기본 방향광 위치
			}

			// 달 메시 위치 갱신 및 내장 포인트라이트 세기 적용
			if (moonMeshRef.current) {
				if (sky.moonUp) {
					// 달도 반원 호 궤도로 이동 (태양과 반대 방향)
					const mx = 35 - 800 * Math.cos(sky.moonAngle);
					const my = 800 * Math.sin(sky.moonAngle) * 0.6;
					moonMeshRef.current.position.set(mx, Math.max(my, -20), 170 + 150);
					moonMeshRef.current.visible = true;
					const ml = moonMeshRef.current.children.find(
						(c): c is THREE.PointLight => (c as THREE.PointLight).isPointLight,
					);
					// 달 고도에 비례한 포인트라이트 세기 적용
					if (ml) ml.intensity = sky.moonIntensity;
				} else {
					moonMeshRef.current.visible = false;
				}
			}

			// ── 경고등 점멸: sin 파형으로 1.0 ↔ 0.1 emissiveIntensity 전환 ──
			warningsRef.current.forEach((mesh) => {
				if (mesh.material && "emissiveIntensity" in mesh.material) {
					// sin > 0 이면 밝게(1.0), 아니면 어둡게(0.1) — 약 524ms 주기
					const blink = Math.sin(elapsed * 0.006) > 0 ? 1.0 : 0.1;
					(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
						blink;
				}
			});

			// ── 연기 파티클 드리프트: 매 프레임마다 y를 올리고 상단 초과 시 리셋 ──
			smokesRef.current.forEach((smoke) => {
				const pos = smoke.geometry.attributes.position.array as Float32Array;
				const sd = smoke.userData.smokeData as {
					baseX: number;
					baseY: number;
					baseZ: number;
					count: number;
					topRadius: number;
				};
				for (let i = 0; i < sd.count; i++) {
					// x: 미세 무작위 + sin 흔들림으로 자연스러운 굽이짐 표현
					pos[i * 3] +=
						(Math.random() - 0.5) * 0.1 + Math.sin(elapsed * 0.0008 + i) * 0.04;
					pos[i * 3 + 1] += 0.1 + Math.random() * 0.06; // 위로 서서히 상승
					pos[i * 3 + 2] += (Math.random() - 0.5) * 0.08;
					// baseY + 25 높이를 초과하면 파티클을 기저 위치로 리셋
					if (pos[i * 3 + 1] > sd.baseY + 25) {
						pos[i * 3] = sd.baseX + (Math.random() - 0.5) * sd.topRadius * 2;
						pos[i * 3 + 1] = sd.baseY;
						pos[i * 3 + 2] =
							sd.baseZ + (Math.random() - 0.5) * sd.topRadius * 2;
					}
				}
				smoke.geometry.attributes.position.needsUpdate = true;
				// 연기 투명도를 sin 파형으로 0.1~0.2 사이에서 천천히 변동
				(smoke.material as THREE.PointsMaterial).opacity =
					0.15 + Math.sin(elapsed * 0.003) * 0.05;
			});

			// ── 버스 왕복 이동: _prog(0~1)를 _fwd 방향으로 증가시켜 x축 80 범위 왕복 ──
			busesRef.current.forEach((bus) => {
				if (!bus.userData._init) {
					// 최초 1회만 초기화: 시작 진행도·방향·속도·원점 x 저장
					bus.userData._init = true;
					bus.userData._prog = Math.random(); // 0~1 무작위 시작 위치
					bus.userData._fwd = Math.random() > 0.5 ? 1 : -1; // 초기 진행 방향
					bus.userData._spd = 0.5 + Math.random() * 0.5; // 개별 속도 변화
					bus.userData._ox = bus.position.x; // GLTF 원점 x 저장
				}
				bus.userData._prog += bus.userData._spd * 0.002 * bus.userData._fwd;
				if (bus.userData._prog >= 1) {
					bus.userData._prog = 1;
					bus.userData._fwd = -1; // 끝에 도달하면 방향 반전
				}
				if (bus.userData._prog <= 0) {
					bus.userData._prog = 0;
					bus.userData._fwd = 1; // 시작점에 도달하면 방향 반전
				}
				// _prog 0.5 기준 ±40 범위(총 80)로 x 위치 결정
				bus.position.x = bus.userData._ox + (bus.userData._prog - 0.5) * 80;
			});

			// ── 창문 재질 전환: 야간에는 노란 발광, 주간에는 파란 반투명 유리 ──
			windowsRef.current.forEach((mesh) => {
				if (!mesh.material) return;
				// 재질을 공유하지 않도록 최초 1회 클론 (다른 건물 창문과 분리)
				if (!mesh.userData._matCloned) {
					mesh.material = (
						mesh.material as THREE.Material
					).clone() as THREE.MeshStandardMaterial;
					mesh.userData._matCloned = true;
				}
				const mat = mesh.material as THREE.MeshStandardMaterial;
				if (sky.isNight) {
					mat.color.setHex(0xffdd88); // 야간: 따뜻한 주황빛 창문
					mat.emissive.setHex(0xffaa33);
					mat.emissiveIntensity = 1.5;
					mat.transparent = true;
					mat.opacity = 0.9;
					// 1% 확률로 emissiveIntensity를 랜덤 변동 → 창문 깜빡임 효과
					if (Math.random() < 0.01)
						mat.emissiveIntensity = 0.8 + Math.random() * 1.2;
				} else {
					mat.color.setHex(0x8ac4ed); // 주간: 하늘빛 반사 유리창
					mat.emissive.setHex(0x3388bb);
					mat.emissiveIntensity = 0.15;
					mat.transparent = true;
					mat.opacity = 0.5;
				}
			});

			controls.update();
			// ── 카메라 각도 스냅: 구면 좌표로 변환 후 5° 단위로 반올림 ──
			const offset = new THREE.Vector3().subVectors(
				camera.position,
				controls.target,
			);
			const sph = new THREE.Spherical().setFromVector3(offset);
			sph.theta = Math.round(sph.theta / ANGLE_STEP) * ANGLE_STEP; // 수평 방위각 스냅
			sph.phi = Math.round(sph.phi / ANGLE_STEP) * ANGLE_STEP; // 수직 앙각 스냅
			// 스냅 후에도 OrbitControls의 polar 제한 범위를 유지
			sph.phi = Math.max(
				controls.minPolarAngle,
				Math.min(controls.maxPolarAngle, sph.phi),
			);
			offset.setFromSpherical(sph);
			camera.position.copy(controls.target).add(offset);
			camera.lookAt(controls.target);

			renderer.render(scene, camera);
		}
		animate();

		function onResize() {
			const w = container.clientWidth,
				h = container.clientHeight;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
		}
		window.addEventListener("resize", onResize);

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				setSelectedBuilding(null);
				setPanelData(null);
			}
		}
		document.addEventListener("keydown", onKeyDown);

		return () => {
			window.removeEventListener("resize", onResize);
			document.removeEventListener("keydown", onKeyDown);
			renderer.domElement.removeEventListener("click", onClick);
			renderer.domElement.removeEventListener("mousemove", onMouseMove);
			if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
			scene.traverse((obj) => {
				const mesh = obj as THREE.Mesh;
				if (mesh.geometry) mesh.geometry.dispose();
				if (mesh.material) {
					if (Array.isArray(mesh.material))
						mesh.material.forEach((m) => {
							m.dispose();
						});
					else mesh.material.dispose();
				}
			});
			renderer.dispose();
			controls.dispose();
			if (container.contains(renderer.domElement))
				container.removeChild(renderer.domElement);
		};
	}, []);

	const timeModes: { value: TimeMode; label: string }[] = [
		{ value: "morning", label: "아침 (Morning)" },
		{ value: "auto", label: "실시간 (Realtime)" },
		{ value: "night", label: "밤 (Night)" },
	];

	return (
		<div style={{ width: "100%", height: "100%", position: "relative" }}>
			<div ref={mountRef} style={{ width: "100%", height: "100%" }} />

			{loading && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(10,10,20,0.95)",
						zIndex: 1000,
					}}
				>
					<div
						style={{
							fontSize: 13,
							color: "#888",
							letterSpacing: 3,
							marginBottom: 16,
						}}
					>
						Loading...
					</div>
					<div
						style={{
							width: 200,
							height: 4,
							background: "rgba(255,255,255,0.1)",
							borderRadius: 2,
						}}
					>
						<div
							style={{
								width: `${loadProgress}%`,
								height: "100%",
								background: "linear-gradient(90deg, #4af, #48bb78)",
								borderRadius: 2,
								transition: "width 0.3s",
							}}
						/>
					</div>
					<div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
						{loadProgress}%
					</div>
				</div>
			)}

			<div
				style={{
					position: "absolute",
					top: 20,
					left: 24,
					zIndex: 100,
					display: "flex",
					gap: 10,
				}}
			>
				<select
					value={timeMode}
					onChange={(e) => setTimeMode(e.target.value as TimeMode)}
					style={{
						background: "rgba(10,10,20,0.85)",
						color: "#ddd",
						border: "1px solid rgba(255,255,255,0.12)",
						borderRadius: 8,
						padding: "8px 14px",
						fontSize: 13,
						fontFamily: "'Noto Sans KR', sans-serif",
						backdropFilter: "blur(12px)",
						cursor: "pointer",
						outline: "none",
					}}
				>
					{timeModes.map((m) => (
						<option key={m.value} value={m.value}>
							{m.label}
						</option>
					))}
				</select>
				<select
					value={focusBuilding}
					onChange={(e) => handleFocusBuilding(e.target.value)}
					style={{
						background: "rgba(10,10,20,0.85)",
						color: "#ddd",
						border: "1px solid rgba(255,255,255,0.12)",
						borderRadius: 8,
						padding: "8px 14px",
						fontSize: 13,
						fontFamily: "'Noto Sans KR', sans-serif",
						backdropFilter: "blur(12px)",
						cursor: "pointer",
						outline: "none",
					}}
				>
					<option value="">건물 선택...</option>
					{BUILDING_NAMES.map((n) => (
						<option key={n} value={n}>
							{n}
						</option>
					))}
				</select>
			</div>

			<button
				type="button"
				onClick={() => {
					if (!controlsRef.current || !cameraRef.current) return;
					cameraRef.current.position.copy(CAM_POS);
					controlsRef.current.target.copy(CAM_TARGET);
					controlsRef.current.update();
					setFocusBuilding("");
				}}
				style={{
					position: "absolute",
					top: 20,
					right: 24,
					zIndex: 100,
					background: "rgba(10,10,20,0.85)",
					color: "#ddd",
					border: "1px solid rgba(255,255,255,0.12)",
					borderRadius: 8,
					padding: "8px 14px",
					fontSize: 13,
					fontFamily: "'Noto Sans KR', sans-serif",
					backdropFilter: "blur(12px)",
					cursor: "pointer",
					outline: "none",
				}}
			>
				&#8634; Reset
			</button>

			{selectedBuilding &&
				panelData &&
				(() => {
					const panelW = 300;
					const panelMaxH = 360;
					let px = panelPos.x + 100;
					let py = panelPos.y - 60;
					const vw = window.innerWidth,
						vh = window.innerHeight;
					if (px + panelW > vw - 10) px = panelPos.x - panelW - 20;
					if (py < 10) py = 10;
					if (py + panelMaxH > vh - 10) py = vh - panelMaxH - 10;
					return (
						<div
							style={{
								position: "absolute",
								left: px,
								top: py,
								zIndex: 100,
								width: panelW,
								maxHeight: panelMaxH,
								background: "rgba(10,10,20,0.92)",
								backdropFilter: "blur(20px)",
								border: "1px solid rgba(255,255,255,0.08)",
								borderRadius: 14,
								overflow: "hidden",
								animation: "slideIn 0.3s ease",
							}}
						>
							<div
								style={{
									padding: "14px 18px 10px",
									borderBottom: "1px solid rgba(255,255,255,0.06)",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "flex-start",
								}}
							>
								<div>
									<div
										style={{
											fontSize: 17,
											fontWeight: 800,
											color: "#fff",
											display: "flex",
											alignItems: "center",
											gap: 8,
											marginBottom: 3,
										}}
									>
										<span
											style={{
												display: "inline-block",
												width: 10,
												height: 10,
												borderRadius: 3,
												background: `#${panelData.color.toString(16).padStart(6, "0")}`,
											}}
										/>
										{selectedBuilding}
									</div>
									<div
										style={{
											fontSize: 10,
											color: "#888",
											letterSpacing: 2,
											textTransform: "uppercase",
										}}
									>
										{panelData.type}
									</div>
								</div>
								<button
									type="button"
									onClick={closePanel}
									style={{
										background: "rgba(255,255,255,0.06)",
										border: "none",
										color: "#999",
										fontSize: 14,
										cursor: "pointer",
										padding: "4px 8px",
										lineHeight: 1,
										borderRadius: 6,
										display: "flex",
										alignItems: "center",
										gap: 4,
									}}
								>
									&#10005; Close
								</button>
							</div>
							<div
								style={{
									padding: "12px 18px 16px",
									overflowY: "auto",
									maxHeight: "calc(100vh - 200px)",
								}}
							>
								<div
									style={{
										fontSize: 12,
										color: "#aaa",
										lineHeight: 1.6,
										marginBottom: 12,
										whiteSpace: "pre-line",
									}}
								>
									{panelData.detail}
								</div>
								{panelData.specs && (
									<div style={{ marginBottom: 12 }}>
										<div
											style={{
												fontSize: 10,
												color: "#666",
												letterSpacing: 2,
												textTransform: "uppercase",
												marginBottom: 6,
											}}
										>
											SPECIFICATIONS
										</div>
										<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
											{Object.entries(panelData.specs).map(([k, v]) => (
												<div
													key={k}
													style={{
														background: "rgba(255,255,255,0.04)",
														borderRadius: 6,
														padding: "4px 10px",
														fontSize: 11,
														color: "#bbb",
													}}
												>
													<span style={{ color: "#666", marginRight: 4 }}>
														{k}:
													</span>
													<span style={{ color: "#ddd" }}>{v}</span>
												</div>
											))}
										</div>
									</div>
								)}
								{panelData.processFlow && (
									<div>
										<div
											style={{
												fontSize: 10,
												color: "#666",
												letterSpacing: 2,
												textTransform: "uppercase",
												marginBottom: 6,
											}}
										>
											PROCESS FLOW
										</div>
										<div
											style={{
												display: "flex",
												flexWrap: "wrap",
												gap: 4,
												alignItems: "center",
											}}
										>
											{panelData.processFlow.map((step, i) => (
												<span
													key={step}
													style={{
														display: "flex",
														alignItems: "center",
														gap: 4,
													}}
												>
													<span
														style={{
															background: `rgba(${(panelData.color >> 16) & 0xff}, ${(panelData.color >> 8) & 0xff}, ${panelData.color & 0xff}, 0.15)`,
															color: `#${panelData.color.toString(16).padStart(6, "0")}`,
															borderRadius: 4,
															padding: "3px 8px",
															fontSize: 11,
															fontWeight: 600,
														}}
													>
														{step}
													</span>
													{i < panelData.processFlow.length - 1 && (
														<span style={{ color: "#444", fontSize: 10 }}>
															→
														</span>
													)}
												</span>
											))}
										</div>
									</div>
								)}
							</div>
						</div>
					);
				})()}

			<style>{`
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        select option { background: #0a0a14; color: #ddd; }
      `}</style>
		</div>
	);
}
