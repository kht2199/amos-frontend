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
	setSelectedBuilding: (name: string | null) => void,
) {
	// rendererRef/cameraRef/buildingGroupsRef는 stable refs — 마운트 후 변경되지 않음
	// biome-ignore lint/correctness/useExhaustiveDependencies: all ref arguments are stable refs
	useEffect(() => {
		const renderer = rendererRef.current;
		if (!renderer) return;

		const raycaster = new THREE.Raycaster();
		const mouse = new THREE.Vector2();

		// ── onClick: 레이캐스터로 클릭된 건물을 판별해 선택 상태 갱신 ──
		function onClick(event: MouseEvent) {
			if (!rendererRef.current || !cameraRef.current) return;
			// 마우스 좌표를 NDC(-1~1) 공간으로 변환
			const rect = rendererRef.current.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, cameraRef.current);
			for (const [name, group] of Object.entries(
				buildingGroupsRef.current ?? {},
			)) {
				const intersects = raycaster.intersectObjects(group.children, true);
				if (intersects.length > 0) {
					setSelectedBuilding(name);
					return; // 첫 번째 교차 건물에서 중단 (중복 선택 방지)
				}
			}
		}

		// ── onMouseMove: 건물 위에 마우스가 있으면 커서를 pointer로 변경 ──
		function onMouseMove(event: MouseEvent) {
			if (!rendererRef.current || !cameraRef.current) return;
			const rect = rendererRef.current.domElement.getBoundingClientRect();
			mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
			mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
			raycaster.setFromCamera(mouse, cameraRef.current);
			let found = false;
			for (const [, group] of Object.entries(buildingGroupsRef.current ?? {})) {
				if (raycaster.intersectObjects(group.children, true).length > 0) {
					rendererRef.current.domElement.style.cursor = "pointer"; // 건물 위: 손가락 커서
					found = true;
					break;
				}
			}
			if (!found) rendererRef.current.domElement.style.cursor = "default";
		}

		renderer.domElement.addEventListener("click", onClick);
		renderer.domElement.addEventListener("mousemove", onMouseMove);

		return () => {
			renderer.domElement.removeEventListener("click", onClick);
			renderer.domElement.removeEventListener("mousemove", onMouseMove);
		};
	}, [setSelectedBuilding]);
}
