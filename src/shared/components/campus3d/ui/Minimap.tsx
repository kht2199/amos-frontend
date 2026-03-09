import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { useCampus3dStore } from "../store/campus3dStore";

export const MM_SIZE = 180;
export const MM_MARGIN = 12;

/* ============================================================================
 * MinimapRenderer — scissor test로 탑뷰 미니맵 렌더 + 2D 오버레이 갱신
 * props 없음 — 모든 데이터를 useCampus3dStore.getState()로 읽음
 *
 * ⚠️ priority=1로 등록하면 R3F의 자동 렌더(state.internal.priority > 0)가 비활성화됨.
 *    따라서 메인 씬 렌더도 이 useFrame 안에서 명시적으로 호출해야 한다.
 * ============================================================================ */
export function MinimapRenderer() {
	const { gl, scene, camera } = useThree();

	useFrame(() => {
		// 메인 씬 렌더 (priority > 0 subscriber가 있으면 R3F 자동 렌더가 스킵되므로 명시적 호출)
		gl.render(scene, camera);

		const {
			minimapCamera: mmCam,
			minimap2dEl,
			buildingBoxes,
		} = useCampus3dStore.getState();
		if (!mmCam) return;

		const rw = gl.domElement.width;
		const rh = gl.domElement.height;
		const dpr = gl.getPixelRatio();
		const mmPx = Math.round(MM_SIZE * dpr);
		const marginPx = Math.round(MM_MARGIN * dpr);

		gl.autoClear = false;
		gl.setViewport(rw - mmPx - marginPx, marginPx, mmPx, mmPx);
		gl.setScissor(rw - mmPx - marginPx, marginPx, mmPx, mmPx);
		gl.setScissorTest(true);
		gl.clearDepth();
		gl.render(scene, mmCam);
		gl.setScissorTest(false);
		gl.setViewport(0, 0, rw, rh);
		gl.autoClear = true;

		// 2D 오버레이
		if (!minimap2dEl) return;
		const ctx = minimap2dEl.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, MM_SIZE, MM_SIZE);

		const camProj = camera.position.clone().project(mmCam);
		const px = (camProj.x * 0.5 + 0.5) * MM_SIZE;
		const py = (1 - (camProj.y * 0.5 + 0.5)) * MM_SIZE;

		const dir = new THREE.Vector3();
		camera.getWorldDirection(dir);
		const frontProj = camera.position
			.clone()
			.addScaledVector(dir, 300)
			.project(mmCam);
		const fx = (frontProj.x * 0.5 + 0.5) * MM_SIZE;
		const fy = (1 - (frontProj.y * 0.5 + 0.5)) * MM_SIZE;

		const angle = Math.atan2(fy - py, fx - px);
		const hFov =
			((camera as THREE.PerspectiveCamera).fov *
				(Math.PI / 180) *
				(camera as THREE.PerspectiveCamera).aspect) /
			2;
		const fLen = 80;
		ctx.beginPath();
		ctx.moveTo(px, py);
		ctx.arc(px, py, fLen, angle - hFov, angle + hFov);
		ctx.closePath();
		ctx.fillStyle = "rgba(255,220,50,0.2)";
		ctx.fill();
		ctx.strokeStyle = "rgba(255,220,50,0.85)";
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// 건물 마커 (m14, m16)
		for (const [name, { corners, center }] of Object.entries(
			buildingBoxes,
		).filter(([n]) => n === "m14" || n === "m16")) {
			const pts = corners.map((c) => {
				const p = c.clone().project(mmCam);
				return {
					x: (p.x * 0.5 + 0.5) * MM_SIZE,
					y: (1 - (p.y * 0.5 + 0.5)) * MM_SIZE,
				};
			});
			ctx.beginPath();
			ctx.moveTo(pts[0].x, pts[0].y);
			for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
			ctx.closePath();
			ctx.fillStyle = "rgba(120,210,255,0.25)";
			ctx.fill();
			ctx.strokeStyle = "rgba(120,210,255,0.75)";
			ctx.lineWidth = 0.8;
			ctx.stroke();
			const cp = center.clone().project(mmCam);
			const cx = (cp.x * 0.5 + 0.5) * MM_SIZE;
			const cy = (1 - (cp.y * 0.5 + 0.5)) * MM_SIZE;
			ctx.fillStyle = "rgba(200,240,255,0.9)";
			ctx.font = "8px monospace";
			ctx.fillText(name, cx + 2, cy + 3);
		}

		// 카메라 위치 점
		ctx.beginPath();
		ctx.arc(px, py, 4, 0, Math.PI * 2);
		ctx.fillStyle = "#ffdc32";
		ctx.fill();
	}, 1); // priority=1: 기본 렌더 후 실행

	return null;
}

/* ============================================================================
 * MinimapOverlay — HTML 미니맵 오버레이 (드래그로 카메라 이동)
 * ============================================================================ */
export function MinimapOverlay() {
	const draggingRef = useRef(false);

	const moveCamera = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const {
			controls,
			camera: cam,
			minimapCamera: mmCam,
		} = useCampus3dStore.getState();
		if (!mmCam || !controls || !cam) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const clickY = e.clientY - rect.top;
		const ndc = new THREE.Vector3(
			(clickX / MM_SIZE) * 2 - 1,
			-((clickY / MM_SIZE) * 2 - 1),
			0,
		);
		ndc.unproject(mmCam);
		const offset = new THREE.Vector3().subVectors(
			cam.position,
			controls.target,
		);
		controls.target.set(ndc.x, controls.target.y, ndc.z);
		cam.position.copy(controls.target).add(offset);
		controls.update();
	}, []);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			draggingRef.current = true;
			moveCamera(e);
		},
		[moveCamera],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!draggingRef.current) return;
			moveCamera(e);
		},
		[moveCamera],
	);

	const handleMouseUp = useCallback(() => {
		draggingRef.current = false;
	}, []);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: minimap is a visual control
		<div
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			style={{
				position: "absolute",
				bottom: MM_MARGIN,
				right: MM_MARGIN,
				width: MM_SIZE,
				height: MM_SIZE,
				borderRadius: 8,
				border: "1px solid rgba(255,255,255,0.12)",
				background: "rgba(5,6,16,0.6)",
				overflow: "hidden",
				cursor: "crosshair",
				zIndex: 50,
			}}
		>
			<canvas
				ref={(el) => useCampus3dStore.setState({ minimap2dEl: el })}
				width={MM_SIZE}
				height={MM_SIZE}
				style={{ position: "absolute", top: 0, left: 0 }}
			/>
		</div>
	);
}
