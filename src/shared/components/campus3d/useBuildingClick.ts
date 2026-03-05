import { useEffect } from "react";
import * as THREE from "three";

/* ============================================================================
 * useBuildingClick — 건물 클릭/호버 처리 훅
 *
 * 렌더러 domElement에 click/mousemove 이벤트를 등록하고,
 * Raycaster로 건물 교차를 판별해 선택 상태를 갱신한다.
 * ============================================================================ */
export function useBuildingClick(
	rendererRef: React.RefObject<THREE.WebGLRenderer | null>,
	cameraRef: React.RefObject<THREE.PerspectiveCamera | null>,
	buildingGroupsRef: React.RefObject<Record<string, THREE.Object3D>>,
	setSelectedBuilding: (name: string | null, x?: number, y?: number) => void,
) {
	// rendererRef/cameraRef/buildingGroupsRef는 stable refs — 마운트 후 변경되지 않음
	// biome-ignore lint/correctness/useExhaustiveDependencies: all ref arguments are stable refs
	useEffect(() => {
		const renderer = rendererRef.current;
		if (!renderer) return;

		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		// Scene·Ground처럼 컨테이너 역할만 하는 오브젝트는 선택 제외
		const SKIP = new Set(["Scene", "Ground"]);

		/** 레이 히트 오브젝트에서 부모 방향으로 탐색해 buildingGroups 키와 매칭되는 가장 가까운 건물명 반환 */
		function findBuildingName(hit: THREE.Object3D): string | null {
			const groups = buildingGroupsRef.current ?? {};
			let obj: THREE.Object3D | null = hit;
			while (obj) {
				if (obj.name && groups[obj.name] && !SKIP.has(obj.name))
					return obj.name;
				obj = obj.parent;
			}
			return null;
		}

		// ── onClick: 레이캐스터로 클릭된 건물을 판별해 선택 상태 갱신 ──
		function onClick(event: MouseEvent) {
			if (!rendererRef.current || !cameraRef.current) return;
			const rect = rendererRef.current.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, cameraRef.current);
			const groups = buildingGroupsRef.current ?? {};
			const hits = raycaster.intersectObjects(Object.values(groups), true);
			if (hits.length === 0) return;
			const name = findBuildingName(hits[0].object);
			if (name) setSelectedBuilding(name, event.clientX, event.clientY);
		}

		// ── onMouseMove: 건물 위에 마우스가 있으면 커서를 pointer로 변경 ──
		function onMouseMove(event: MouseEvent) {
			if (!rendererRef.current || !cameraRef.current) return;
			const rect = rendererRef.current.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, cameraRef.current);
			const groups = buildingGroupsRef.current ?? {};
			const hits = raycaster.intersectObjects(Object.values(groups), true);
			const found = hits.length > 0 && !!findBuildingName(hits[0].object);
			rendererRef.current.domElement.style.cursor = found
				? "pointer"
				: "default";
		}

		renderer.domElement.addEventListener("click", onClick);
		renderer.domElement.addEventListener("mousemove", onMouseMove);

		return () => {
			renderer.domElement.removeEventListener("click", onClick);
			renderer.domElement.removeEventListener("mousemove", onMouseMove);
		};
	}, [setSelectedBuilding]);
}
