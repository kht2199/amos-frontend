import { useCallback } from "react";
import * as THREE from "three";
import { CAM_POS, CAM_TARGET } from "../constants";
import { useCampus3dStore } from "../store/campus3dStore";
import type { TimeMode } from "../types";

const TIME_MODES: { value: TimeMode; label: string }[] = [
	{ value: "morning", label: "아침 (Morning)" },
	{ value: "auto", label: "실시간 (Realtime)" },
	{ value: "night", label: "밤 (Night)" },
];

export function SceneControls() {
	const buildingNames = useCampus3dStore((s) => s.buildingNames);
	const timeMode = useCampus3dStore((s) => s.timeMode);
	const focusBuilding = useCampus3dStore((s) => s.focusBuilding);
	const warningBuildings = useCampus3dStore((s) => s.warningBuildings);

	const handleFocusBuilding = useCallback((name: string) => {
		useCampus3dStore.setState({ focusBuilding: name });
		if (!name) return;
		const { controls, buildingGroups } = useCampus3dStore.getState();
		const group = buildingGroups[name];
		if (!group || !controls) return;
		const box = new THREE.Box3().setFromObject(group);
		const center = new THREE.Vector3();
		box.getCenter(center);
		controls.target.copy(center);
		controls.update();
	}, []);

	const handleReset = useCallback(() => {
		const { camera: cam, controls } = useCampus3dStore.getState();
		if (cam) cam.position.copy(CAM_POS);
		if (controls) {
			controls.target.copy(CAM_TARGET);
			controls.update();
		}
		useCampus3dStore.setState({ focusBuilding: "" });
	}, []);

	return (
		<>
			{/* 상단 좌측 컨트롤 */}
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
				{/* 시간 모드 */}
				<select
					value={timeMode}
					onChange={(e) =>
						useCampus3dStore.setState({ timeMode: e.target.value as TimeMode })
					}
					style={selectStyle}
				>
					{TIME_MODES.map((m) => (
						<option key={m.value} value={m.value}>
							{m.label}
						</option>
					))}
				</select>

				{/* 건물 선택 */}
				<select
					value={focusBuilding}
					onChange={(e) => handleFocusBuilding(e.target.value)}
					style={selectStyle}
				>
					<option value="">건물 선택...</option>
					{buildingNames.map((n) => (
						<option key={n} value={n}>
							{n}
						</option>
					))}
				</select>

				{/* 카메라 X */}
				<label style={inputLabelStyle}>
					<span style={inputAxisLabelStyle}>X</span>
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
						style={{ ...inputStyle, width: 60 }}
					/>
				</label>

				{/* 카메라 Y */}
				<label style={inputLabelStyle}>
					<span style={inputAxisLabelStyle}>Y</span>
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
						style={{ ...inputStyle, width: 60 }}
					/>
				</label>

				{/* 카메라 Z */}
				<label style={inputLabelStyle}>
					<span style={inputAxisLabelStyle}>Z</span>
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
						style={{ ...inputStyle, width: 60 }}
					/>
				</label>

				{/* 카메라 거리 */}
				<label style={inputLabelStyle}>
					<span style={inputAxisLabelStyle}>Dist</span>
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
						style={{ ...inputStyle, width: 55 }}
					/>
				</label>

				<div
					style={{
						width: 1,
						height: 20,
						background: "rgba(255,255,255,0.15)",
						alignSelf: "center",
					}}
				/>

				{/* 타겟 TX */}
				<label style={inputLabelStyle}>
					<span style={{ ...inputAxisLabelStyle, color: "#666" }}>TX</span>
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
						style={{ ...inputStyle, width: 60, color: "#aaa" }}
					/>
				</label>

				{/* 타겟 TY */}
				<label style={inputLabelStyle}>
					<span style={{ ...inputAxisLabelStyle, color: "#666" }}>TY</span>
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
						style={{ ...inputStyle, width: 60, color: "#aaa" }}
					/>
				</label>

				{/* 타겟 TZ */}
				<label style={inputLabelStyle}>
					<span style={{ ...inputAxisLabelStyle, color: "#666" }}>TZ</span>
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
						style={{ ...inputStyle, width: 60, color: "#aaa" }}
					/>
				</label>

				{/* 경고 건물 선택 */}
				<select
					value={warningBuildings[0] ?? ""}
					onChange={(e) => {
						const val = e.target.value;
						useCampus3dStore.setState({ warningBuildings: val ? [val] : [] });
					}}
					style={{
						...selectStyle,
						color: "#f87171",
						border: "1px solid rgba(248,113,113,0.3)",
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

			{/* Reset 버튼 */}
			<button
				type="button"
				onClick={handleReset}
				style={{
					position: "absolute",
					top: 20,
					right: 24,
					zIndex: 100,
					...buttonStyle,
				}}
			>
				&#8634; Reset
			</button>
		</>
	);
}

/* ── 공통 인라인 스타일 ─────────────────────────────────────────────────────── */
const selectStyle: React.CSSProperties = {
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
};

const inputLabelStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 4,
	background: "rgba(10,10,20,0.85)",
	border: "1px solid rgba(255,255,255,0.12)",
	borderRadius: 8,
	padding: "0 10px",
	backdropFilter: "blur(12px)",
};

const inputAxisLabelStyle: React.CSSProperties = {
	fontSize: 11,
	color: "#888",
	fontFamily: "monospace",
};

const inputStyle: React.CSSProperties = {
	background: "transparent",
	color: "#ddd",
	border: "none",
	fontSize: 12,
	fontFamily: "monospace",
	outline: "none",
	padding: "8px 0",
	MozAppearance: "textfield",
};

const buttonStyle: React.CSSProperties = {
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
};
