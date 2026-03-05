import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { loadCompressedGLB } from "../../lib/loaders";

/* ============================================================================
 * useGLTFModel — GLTF 모델 로드 훅
 *
 * campus.gltf를 비동기로 로드한 후
 *   - 건물 그룹(buildingGroupsRef) 파싱
 *   - 창문/경고등 메시 분류
 *   - 경고등 위치에 연기 파티클 생성
 *   - 건물별 라벨 스프라이트 + 수직선 생성
 * 을 처리한다.
 * ============================================================================ */
export function useGLTFModel(
	sceneRef: React.RefObject<THREE.Scene | null>,
	setLoading: (v: boolean) => void,
	setLoadProgress: (v: number) => void,
) {
	const buildingGroupsRef = useRef<Record<string, THREE.Object3D>>({});
	const [buildingNames, setBuildingNames] = useState<string[]>([]);
	const warningsRef = useRef<THREE.Mesh[]>([]);
	const windowsRef = useRef<THREE.Mesh[]>([]);
	const smokesRef = useRef<THREE.Points[]>([]);
	const warningMeshesRef = useRef<THREE.Mesh[]>([]);
	const warningOrigMapRef = useRef(
		new Map<THREE.Mesh, { emissive: THREE.Color; emissiveIntensity: number }>(),
	);

	const setWarningBuildings = useCallback((names: string[]) => {
		// 기존 경고 건물 재질 복원
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
				// 재질을 공유하지 않도록 클론 (미클론 상태일 때만)
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

	// sceneRef는 stable ref — 첫 마운트 시 useScene 이펙트가 먼저 실행되어 이미 설정됨
	// biome-ignore lint/correctness/useExhaustiveDependencies: sceneRef is a stable ref populated before this effect runs
	useEffect(() => {
		const scene = sceneRef.current;
		if (!scene) return;

		loadCompressedGLB("/campus.glb", (progress) => {
			if (progress.total > 0)
				setLoadProgress(Math.round((progress.loaded / progress.total) * 100));
		})
			.then((gltf) => {
				const model = gltf.scene;
				model.scale.set(0.9, 0.9, 0.9);
				scene.add(model);

				const buildingGroups: Record<string, THREE.Object3D> = {};
				const warnings: THREE.Mesh[] = [];
				const windows: THREE.Mesh[] = [];

				// 모델 직계 자식을 건물 그룹으로 등록
				for (const child of model.children) {
					if (child.name) buildingGroups[child.name] = child;
				}

				model.traverse((child) => {
					if ((child as THREE.Mesh).isMesh) {
						const mesh = child as THREE.Mesh;
						mesh.castShadow = true;
						mesh.receiveShadow = true;
						if (mesh.material) {
							const mat = mesh.material as THREE.Material & {
								name?: string;
							};
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

				buildingGroupsRef.current = buildingGroups;
				setBuildingNames(Object.keys(buildingGroups));
				warningsRef.current = warnings;
				windowsRef.current = windows;
				setLoading(false);
			})
			.catch((error: unknown) => {
				console.error("GLTF Load Error:", error);
				setLoading(false);
			});
	}, [setLoading, setLoadProgress]);

	return {
		buildingGroupsRef,
		buildingNames,
		warningsRef,
		windowsRef,
		smokesRef,
		warningMeshesRef,
		setWarningBuildings,
	};
}
