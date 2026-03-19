import { useCallback } from "react";
import * as THREE from "three";
import {
	CAM_POS,
	CAM_TARGET,
} from "@/pages/main/components/campus3d/constants";
import { useCampus3dStore } from "@/stores/campus3dStore";

export function resetCameraView() {
	const { camera: cam, controls } = useCampus3dStore.getState();
	if (cam) cam.position.copy(CAM_POS);
	if (controls) {
		controls.target.copy(CAM_TARGET);
		controls.update();
	}
	useCampus3dStore.setState({ focusBuilding: "" });
}

export function SceneControls() {
	const buildingNames = useCampus3dStore((s) => s.buildingNames);
	const focusBuilding = useCampus3dStore((s) => s.focusBuilding);
	const warningBuildings = useCampus3dStore((s) => s.warningBuildings);

	const handleFocusBuilding = useCallback((name: string) => {
		useCampus3dStore.setState({ focusBuilding: name });
		if (!name) return;
		const { controls, buildingGroups } = useCampus3dStore.getState();
		const group = buildingGroups[name];
		if (!group || !controls) return;
		group.updateWorldMatrix(true, true);
		const box = new THREE.Box3().setFromObject(group);
		const center = new THREE.Vector3();
		box.getCenter(center);
		controls.target.copy(center);
		controls.update();
	}, []);

	return (
		<div className="scene-controls">
			{/* 컨트롤 */}
			<div className="scene-controls-inner">
				{/* 건물 선택 */}
				<select
					value={focusBuilding}
					onChange={(e) => handleFocusBuilding(e.target.value)}
					className="scene-select"
				>
					<option value="">건물 선택...</option>
					{buildingNames.map((n) => (
						<option key={n} value={n}>
							{n}
						</option>
					))}
				</select>

				{/* 카메라 X */}
				<label className="scene-input-label">
					<span className="scene-axis-label">X</span>
					<input
						ref={(el) => useCampus3dStore.setState({ camXEl: el })}
						type="number"
						step="10"
						defaultValue="0"
						onChange={(e) => {
							const val = Number(e.target.value);
							if (!Number.isFinite(val)) return;
							const { camera: cam, controls } = useCampus3dStore.getState();
							if (!cam || !controls) return;
							cam.position.x = val;
							cam.lookAt(controls.target);
							controls.update();
						}}
						onFocus={() => useCampus3dStore.setState({ camInputFocused: true })}
						onBlur={() => useCampus3dStore.setState({ camInputFocused: false })}
						className="scene-input scene-input--w60"
					/>
				</label>

				{/* 카메라 Y */}
				<label className="scene-input-label">
					<span className="scene-axis-label">Y</span>
					<input
						ref={(el) => useCampus3dStore.setState({ camYEl: el })}
						type="number"
						step="10"
						defaultValue="0"
						onChange={(e) => {
							const val = Number(e.target.value);
							if (!Number.isFinite(val)) return;
							const { camera: cam, controls } = useCampus3dStore.getState();
							if (!cam || !controls) return;
							cam.position.y = val;
							cam.lookAt(controls.target);
							controls.update();
						}}
						onFocus={() => useCampus3dStore.setState({ camInputFocused: true })}
						onBlur={() => useCampus3dStore.setState({ camInputFocused: false })}
						className="scene-input scene-input--w60"
					/>
				</label>

				{/* 카메라 Z */}
				<label className="scene-input-label">
					<span className="scene-axis-label">Z</span>
					<input
						ref={(el) => useCampus3dStore.setState({ camZEl: el })}
						type="number"
						step="10"
						defaultValue="0"
						onChange={(e) => {
							const val = Number(e.target.value);
							if (!Number.isFinite(val)) return;
							const { camera: cam, controls } = useCampus3dStore.getState();
							if (!cam || !controls) return;
							cam.position.z = val;
							cam.lookAt(controls.target);
							controls.update();
						}}
						onFocus={() => useCampus3dStore.setState({ camInputFocused: true })}
						onBlur={() => useCampus3dStore.setState({ camInputFocused: false })}
						className="scene-input scene-input--w60"
					/>
				</label>

				{/* 카메라 거리 */}
				<label className="scene-input-label">
					<span className="scene-axis-label">Dist</span>
					<input
						ref={(el) => useCampus3dStore.setState({ camDEl: el })}
						type="number"
						step="10"
						min="150"
						max="700"
						defaultValue="0"
						onChange={(e) => {
							const dist = Number(e.target.value);
							if (!Number.isFinite(dist) || dist <= 0) return;
							const { camera: cam, controls } = useCampus3dStore.getState();
							if (!cam || !controls) return;
							const dir = new THREE.Vector3()
								.subVectors(cam.position, controls.target)
								.normalize();
							cam.position.copy(controls.target).addScaledVector(dir, dist);
							cam.lookAt(controls.target);
							controls.update();
						}}
						onFocus={() => useCampus3dStore.setState({ camInputFocused: true })}
						onBlur={() => useCampus3dStore.setState({ camInputFocused: false })}
						className="scene-input scene-input--w55"
					/>
				</label>

				<div className="scene-divider" />

				{/* 타겟 TX */}
				<label className="scene-input-label">
					<span className="scene-axis-label scene-axis-label--muted">TX</span>
					<input
						ref={(el) => useCampus3dStore.setState({ tgtXEl: el })}
						type="number"
						step="10"
						defaultValue="0"
						onChange={(e) => {
							const val = Number(e.target.value);
							if (!Number.isFinite(val)) return;
							const { camera: cam, controls } = useCampus3dStore.getState();
							if (!cam || !controls) return;
							controls.target.x = val;
							cam.lookAt(controls.target);
							controls.update();
						}}
						onFocus={() => useCampus3dStore.setState({ camInputFocused: true })}
						onBlur={() => useCampus3dStore.setState({ camInputFocused: false })}
						className="scene-input scene-input--muted scene-input--w60"
					/>
				</label>

				{/* 타겟 TY */}
				<label className="scene-input-label">
					<span className="scene-axis-label scene-axis-label--muted">TY</span>
					<input
						ref={(el) => useCampus3dStore.setState({ tgtYEl: el })}
						type="number"
						step="10"
						defaultValue="0"
						onChange={(e) => {
							const val = Number(e.target.value);
							if (!Number.isFinite(val)) return;
							const { camera: cam, controls } = useCampus3dStore.getState();
							if (!cam || !controls) return;
							controls.target.y = val;
							cam.lookAt(controls.target);
							controls.update();
						}}
						onFocus={() => useCampus3dStore.setState({ camInputFocused: true })}
						onBlur={() => useCampus3dStore.setState({ camInputFocused: false })}
						className="scene-input scene-input--muted scene-input--w60"
					/>
				</label>

				{/* 타겟 TZ */}
				<label className="scene-input-label">
					<span className="scene-axis-label scene-axis-label--muted">TZ</span>
					<input
						ref={(el) => useCampus3dStore.setState({ tgtZEl: el })}
						type="number"
						step="10"
						defaultValue="0"
						onChange={(e) => {
							const val = Number(e.target.value);
							if (!Number.isFinite(val)) return;
							const { camera: cam, controls } = useCampus3dStore.getState();
							if (!cam || !controls) return;
							controls.target.z = val;
							cam.lookAt(controls.target);
							controls.update();
						}}
						onFocus={() => useCampus3dStore.setState({ camInputFocused: true })}
						onBlur={() => useCampus3dStore.setState({ camInputFocused: false })}
						className="scene-input scene-input--muted scene-input--w60"
					/>
				</label>

				{/* 경고 건물 선택 */}
				<select
					value={warningBuildings[0] ?? ""}
					onChange={(e) => {
						const val = e.target.value;
						useCampus3dStore.setState({ warningBuildings: val ? [val] : [] });
					}}
					className="scene-select scene-select--warning"
				>
					<option value="">경고 건물...</option>
					{buildingNames.map((n) => (
						<option key={n} value={n}>
							{n}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
