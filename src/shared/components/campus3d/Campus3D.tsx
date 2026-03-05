import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import * as THREE from "three";
import { getSkyParams } from "./buildingData";
import type { TimeMode } from "./types";
import { useBuildingClick } from "./useBuildingClick";
import { useGLTFModel } from "./useGLTFModel";
import { ANGLE_STEP, CAM_POS, CAM_TARGET, useScene } from "./useScene";

/* ============================================================================
 * Campus3D — 메인 컴포넌트
 *
 * 씬 초기화(useScene), 모델 로드(useGLTFModel), 클릭 처리(useBuildingClick)를
 * 조합하고, 애니메이션 루프와 UI를 렌더링한다.
 * ============================================================================ */
export interface Campus3DRef {
	setWarningBuildings: (names: string[]) => void;
}

// 건물별 기본 정보 (클릭 팝업 + 상시 라벨에 사용)
const BUILDING_INFO: Record<
	string,
	{ title: string; desc: string; location: string }
> = {
	m14: {
		title: "M14 — Manufacturing Unit",
		desc: "Capacity: 240 lots/day · Status: Running",
		location: "Zone B, Bay 14",
	},
	m16: {
		title: "M16 — Assembly Line",
		desc: "Capacity: 180 lots/day · Status: Warning",
		location: "Zone C, Bay 16",
	},
};

const MM_SIZE = 180; // 미니맵 CSS px 크기
const MM_MARGIN = 12; // 우측 하단 여백
const MM_ORTHO_HALF = 500; // 미니맵 OrthographicCamera 절반 시야 (world units)

const Campus3D = forwardRef<Campus3DRef>(function Campus3D(_, ref) {
	const mountRef = useRef<HTMLDivElement>(null);
	const animFrameRef = useRef<number | null>(null);
	const startTimeRef = useRef<number>(Date.now());
	// 미니맵: OrthographicCamera (탑다운) + 2D canvas (카메라 funnel 오버레이)
	const minimapCameraRef = useRef<THREE.OrthographicCamera | null>(null);
	if (!minimapCameraRef.current) {
		const cam = new THREE.OrthographicCamera(
			-MM_ORTHO_HALF,
			MM_ORTHO_HALF,
			MM_ORTHO_HALF,
			-MM_ORTHO_HALF,
			1,
			2000,
		);
		cam.up.set(0, 0, 1);
		cam.position.set(CAM_TARGET.x, 800, CAM_TARGET.z);
		cam.lookAt(CAM_TARGET.x, 0, CAM_TARGET.z);
		minimapCameraRef.current = cam;
	}
	const minimap2dRef = useRef<HTMLCanvasElement>(null);
	// 상시 표시 건물 라벨: animate loop에서 직접 style 수정
	const buildingLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});
	// 건물 박스 캐시: 4개 XZ 코너 + 센터 (로드 완료 후 1회 계산)
	const buildingBoxesRef = useRef<
		Record<string, { corners: THREE.Vector3[]; center: THREE.Vector3 }>
	>({});
	// 카메라 XYZ 입력 DOM refs — 매 프레임 직접 value를 써서 리렌더 없이 갱신
	const camXRef = useRef<HTMLInputElement>(null);
	const camYRef = useRef<HTMLInputElement>(null);
	const camZRef = useRef<HTMLInputElement>(null);
	const camDRef = useRef<HTMLInputElement>(null); // 카메라 ~ 타겟 거리 (zoom)
	const tgtXRef = useRef<HTMLInputElement>(null); // 타겟 X
	const tgtYRef = useRef<HTMLInputElement>(null); // 타겟 Y
	const tgtZRef = useRef<HTMLInputElement>(null); // 타겟 Z
	// 입력창 포커스 중에는 각도 스냅을 끔 (직접 입력한 값을 유지하기 위해)
	const camInputFocusedRef = useRef(false);

	// ── 상태 ──
	const [warningSelection, setWarningSelection] = useState<string[]>([]);
	const [timeMode, setTimeMode] = useState<TimeMode>("morning");
	const timeModeRef = useRef<TimeMode>("morning");
	const [buildingPopup, setBuildingPopup] = useState<{
		name: string;
		x: number;
		y: number;
	} | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [loadProgress, setLoadProgress] = useState<number>(0);
	const [focusBuilding, setFocusBuilding] = useState<string>("");

	// timeMode가 바뀔 때마다 ref에도 반영 (애니메이션 루프에서 클로저 없이 읽기 위해)
	useEffect(() => {
		timeModeRef.current = timeMode;
	}, [timeMode]);

	// ── 하위 훅 ──
	const {
		sceneRef,
		cameraRef,
		rendererRef,
		controlsRef,
		lightsRef,
		sunMeshRef,
		moonMeshRef,
	} = useScene(mountRef);

	const {
		buildingGroupsRef,
		buildingNames,
		groundBox,
		warningsRef,
		windowsRef,
		smokesRef,
		warningMeshesRef,
		setWarningBuildings,
	} = useGLTFModel(sceneRef, setLoading, setLoadProgress);

	useImperativeHandle(ref, () => ({ setWarningBuildings }), [
		setWarningBuildings,
	]);

	// 건물 로드 완료 시 각 건물의 XZ 4개 코너 + 센터를 캐싱
	// biome-ignore lint/correctness/useExhaustiveDependencies: buildingGroupsRef is a stable ref
	useEffect(() => {
		const boxes: Record<
			string,
			{ corners: THREE.Vector3[]; center: THREE.Vector3 }
		> = {};
		for (const [name, group] of Object.entries(buildingGroupsRef.current)) {
			const box = new THREE.Box3().setFromObject(group);
			const center = new THREE.Vector3();
			box.getCenter(center);
			const y = center.y;
			boxes[name] = {
				corners: [
					new THREE.Vector3(box.min.x, y, box.min.z),
					new THREE.Vector3(box.max.x, y, box.min.z),
					new THREE.Vector3(box.max.x, y, box.max.z),
					new THREE.Vector3(box.min.x, y, box.max.z),
				],
				center,
			};
		}
		buildingBoxesRef.current = boxes;
	}, [buildingNames]);

	// Ground bounding box로 미니맵 OrthographicCamera frustum + 위치 동적 설정
	useEffect(() => {
		if (!groundBox || !minimapCameraRef.current) return;
		const center = new THREE.Vector3();
		groundBox.getCenter(center);
		const size = new THREE.Vector3();
		groundBox.getSize(size);
		const half = (Math.max(size.x, size.z) / 2) * 0.6; // 줌인 여백
		const cam = minimapCameraRef.current;
		cam.left = -half;
		cam.right = half;
		cam.top = half;
		cam.bottom = -half;
		cam.up.set(0, 0, 1);
		cam.position.set(center.x, 800, center.z);
		cam.lookAt(center.x, 0, center.z);
		cam.updateProjectionMatrix();
	}, [groundBox]);

	// 미니맵 클릭 → 클릭한 XZ 위치로 카메라 타겟 이동
	const minimapDraggingRef = useRef(false);

	const moveMinimapCamera = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			const mmCam = minimapCameraRef.current;
			if (!mmCam || !controlsRef.current || !cameraRef.current) return;
			const rect = e.currentTarget.getBoundingClientRect();
			const clickX = e.clientX - rect.left;
			const clickY = e.clientY - rect.top;
			const ndc = new THREE.Vector3(
				(clickX / MM_SIZE) * 2 - 1,
				-((clickY / MM_SIZE) * 2 - 1),
				0,
			);
			ndc.unproject(mmCam);
			const cam = cameraRef.current;
			const ctrl = controlsRef.current;
			const offset = new THREE.Vector3().subVectors(cam.position, ctrl.target);
			ctrl.target.set(ndc.x, ctrl.target.y, ndc.z);
			cam.position.copy(ctrl.target).add(offset);
			ctrl.update();
		},
		[cameraRef, controlsRef],
	);

	const handleMinimapMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			minimapDraggingRef.current = true;
			moveMinimapCamera(e);
		},
		[moveMinimapCamera],
	);

	const handleMinimapMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!minimapDraggingRef.current) return;
			moveMinimapCamera(e);
		},
		[moveMinimapCamera],
	);

	const handleMinimapMouseUp = useCallback(() => {
		minimapDraggingRef.current = false;
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
		},
		[controlsRef, buildingGroupsRef],
	);

	useBuildingClick(rendererRef, cameraRef, buildingGroupsRef, (name, x, y) => {
		if (name && x !== undefined && y !== undefined)
			setBuildingPopup({ name, x, y });
		else setBuildingPopup(null);
	});

	// ── 애니메이션 루프 ──
	useEffect(() => {
		function animate() {
			animFrameRef.current = requestAnimationFrame(animate);
			const scene = sceneRef.current;
			const camera = cameraRef.current;
			const renderer = rendererRef.current;
			const controls = controlsRef.current;
			if (!scene || !camera || !renderer || !controls) return;

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

			// ── 경고 건물 점멸: sin 파형으로 0.05↔0.8 emissiveIntensity 부드럽게 전환 ──
			warningMeshesRef.current.forEach((mesh) => {
				if (!mesh.material || !("emissiveIntensity" in mesh.material)) return;
				(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
					0.05 + ((Math.sin(elapsed * 0.005) + 1) / 2) * 0.75;
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
			// ── 카메라 각도 스냅: 입력창 포커스 중에는 비활성화 ──
			if (!camInputFocusedRef.current) {
				const snapOffset = new THREE.Vector3().subVectors(
					camera.position,
					controls.target,
				);
				const sph = new THREE.Spherical().setFromVector3(snapOffset);
				sph.theta = Math.round(sph.theta / ANGLE_STEP) * ANGLE_STEP; // 수평 방위각 스냅
				sph.phi = Math.round(sph.phi / ANGLE_STEP) * ANGLE_STEP; // 수직 앙각 스냅
				// 스냅 후에도 OrbitControls의 polar 제한 범위를 유지
				sph.phi = Math.max(
					controls.minPolarAngle,
					Math.min(controls.maxPolarAngle, sph.phi),
				);
				snapOffset.setFromSpherical(sph);
				camera.position.copy(controls.target).add(snapOffset);
				camera.lookAt(controls.target);
			}

			// ── 카메라 위치/줌 입력창 갱신: 포커스 중이 아닐 때만 덮어쓰기 ──
			if (!camInputFocusedRef.current) {
				if (camXRef.current)
					camXRef.current.value = Math.round(camera.position.x).toString();
				if (camYRef.current)
					camYRef.current.value = Math.round(camera.position.y).toString();
				if (camZRef.current)
					camZRef.current.value = Math.round(camera.position.z).toString();
				if (camDRef.current)
					camDRef.current.value = Math.round(
						camera.position.distanceTo(controls.target),
					).toString();
				if (tgtXRef.current)
					tgtXRef.current.value = Math.round(controls.target.x).toString();
				if (tgtYRef.current)
					tgtYRef.current.value = Math.round(controls.target.y).toString();
				if (tgtZRef.current)
					tgtZRef.current.value = Math.round(controls.target.z).toString();
			}

			renderer.render(scene, camera);

			// ── 상시 건물 라벨 위치 갱신 (3D→2D 투영) ──
			const cw = renderer.domElement.clientWidth;
			const ch = renderer.domElement.clientHeight;
			for (const [name, el] of Object.entries(buildingLabelRefs.current)) {
				if (!el) continue;
				const box = buildingBoxesRef.current[name];
				if (!box) {
					el.style.display = "none";
					continue;
				}
				const proj = box.center.clone().project(camera);
				if (proj.z > 1) {
					el.style.display = "none";
					continue;
				}
				el.style.left = `${(proj.x * 0.5 + 0.5) * cw}px`;
				el.style.top = `${(1 - (proj.y * 0.5 + 0.5)) * ch - 32}px`;
				el.style.display = "block";
			}

			// ── 미니맵 렌더 (scissor test + OrthographicCamera 탑다운) ──
			const mmCam = minimapCameraRef.current;
			if (mmCam) {
				const rw = renderer.domElement.width;
				const rh = renderer.domElement.height;
				const dpr = renderer.getPixelRatio();
				const mmPx = Math.round(MM_SIZE * dpr);
				const marginPx = Math.round(MM_MARGIN * dpr);

				renderer.autoClear = false;
				renderer.setViewport(rw - mmPx - marginPx, marginPx, mmPx, mmPx);
				renderer.setScissor(rw - mmPx - marginPx, marginPx, mmPx, mmPx);
				renderer.setScissorTest(true);
				renderer.clearDepth();
				renderer.render(scene, mmCam);
				renderer.setScissorTest(false);
				renderer.setViewport(0, 0, rw, rh);
				renderer.autoClear = true;

				// ── 2D canvas: 카메라 위치(점) + 시야각(부채꼴) ──
				const cvs = minimap2dRef.current;
				if (cvs) {
					const ctx = cvs.getContext("2d");
					if (ctx) {
						ctx.clearRect(0, 0, MM_SIZE, MM_SIZE);

						// 카메라 위치를 미니맵 NDC → pixel 로 변환
						const camProj = camera.position.clone().project(mmCam);
						const px = (camProj.x * 0.5 + 0.5) * MM_SIZE;
						const py = (1 - (camProj.y * 0.5 + 0.5)) * MM_SIZE;

						// 시선 방향 벡터 → 정면 300유닛 앞 지점을 투영
						const dir = new THREE.Vector3();
						camera.getWorldDirection(dir);
						const frontProj = camera.position
							.clone()
							.addScaledVector(dir, 300)
							.project(mmCam);
						const fx = (frontProj.x * 0.5 + 0.5) * MM_SIZE;
						const fy = (1 - (frontProj.y * 0.5 + 0.5)) * MM_SIZE;

						// 2D 부채꼴 그리기
						const angle = Math.atan2(fy - py, fx - px);
						const hFov = (camera.fov * (Math.PI / 180) * camera.aspect) / 2;
						const fLen = 80;
						ctx.beginPath();
						ctx.moveTo(px, py);
						ctx.arc(px, py, fLen, angle - hFov, angle + hFov);
						ctx.closePath();
						ctx.fillStyle = "rgba(255,220,50,0.2)";
						ctx.fill();
						ctx.strokeStyle = "rgba(255,220,50,0.85)";
						ctx.lineWidth = 1.5;
						ctx.stroke();

						// ── 건물 마커: 2D 폴리곤(탑뷰 풋프린트) + 이름 라벨 ──
						for (const [name, { corners, center }] of Object.entries(
							buildingBoxesRef.current,
						).filter(([n]) => n === "m14" || n === "m16")) {
							const pts = corners.map((c) => {
								const p = c.clone().project(mmCam);
								return {
									x: (p.x * 0.5 + 0.5) * MM_SIZE,
									y: (1 - (p.y * 0.5 + 0.5)) * MM_SIZE,
								};
							});
							ctx.beginPath();
							ctx.moveTo(pts[0].x, pts[0].y);
							for (let i = 1; i < pts.length; i++)
								ctx.lineTo(pts[i].x, pts[i].y);
							ctx.closePath();
							ctx.fillStyle = "rgba(120,210,255,0.25)";
							ctx.fill();
							ctx.strokeStyle = "rgba(120,210,255,0.75)";
							ctx.lineWidth = 0.8;
							ctx.stroke();
							// 이름 라벨 (센터 투영)
							const cp = center.clone().project(mmCam);
							const cx = (cp.x * 0.5 + 0.5) * MM_SIZE;
							const cy = (1 - (cp.y * 0.5 + 0.5)) * MM_SIZE;
							ctx.fillStyle = "rgba(200,240,255,0.9)";
							ctx.font = "8px monospace";
							ctx.fillText(name, cx + 2, cy + 3);
						}

						// 카메라 위치 점
						ctx.beginPath();
						ctx.arc(px, py, 4, 0, Math.PI * 2);
						ctx.fillStyle = "#ffdc32";
						ctx.fill();
					}
				}
			}
		}
		animate();

		// ── Escape 키로 선택 해제 ──
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") setBuildingPopup(null);
		}
		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.removeEventListener("keydown", onKeyDown);
			if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
		};
	}, [
		sceneRef,
		cameraRef,
		rendererRef,
		controlsRef,
		lightsRef,
		sunMeshRef,
		moonMeshRef,
		warningsRef,
		windowsRef,
		smokesRef,
		warningMeshesRef,
	]);

	const timeModes: { value: TimeMode; label: string }[] = [
		{ value: "morning", label: "아침 (Morning)" },
		{ value: "auto", label: "실시간 (Realtime)" },
		{ value: "night", label: "밤 (Night)" },
	];

	return (
		<div style={{ width: "100%", height: "100%", position: "relative" }}>
			<div ref={mountRef} style={{ width: "100%", height: "100%" }} />

			{/* 로딩 오버레이 */}
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

			{/* 상단 좌측: 시간 모드 + 건물 선택 드롭다운 */}
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
					{buildingNames.map((n) => (
						<option key={n} value={n}>
							{n}
						</option>
					))}
				</select>

				{/* 카메라 XYZ 위치 컨트롤 */}
				{(["X", "Y", "Z"] as const).map((axis, i) => {
					const axisRef = [camXRef, camYRef, camZRef][i];
					return (
						<label
							key={axis}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 4,
								background: "rgba(10,10,20,0.85)",
								border: "1px solid rgba(255,255,255,0.12)",
								borderRadius: 8,
								padding: "0 10px",
								backdropFilter: "blur(12px)",
							}}
						>
							<span
								style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}
							>
								{axis}
							</span>
							<input
								ref={axisRef}
								type="number"
								step="10"
								defaultValue="0"
								onFocus={() => {
									camInputFocusedRef.current = true;
								}}
								onBlur={() => {
									camInputFocusedRef.current = false;
								}}
								onChange={(e) => {
									if (!cameraRef.current || !controlsRef.current) return;
									const val = Number(e.target.value);
									if (!Number.isFinite(val)) return;
									if (axis === "X") cameraRef.current.position.x = val;
									else if (axis === "Y") cameraRef.current.position.y = val;
									else cameraRef.current.position.z = val;
									cameraRef.current.lookAt(controlsRef.current.target);
									controlsRef.current.update();
								}}
								style={{
									width: 60,
									background: "transparent",
									color: "#ddd",
									border: "none",
									fontSize: 12,
									fontFamily: "monospace",
									outline: "none",
									padding: "8px 0",
									MozAppearance: "textfield",
								}}
							/>
						</label>
					);
				})}

				{/* 카메라 ~ 타겟 거리 (zoom) */}
				<label
					style={{
						display: "flex",
						alignItems: "center",
						gap: 4,
						background: "rgba(10,10,20,0.85)",
						border: "1px solid rgba(255,255,255,0.12)",
						borderRadius: 8,
						padding: "0 10px",
						backdropFilter: "blur(12px)",
					}}
				>
					<span
						style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}
					>
						Dist
					</span>
					<input
						ref={camDRef}
						type="number"
						step="10"
						min="150"
						max="700"
						defaultValue="0"
						onFocus={() => {
							camInputFocusedRef.current = true;
						}}
						onBlur={() => {
							camInputFocusedRef.current = false;
						}}
						onChange={(e) => {
							if (!cameraRef.current || !controlsRef.current) return;
							const dist = Number(e.target.value);
							if (!Number.isFinite(dist) || dist <= 0) return;
							// 현재 방향(단위벡터)을 유지한 채 거리만 변경
							const dir = new THREE.Vector3()
								.subVectors(
									cameraRef.current.position,
									controlsRef.current.target,
								)
								.normalize();
							cameraRef.current.position
								.copy(controlsRef.current.target)
								.addScaledVector(dir, dist);
							cameraRef.current.lookAt(controlsRef.current.target);
							controlsRef.current.update();
						}}
						style={{
							width: 55,
							background: "transparent",
							color: "#ddd",
							border: "none",
							fontSize: 12,
							fontFamily: "monospace",
							outline: "none",
							padding: "8px 0",
							MozAppearance: "textfield",
						}}
					/>
				</label>

				{/* 구분선 */}
				<div
					style={{
						width: 1,
						height: 20,
						background: "rgba(255,255,255,0.15)",
						alignSelf: "center",
					}}
				/>

				{/* 타겟 XYZ 컨트롤 */}
				{(["TX", "TY", "TZ"] as const).map((axis, i) => {
					const axisRef = [tgtXRef, tgtYRef, tgtZRef][i];
					return (
						<label
							key={axis}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 4,
								background: "rgba(10,10,20,0.85)",
								border: "1px solid rgba(255,255,255,0.12)",
								borderRadius: 8,
								padding: "0 10px",
								backdropFilter: "blur(12px)",
							}}
						>
							<span
								style={{ fontSize: 11, color: "#666", fontFamily: "monospace" }}
							>
								{axis}
							</span>
							<input
								ref={axisRef}
								type="number"
								step="10"
								defaultValue="0"
								onFocus={() => {
									camInputFocusedRef.current = true;
								}}
								onBlur={() => {
									camInputFocusedRef.current = false;
								}}
								onChange={(e) => {
									if (!cameraRef.current || !controlsRef.current) return;
									const val = Number(e.target.value);
									if (!Number.isFinite(val)) return;
									if (axis === "TX") controlsRef.current.target.x = val;
									else if (axis === "TY") controlsRef.current.target.y = val;
									else controlsRef.current.target.z = val;
									cameraRef.current.lookAt(controlsRef.current.target);
									controlsRef.current.update();
								}}
								style={{
									width: 60,
									background: "transparent",
									color: "#aaa",
									border: "none",
									fontSize: 12,
									fontFamily: "monospace",
									outline: "none",
									padding: "8px 0",
									MozAppearance: "textfield",
								}}
							/>
						</label>
					);
				})}

				{/* 경고 건물 선택 */}
				<select
					value={warningSelection[0] ?? ""}
					onChange={(e) => {
						const val = e.target.value;
						const selected = val ? [val] : [];
						setWarningSelection(selected);
						setWarningBuildings(selected);
					}}
					style={{
						background: "rgba(10,10,20,0.85)",
						color: "#f87171",
						border: "1px solid rgba(248,113,113,0.3)",
						borderRadius: 8,
						padding: "8px 14px",
						fontSize: 12,
						fontFamily: "'Noto Sans KR', sans-serif",
						backdropFilter: "blur(12px)",
						outline: "none",
						minWidth: 120,
					}}
				>
					<option value="">경고 건물...</option>
					{buildingNames.map((n) => (
						<option key={n} value={n}>
							{n}
						</option>
					))}
				</select>
			</div>

			{/* 상단 우측: 카메라 리셋 버튼 */}
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

			{/* 상시 건물 라벨 (m14, m16) */}
			{Object.keys(BUILDING_INFO).map((name) => {
				const info = BUILDING_INFO[name];
				return (
					<div
						key={name}
						ref={(el) => {
							buildingLabelRefs.current[name] = el;
						}}
						style={{
							position: "absolute",
							display: "none",
							transform: "translateX(-50%)",
							pointerEvents: "none",
							zIndex: 60,
							textAlign: "center",
						}}
					>
						<div
							style={{
								background: "rgba(10,12,24,0.82)",
								border: "1px solid rgba(255,255,255,0.15)",
								borderRadius: 6,
								padding: "4px 10px",
								backdropFilter: "blur(8px)",
							}}
						>
							<div style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>
								{info.title.split(" — ")[0]}
							</div>
							<div style={{ color: "#69c0ff", fontSize: 10 }}>
								{info.location}
							</div>
						</div>
						<div
							style={{
								width: 1,
								height: 8,
								background: "rgba(255,255,255,0.4)",
								margin: "0 auto",
							}}
						/>
					</div>
				);
			})}

			{/* 건물 클릭 팝업 */}
			{buildingPopup &&
				(() => {
					const info = BUILDING_INFO[buildingPopup.name];
					return (
						<div
							style={{
								position: "absolute",
								left: buildingPopup.x + 14,
								top: buildingPopup.y - 10,
								zIndex: 200,
								background: "rgba(10,12,24,0.92)",
								border: "1px solid rgba(255,255,255,0.15)",
								borderRadius: 8,
								padding: "10px 14px",
								backdropFilter: "blur(12px)",
								minWidth: 200,
								pointerEvents: "none",
							}}
						>
							<div
								style={{
									color: "#fff",
									fontWeight: 700,
									fontSize: 13,
									marginBottom: 4,
								}}
							>
								{info?.title ?? buildingPopup.name}
							</div>
							{info?.desc && (
								<div style={{ color: "#ddd", fontSize: 11, marginBottom: 6 }}>
									{info.desc}
								</div>
							)}
							{info?.location && (
								<div style={{ color: "#69c0ff", fontSize: 10 }}>
									📍 {info.location}
								</div>
							)}
						</div>
					);
				})()}

			{/* 미니맵 컨테이너 */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: minimap is a visual control */}
			<div
				onMouseDown={handleMinimapMouseDown}
				onMouseMove={handleMinimapMouseMove}
				onMouseUp={handleMinimapMouseUp}
				onMouseLeave={handleMinimapMouseUp}
				style={{
					position: "absolute",
					bottom: MM_MARGIN,
					right: MM_MARGIN,
					width: MM_SIZE,
					height: MM_SIZE,
					borderRadius: 8,
					border: "1px solid rgba(255,255,255,0.12)",
					background: "rgba(5,6,16,0.6)",
					overflow: "hidden",
					cursor: "crosshair",
					zIndex: 50,
				}}
			>
				<canvas
					ref={minimap2dRef}
					width={MM_SIZE}
					height={MM_SIZE}
					style={{ position: "absolute", top: 0, left: 0 }}
				/>
			</div>

			<style>{`
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        select option { background: #0a0a14; color: #ddd; }
      `}</style>
		</div>
	);
});

export default Campus3D;
