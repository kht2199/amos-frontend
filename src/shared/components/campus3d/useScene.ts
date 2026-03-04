import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* ============================================================================
 * Camera Constants (Campus3D 전역에서 공유)
 * ============================================================================ */

export const CAM_POS = new THREE.Vector3(21, 11, 3);
export const CAM_TARGET = new THREE.Vector3(12, 6, 3);

// 수직 회전각을 초기 phi ±15° 범위로 제한하기 위한 상수
const DEG15 = (15 * Math.PI) / 180;
const INIT_PHI = 1.04;

// 카메라 스냅 단위: 5° 간격으로 각도를 반올림
export const ANGLE_STEP = (5 * Math.PI) / 180;

interface SceneLights {
	ambient?: THREE.AmbientLight;
	dirLight?: THREE.DirectionalLight;
	hemi?: THREE.HemisphereLight;
}

/* ============================================================================
 * useScene — Three.js 씬 초기화 훅
 *
 * 씬, 카메라, 렌더러, OrbitControls, 조명, 태양/달 메시를 생성하고
 * 마운트 해제 시 전체를 정리한다.
 * ============================================================================ */
export function useScene(mountRef: React.RefObject<HTMLDivElement | null>) {
	const sceneRef = useRef<THREE.Scene | null>(null);
	const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
	const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
	const controlsRef = useRef<OrbitControls | null>(null);
	const lightsRef = useRef<SceneLights>({});
	const sunMeshRef = useRef<THREE.Mesh | null>(null);
	const moonMeshRef = useRef<THREE.Mesh | null>(null);

	useEffect(() => {
		if (!mountRef.current) return;
		const container = mountRef.current;
		const W = container.clientWidth,
			H = container.clientHeight;

		// ── 씬 ──
		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x345384);
		scene.fog = new THREE.FogExp2(0x345384, 0.0006);
		sceneRef.current = scene;

		// ── 카메라 ──
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
		controls.minDistance = 1;
		controls.maxDistance = 700;
		// 초기 仰角(phi) 기준으로 상하 15° 이내만 허용
		controls.minPolarAngle = Math.max(0.1, INIT_PHI - DEG15);
		controls.maxPolarAngle = Math.min(Math.PI / 2 - 0.05, INIT_PHI + DEG15);
		controls.minAzimuthAngle = -Infinity; // 수평 방위각 제한 없음
		controls.maxAzimuthAngle = Infinity;
		controls.enablePan = true;
		controls.update();
		controlsRef.current = controls;

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

		lightsRef.current = { ambient, dirLight };

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

		// ── 창 크기 변경 시 카메라 종횡비와 렌더러 크기 갱신 ──
		function onResize() {
			const w = container.clientWidth,
				h = container.clientHeight;
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			renderer.setSize(w, h);
		}
		window.addEventListener("resize", onResize);

		return () => {
			window.removeEventListener("resize", onResize);
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
			sceneRef.current = null;
			cameraRef.current = null;
			rendererRef.current = null;
			controlsRef.current = null;
		};
	}, [mountRef]);

	return {
		sceneRef,
		cameraRef,
		rendererRef,
		controlsRef,
		lightsRef,
		sunMeshRef,
		moonMeshRef,
	};
}
