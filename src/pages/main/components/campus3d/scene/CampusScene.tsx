import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
	CAM_TARGET,
	DEG15,
	INIT_PHI,
} from "@/pages/main/components/campus3d/constants";
import { useThreeDModel } from "@/pages/main/components/campus3d/data/useThreeDModel";
import { useCampus3dStore } from "@/stores/campus3dStore";
import { SceneAnimator } from "./SceneAnimator";

const POINTER_THROTTLE_MS = 50;
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
	const startTimeRef = useRef(Date.now());
	const lastPointerMoveRef = useRef(0);

	const {
		model,
		buildingGroupsRef,
		buildingNames,
		warningsRef,
		warningMeshesRef,
		setWarningBuildings,
	} = useThreeDModel();

	// warningBuildings 변경 감지 → setWarningBuildings 호출
	const warningBuildings = useCampus3dStore((s) => s.warningBuildings);
	useEffect(() => {
		setWarningBuildings(warningBuildings);
	}, [warningBuildings, setWarningBuildings]);

	// 씬 배경 초기화 (sky.png 로드, 없으면 검정 폴백)
	// biome-ignore lint/correctness/useExhaustiveDependencies: scene is stable from useThree
	useLayoutEffect(() => {
		scene.background = new THREE.Color(0x000000);
		const loader = new THREE.TextureLoader();
		loader.load("/sky.png", (texture) => {
			texture.offset.set(0, -0.5);
			texture.repeat.set(1, 1);
			scene.background = texture;
		});
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

	const handlePointerMove = useCallback(
		(e: { stopPropagation: () => void; object: THREE.Object3D }) => {
			e.stopPropagation();
			const now = Date.now();
			if (now - lastPointerMoveRef.current < POINTER_THROTTLE_MS) return;
			lastPointerMoveRef.current = now;
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
				enablePan={false}
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
				startTimeRef={startTimeRef}
			/>
		</>
	);
}
