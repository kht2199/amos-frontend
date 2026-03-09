import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { loadCompressedGLB } from "../../../lib/loaders";
import { useCampus3dStore } from "../store/campus3dStore";

/* ============================================================================
 * use3DModel — GLTF 모델 로드 훅 (R3F 버전)
 *
 * useThree()로 R3F scene에 접근하고, campus.gltf를 비동기로 로드한 후
 *   - 건물 그룹(buildingGroupsRef) 파싱
 *   - 창문/경고등 메시 분류
 *   - 경고등 위치에 연기 파티클 생성 (scene.add로 직접 추가)
 * 모델 자체는 반환하여 <primitive>로 렌더링한다 (R3F 이벤트 시스템 활용).
 * ============================================================================ */
export function useThreeDModel() {
	const buildingGroupsRef = useRef<Record<string, THREE.Object3D>>({});
	const [model, setModel] = useState<THREE.Group | null>(null);
	const [buildingNames, setBuildingNames] = useState<string[]>([]);
	const [groundBox, setGroundBox] = useState<THREE.Box3 | null>(null);
	const warningsRef = useRef<THREE.Mesh[]>([]);
	const warningMeshesRef = useRef<THREE.Mesh[]>([]);
	const warningOrigMapRef = useRef(
		new Map<THREE.Mesh, { emissive: THREE.Color; emissiveIntensity: number }>(),
	);

	const setWarningBuildings = useCallback((names: string[]) => {
		for (const [mesh, orig] of warningOrigMapRef.current) {
			const mat = mesh.material as THREE.MeshStandardMaterial;
			mat.emissive.copy(orig.emissive);
			mat.emissiveIntensity = orig.emissiveIntensity;
		}
		warningMeshesRef.current = [];
		warningOrigMapRef.current.clear();

		if (names.length === 0) return;

		const newMeshes: THREE.Mesh[] = [];
		for (const name of names) {
			const group = buildingGroupsRef.current[name] as
				| THREE.Object3D
				| undefined;
			if (!group) continue;
			group.traverse((child) => {
				if (!(child as THREE.Mesh).isMesh) return;
				const mesh = child as THREE.Mesh;
				if (!mesh.material || !("emissive" in mesh.material)) return;
				if (!mesh.userData._matCloned && !mesh.userData._warnMatCloned) {
					mesh.material = (mesh.material as THREE.Material).clone();
					mesh.userData._warnMatCloned = true;
				}
				const mat = mesh.material as THREE.MeshStandardMaterial;
				warningOrigMapRef.current.set(mesh, {
					emissive: mat.emissive.clone(),
					emissiveIntensity: mat.emissiveIntensity,
				});
				mat.emissive.setHex(0xff2200);
				newMeshes.push(mesh);
			});
		}
		warningMeshesRef.current = newMeshes;
	}, []);

	useEffect(() => {
		let cancelled = false;

		loadCompressedGLB("/campus.glb", (progress) => {
			if (progress.total > 0)
				useCampus3dStore.setState({
					loadProgress: Math.round((progress.loaded / progress.total) * 100),
				});
		})
			.then((gltf) => {
				if (cancelled) return;
				const gltfModel = gltf.scene;
				gltfModel.scale.set(0.9, 0.9, 0.9);
				// scene.add 하지 않음 — <primitive>로 렌더링해 R3F 이벤트 시스템 활용

				const buildingGroups: Record<string, THREE.Object3D> = {};
				const warnings: THREE.Mesh[] = [];

				const skipNames = new Set(["Scene", "Ground"]);
				gltfModel.traverse((child) => {
					if (
						child !== gltfModel &&
						child.name &&
						!(child as THREE.Mesh).isMesh &&
						!skipNames.has(child.name)
					) {
						buildingGroups[child.name] = child;
					}
				});

				gltfModel.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						const mesh = child as THREE.Mesh;
						mesh.castShadow = true;
						mesh.receiveShadow = true;
						if (mesh.material) {
							const mat = mesh.material as THREE.Material & {
								name?: string;
							};
							const mname = (mat.name ?? "").toLowerCase();
							if (mname.startsWith("wrn")) warnings.push(mesh);
						}
					}
				});

				gltfModel.updateMatrixWorld(true);

				buildingGroupsRef.current = buildingGroups;
				setBuildingNames(Object.keys(buildingGroups));
				warningsRef.current = warnings;

				const ground = gltfModel.getObjectByName("Ground");
				if (ground) setGroundBox(new THREE.Box3().setFromObject(ground));

				setModel(gltfModel);
				useCampus3dStore.setState({ loading: false });
			})
			.catch((error: unknown) => {
				if (cancelled) return;
				console.error("GLTF Load Error:", error);
				useCampus3dStore.setState({ loading: false });
			});

		return () => {
			cancelled = true;
		};
	}, []);

	return {
		model,
		buildingGroupsRef,
		buildingNames,
		groundBox,
		warningsRef,
		warningMeshesRef,
		setWarningBuildings,
	};
}
