import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadGLTF } from "../lib/loaders";

/* ============================================================================
 * Type Definitions
 * ============================================================================ */

interface BuildingSpec {
	floors?: string;
	process?: string;
	size?: string;
	logistics?: string;
	role?: string;
	link?: string;
}

interface BuildingInfo {
	type: string;
	color: number;
	detail: string;
	specs: BuildingSpec;
	processFlow: string[];
}

interface SkyParams {
	r: number;
	g: number;
	b: number;
	ambientIntensity: number;
	dirIntensity: number;
	exposure: number;
	isNight: boolean;
	dirColor: number;
	sunPos: { x: number; y: number; z: number } | null;
	moonIntensity: number;
	skyProgress: number;
	sunUp: boolean;
	moonUp: boolean;
	moonAngle: number;
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
	const sunAngle = ((hours - 6) / 12) * Math.PI;
	const sunUp = hours >= 5.5 && hours <= 18.5;

	let skyProgress: number;
	if (hours >= 6 && hours <= 18) skyProgress = 1 - Math.abs(hours - 12) / 6;
	else skyProgress = 0;
	if (hours >= 5 && hours < 6) skyProgress = (hours - 5) * 0.3;
	if (hours > 18 && hours <= 19) skyProgress = (19 - hours) * 0.3;

	const nightR = 0x05 / 255,
		nightG = 0x06 / 255,
		nightB = 0x10 / 255;
	const dayR = 0x55 / 255,
		dayG = 0x99 / 255,
		dayB = 0xdd / 255;
	const dawnR = 0x88 / 255,
		dawnG = 0x44 / 255,
		dawnB = 0x33 / 255;
	let r: number, g: number, b: number;
	if (skyProgress > 0.3) {
		const t = (skyProgress - 0.3) / 0.7;
		r = dayR * t + nightR * (1 - t);
		g = dayG * t + nightG * (1 - t);
		b = dayB * t + nightB * (1 - t);
	} else if (skyProgress > 0) {
		const t = skyProgress / 0.3;
		r = dawnR * t + nightR * (1 - t);
		g = dawnG * t + nightG * (1 - t);
		b = dawnB * t + nightB * (1 - t);
	} else {
		r = nightR;
		g = nightG;
		b = nightB;
	}

	const ambientIntensity = 0.8 + (1.5 - 0.8) * skyProgress;
	const dirIntensity = 0.5 + (1.8 - 0.5) * skyProgress;
	const exposure = 1.2 + skyProgress * 0.6;
	const isNight = skyProgress < 0.15;
	const dirColor = sunUp ? (skyProgress > 0.3 ? 0xffeedd : 0xff8844) : 0x334466;

	let sunPos: { x: number; y: number; z: number } | null = null;
	if (sunUp) {
		const sx = 35 + 800 * Math.cos(sunAngle);
		const sy = 800 * Math.sin(sunAngle) * 0.7;
		sunPos = { x: sx, y: Math.max(sy, -20), z: 170 - 200 };
	}

	const moonAngle = (((hours - 18 + 24) % 24) / 12) * Math.PI;
	const moonUp = hours >= 17.5 || hours <= 6.5;
	let moonIntensity = 0;
	if (moonUp) {
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

		const renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(W, H);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.6;
		container.appendChild(renderer.domElement);
		rendererRef.current = renderer;

		const controls = new OrbitControls(camera, renderer.domElement);
		controls.target.copy(CAM_TARGET);
		controls.enableDamping = false;
		controls.rotateSpeed = 0.5;
		controls.minDistance = 150;
		controls.maxDistance = 700;
		controls.minPolarAngle = Math.max(0.1, INIT_PHI - DEG15);
		controls.maxPolarAngle = Math.min(Math.PI / 2 - 0.05, INIT_PHI + DEG15);
		controls.minAzimuthAngle = -Infinity;
		controls.maxAzimuthAngle = Infinity;
		controls.enablePan = false;
		controls.update();
		controlsRef.current = controls;
		const ANGLE_STEP = (5 * Math.PI) / 180;

		const ambient = new THREE.AmbientLight(0x8899bb, 1.4);
		scene.add(ambient);

		const dirLight = new THREE.DirectionalLight(0xfff0dd, 2.2);
		dirLight.position.set(300, 500, 200);
		dirLight.castShadow = true;
		dirLight.shadow.mapSize.set(4096, 4096);
		dirLight.shadow.camera.left = -600;
		dirLight.shadow.camera.right = 600;
		dirLight.shadow.camera.top = 600;
		dirLight.shadow.camera.bottom = -600;
		dirLight.shadow.camera.near = 0.5;
		dirLight.shadow.camera.far = 1500;
		dirLight.shadow.bias = -0.0005;
		dirLight.shadow.normalBias = 0.02;
		scene.add(dirLight);

		const hemi = new THREE.HemisphereLight(0xaaccee, 0x556677, 1.2);
		scene.add(hemi);

		const pointLight = new THREE.PointLight(0x4488ff, 0.5, 600);
		pointLight.position.set(200, 150, 300);
		scene.add(pointLight);

		lightsRef.current = { ambient, dirLight, hemi };

		const sunMesh = new THREE.Mesh(
			new THREE.SphereGeometry(22, 32, 32),
			new THREE.MeshBasicMaterial({ color: 0xffee66 }),
		);
		const sunGlow = new THREE.Mesh(
			new THREE.SphereGeometry(35, 32, 32),
			new THREE.MeshBasicMaterial({
				color: 0xffcc33,
				transparent: true,
				opacity: 0.3,
			}),
		);
		sunMesh.add(sunGlow);
		const sunGlow2 = new THREE.Mesh(
			new THREE.SphereGeometry(50, 32, 32),
			new THREE.MeshBasicMaterial({
				color: 0xffaa22,
				transparent: true,
				opacity: 0.12,
			}),
		);
		sunMesh.add(sunGlow2);
		scene.add(sunMesh);
		sunMeshRef.current = sunMesh;

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
					if (child.userData?.bld_name) {
						const bldKey = child.userData.bld_name as string;
						const displayName = BLD_NAME_MAP[bldKey] ?? bldKey;
						buildingGroups[displayName] = child;
					}
					if (child.name?.startsWith("Bus_")) buses.push(child);
					if ((child as THREE.Mesh).isMesh) {
						const mesh = child as THREE.Mesh;
						mesh.castShadow = true;
						mesh.receiveShadow = true;
						if (mesh.material) {
							const mat = mesh.material as THREE.Material & { name?: string };
							const mname = (mat.name ?? "").toLowerCase();
							if (mname.startsWith("wm")) windows.push(mesh);
							if (mname.startsWith("wrn")) warnings.push(mesh);
						}
					}
				});

				model.updateMatrixWorld(true);
				const smokeParticles: THREE.Points[] = [];
				warnings.forEach((warnMesh) => {
					const worldPos = new THREE.Vector3();
					warnMesh.getWorldPosition(worldPos);
					const smokeCount = 40;
					const positions = new Float32Array(smokeCount * 3);
					for (let i = 0; i < smokeCount; i++) {
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
						blending: THREE.AdditiveBlending,
						depthWrite: false,
					});
					const points = new THREE.Points(geo, mat);
					points.userData.smokeData = {
						baseX: worldPos.x,
						baseY: worldPos.y + 1,
						baseZ: worldPos.z,
						count: smokeCount,
						topRadius: 2.5,
					};
					scene.add(points);
					smokeParticles.push(points);
				});
				smokesRef.current = smokeParticles;

				model.updateMatrixWorld(true);
				for (const [displayName, group] of Object.entries(buildingGroups)) {
					const data = BUILDING_DATA[displayName];
					if (!data) continue;

					const box = new THREE.Box3().setFromObject(group);
					const center = new THREE.Vector3();
					box.getCenter(center);
					const topY = box.max.y;
					const hexColor = `#${data.color.toString(16).padStart(6, "0")}`;

					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d");
					if (!ctx) continue;
					const fontSize = 32;
					const typeFontSize = 16;
					ctx.font = `bold ${fontSize}px 'Noto Sans KR', sans-serif`;
					const nameWidth = ctx.measureText(displayName).width;
					ctx.font = `${typeFontSize}px 'Noto Sans KR', sans-serif`;
					const typeWidth = ctx.measureText(data.type).width;
					const cW = Math.max(nameWidth, typeWidth) + 40;
					const cH = fontSize + typeFontSize + 28;
					canvas.width = cW;
					canvas.height = cH;

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

					const tex = new THREE.CanvasTexture(canvas);
					tex.minFilter = THREE.LinearFilter;
					const spriteMat = new THREE.SpriteMaterial({
						map: tex,
						transparent: true,
						depthTest: false,
					});
					const sprite = new THREE.Sprite(spriteMat);
					const spriteScale = 32;
					sprite.scale.set(spriteScale, spriteScale * (cH / cW), 1);
					sprite.position.set(center.x, topY + 3, center.z);
					sprite.renderOrder = 999;
					scene.add(sprite);

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

		function onClick(event: MouseEvent) {
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
						center.y = box.max.y;
						const screenPos = center.clone().project(camera);
						const sx = (screenPos.x * 0.5 + 0.5) * rect.width;
						const sy = (-screenPos.y * 0.5 + 0.5) * rect.height;
						setPanelPos({ x: sx, y: sy });
						setSelectedBuilding(name);
						setPanelData(data);
					}
					return;
				}
			}
		}

		function onMouseMove(event: MouseEvent) {
			const rect = renderer.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, camera);
			let found = false;
			for (const [, group] of Object.entries(buildingGroupsRef.current)) {
				if (raycaster.intersectObjects(group.children, true).length > 0) {
					renderer.domElement.style.cursor = "pointer";
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
			const elapsed = Date.now() - startTimeRef.current;

			let hours: number;
			const mode = timeModeRef.current;
			if (mode === "morning") hours = 10;
			else if (mode === "night") hours = 0;
			else {
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

			if (sky.sunPos && sunMeshRef.current) {
				sunMeshRef.current.position.set(
					sky.sunPos.x,
					sky.sunPos.y,
					sky.sunPos.z,
				);
				sunMeshRef.current.visible = true;
				if (sky.sunUp && lightsRef.current.dirLight)
					lightsRef.current.dirLight.position.copy(sunMeshRef.current.position);
			} else if (sunMeshRef.current) {
				sunMeshRef.current.visible = false;
				if (lightsRef.current.dirLight)
					lightsRef.current.dirLight.position.set(100, 300, 100);
			}

			if (moonMeshRef.current) {
				if (sky.moonUp) {
					const mx = 35 - 800 * Math.cos(sky.moonAngle);
					const my = 800 * Math.sin(sky.moonAngle) * 0.6;
					moonMeshRef.current.position.set(mx, Math.max(my, -20), 170 + 150);
					moonMeshRef.current.visible = true;
					const ml = moonMeshRef.current.children.find(
						(c): c is THREE.PointLight => (c as THREE.PointLight).isPointLight,
					);
					if (ml) ml.intensity = sky.moonIntensity;
				} else {
					moonMeshRef.current.visible = false;
				}
			}

			warningsRef.current.forEach((mesh) => {
				if (mesh.material && "emissiveIntensity" in mesh.material) {
					const blink = Math.sin(elapsed * 0.006) > 0 ? 1.0 : 0.1;
					(mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
						blink;
				}
			});

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
					pos[i * 3] +=
						(Math.random() - 0.5) * 0.1 + Math.sin(elapsed * 0.0008 + i) * 0.04;
					pos[i * 3 + 1] += 0.1 + Math.random() * 0.06;
					pos[i * 3 + 2] += (Math.random() - 0.5) * 0.08;
					if (pos[i * 3 + 1] > sd.baseY + 25) {
						pos[i * 3] = sd.baseX + (Math.random() - 0.5) * sd.topRadius * 2;
						pos[i * 3 + 1] = sd.baseY;
						pos[i * 3 + 2] =
							sd.baseZ + (Math.random() - 0.5) * sd.topRadius * 2;
					}
				}
				smoke.geometry.attributes.position.needsUpdate = true;
				(smoke.material as THREE.PointsMaterial).opacity =
					0.15 + Math.sin(elapsed * 0.003) * 0.05;
			});

			busesRef.current.forEach((bus) => {
				if (!bus.userData._init) {
					bus.userData._init = true;
					bus.userData._prog = Math.random();
					bus.userData._fwd = Math.random() > 0.5 ? 1 : -1;
					bus.userData._spd = 0.5 + Math.random() * 0.5;
					bus.userData._ox = bus.position.x;
				}
				bus.userData._prog += bus.userData._spd * 0.002 * bus.userData._fwd;
				if (bus.userData._prog >= 1) {
					bus.userData._prog = 1;
					bus.userData._fwd = -1;
				}
				if (bus.userData._prog <= 0) {
					bus.userData._prog = 0;
					bus.userData._fwd = 1;
				}
				bus.position.x = bus.userData._ox + (bus.userData._prog - 0.5) * 80;
			});

			windowsRef.current.forEach((mesh) => {
				if (!mesh.material) return;
				if (!mesh.userData._matCloned) {
					mesh.material = (
						mesh.material as THREE.Material
					).clone() as THREE.MeshStandardMaterial;
					mesh.userData._matCloned = true;
				}
				const mat = mesh.material as THREE.MeshStandardMaterial;
				if (sky.isNight) {
					mat.color.setHex(0xffdd88);
					mat.emissive.setHex(0xffaa33);
					mat.emissiveIntensity = 1.5;
					mat.transparent = true;
					mat.opacity = 0.9;
					if (Math.random() < 0.01)
						mat.emissiveIntensity = 0.8 + Math.random() * 1.2;
				} else {
					mat.color.setHex(0x8ac4ed);
					mat.emissive.setHex(0x3388bb);
					mat.emissiveIntensity = 0.15;
					mat.transparent = true;
					mat.opacity = 0.5;
				}
			});

			controls.update();
			const offset = new THREE.Vector3().subVectors(
				camera.position,
				controls.target,
			);
			const sph = new THREE.Spherical().setFromVector3(offset);
			sph.theta = Math.round(sph.theta / ANGLE_STEP) * ANGLE_STEP;
			sph.phi = Math.round(sph.phi / ANGLE_STEP) * ANGLE_STEP;
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
