import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CAM_TARGET, DEG15, INIT_PHI } from "../constants";
import { useThreeDModel } from "../data/useThreeDModel";
import { useCampus3dStore } from "../store/campus3dStore";
import { MinimapRenderer } from "../ui/Minimap";
import { SceneAnimator } from "./SceneAnimator";

const SKIP_NAMES = new Set(["Scene", "Ground"]);

function findBuildingName(
	obj: THREE.Object3D,
	groups: Record<string, THREE.Object3D>,
): string | null {
	let cur: THREE.Object3D | null = obj;
	while (cur) {
		if (cur.name && groups[cur.name] && !SKIP_NAMES.has(cur.name))
			return cur.name;
		cur = cur.parent;
	}
	return null;
}

export function CampusScene() {
	const { camera, scene, gl } = useThree();
	const lightsRef = useRef<{
		ambient: THREE.AmbientLight | null;
		dirLight: THREE.DirectionalLight | null;
	}>({ ambient: null, dirLight: null });
	const sunMeshRef = useRef<THREE.Mesh | null>(null);
	const startTimeRef = useRef(Date.now());

	const {
		model,
		buildingGroupsRef,
		buildingNames,
		groundBox,
		warningsRef,
		warningMeshesRef,
		setWarningBuildings,
	} = useThreeDModel();

	// warningBuildings 변경 감지 → setWarningBuildings 호출
	const warningBuildings = useCampus3dStore((s) => s.warningBuildings);
	useEffect(() => {
		setWarningBuildings(warningBuildings);
	}, [warningBuildings, setWarningBuildings]);

	// 씬 배경/안개 + 미니맵 카메라 초기화
	// biome-ignore lint/correctness/useExhaustiveDependencies: scene is stable from useThree
	useLayoutEffect(() => {
		scene.background = new THREE.Color(0x345384);
		scene.fog = new THREE.FogExp2(0x345384, 0.0006);
		const mmCam = new THREE.OrthographicCamera(-500, 500, 500, -500, 1, 2000);
		mmCam.up.set(0, 0, 1);
		mmCam.position.set(CAM_TARGET.x, 800, CAM_TARGET.z);
		mmCam.lookAt(CAM_TARGET.x, 0, CAM_TARGET.z);
		useCampus3dStore.setState({ minimapCamera: mmCam });
	}, []);

	// 카메라를 스토어에 등록
	useEffect(() => {
		useCampus3dStore.setState({ camera: camera as THREE.PerspectiveCamera });
	}, [camera]);

	// 모델 로드 완료 시 스토어에 건물 데이터 저장
	// biome-ignore lint/correctness/useExhaustiveDependencies: buildingGroupsRef is stable
	useEffect(() => {
		if (buildingNames.length === 0) return;
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
		useCampus3dStore.setState({
			buildingNames,
			buildingGroups: buildingGroupsRef.current,
			buildingBoxes: boxes,
		});
	}, [buildingNames]);

	// Ground 박스로 미니맵 카메라 범위 설정
	useEffect(() => {
		if (!groundBox) return;
		const mmCam = useCampus3dStore.getState().minimapCamera;
		if (!mmCam) return;
		const center = new THREE.Vector3();
		groundBox.getCenter(center);
		const size = new THREE.Vector3();
		groundBox.getSize(size);
		const half = (Math.max(size.x, size.z) / 2) * 0.6;
		mmCam.left = -half;
		mmCam.right = half;
		mmCam.top = half;
		mmCam.bottom = -half;
		mmCam.up.set(0, 0, 1);
		mmCam.position.set(center.x, 800, center.z);
		mmCam.lookAt(center.x, 0, center.z);
		mmCam.updateProjectionMatrix();
	}, [groundBox]);

	const handlePointerMove = useCallback(
		(e: { stopPropagation: () => void; object: THREE.Object3D }) => {
			e.stopPropagation();
			const name = findBuildingName(e.object, buildingGroupsRef.current);
			gl.domElement.style.cursor = name ? "pointer" : "default";
		},
		[gl, buildingGroupsRef],
	);

	const handlePointerOut = useCallback(() => {
		gl.domElement.style.cursor = "default";
	}, [gl]);

	return (
		<>
			{/* 조명 */}
			<ambientLight
				ref={(el) => {
					lightsRef.current.ambient = el;
				}}
				color={0x8899bb}
				intensity={1.4}
			/>
			<directionalLight
				ref={(el) => {
					lightsRef.current.dirLight = el;
				}}
				color={0xfff0dd}
				intensity={2.2}
				position={[300, 500, 200]}
				castShadow
				shadow-mapSize={[4096, 4096]}
				shadow-camera-left={-600}
				shadow-camera-right={600}
				shadow-camera-top={600}
				shadow-camera-bottom={-600}
				shadow-camera-near={0.5}
				shadow-camera-far={1500}
				shadow-bias={-0.0005}
				shadow-normalBias={0.02}
			/>

			{/* 태양 */}
			<mesh ref={sunMeshRef} visible={false}>
				<sphereGeometry args={[22, 32, 32]} />
				<meshBasicMaterial color={0xffee66} />
				<mesh>
					<sphereGeometry args={[35, 32, 32]} />
					<meshBasicMaterial color={0xffcc33} transparent opacity={0.3} />
				</mesh>
				<mesh>
					<sphereGeometry args={[50, 32, 32]} />
					<meshBasicMaterial color={0xffaa22} transparent opacity={0.12} />
				</mesh>
			</mesh>

			{/* OrbitControls — 마운트 시 스토어에 등록 */}
			<OrbitControls
				ref={(el: OrbitControlsImpl | null) => {
					if (el) useCampus3dStore.setState({ controls: el });
				}}
				target={CAM_TARGET.toArray() as [number, number, number]}
				enableDamping={false}
				rotateSpeed={0.5}
				minDistance={1}
				maxDistance={700}
				minPolarAngle={Math.max(0.1, INIT_PHI - DEG15)}
				maxPolarAngle={Math.min(Math.PI / 2 - 0.05, INIT_PHI + DEG15)}
				enablePan
			/>

			{/* 건물 모델 */}
			{model && (
				<primitive
					object={model}
					onPointerMove={handlePointerMove}
					onPointerOut={handlePointerOut}
				/>
			)}

			{/* 애니메이션 루프 */}
			<SceneAnimator
				warningsRef={warningsRef}
				warningMeshesRef={warningMeshesRef}
				lightsRef={lightsRef}
				sunMeshRef={sunMeshRef}
				startTimeRef={startTimeRef}
			/>

			{/* 미니맵 렌더 */}
			<MinimapRenderer />
		</>
	);
}
