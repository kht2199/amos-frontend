import type * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { create } from "zustand";
import type { TimeMode } from "../types";

type BuildingBox = { corners: THREE.Vector3[]; center: THREE.Vector3 };

interface Campus3DState {
	// ── UI 상태 (리렌더 트리거) ──────────────────────────────────────────────
	timeMode: TimeMode;
	warningBuildings: string[];
	buildingNames: string[];
	focusBuilding: string;
	loading: boolean;
	loadProgress: number;

	// ── Three.js 오브젝트 (CampusScene이 마운트 후 채움) ────────────────────
	camera: THREE.PerspectiveCamera | null;
	controls: OrbitControlsImpl | null;
	minimapCamera: THREE.OrthographicCamera | null;
	buildingGroups: Record<string, THREE.Object3D>;
	buildingBoxes: Record<string, BuildingBox>;

	// ── DOM 요소 (Campus3D HTML 컴포넌트가 채움, useFrame에서 직접 갱신) ────
	containerEl: HTMLDivElement | null;
	minimap2dEl: HTMLCanvasElement | null;
	camInputFocused: boolean;
	camXEl: HTMLInputElement | null;
	camYEl: HTMLInputElement | null;
	camZEl: HTMLInputElement | null;
	camDEl: HTMLInputElement | null;
	tgtXEl: HTMLInputElement | null;
	tgtYEl: HTMLInputElement | null;
	tgtZEl: HTMLInputElement | null;
}

export const useCampus3dStore = create<Campus3DState>()(() => ({
	timeMode: "morning",
	warningBuildings: [],
	buildingNames: [],
	focusBuilding: "",
	loading: true,
	loadProgress: 0,

	camera: null,
	controls: null,
	minimapCamera: null,
	buildingGroups: {},
	buildingBoxes: {},

	containerEl: null,
	minimap2dEl: null,
	camInputFocused: false,
	camXEl: null,
	camYEl: null,
	camZEl: null,
	camDEl: null,
	tgtXEl: null,
	tgtYEl: null,
	tgtZEl: null,
}));
