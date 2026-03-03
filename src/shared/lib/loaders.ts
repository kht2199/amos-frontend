import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let gltfLoader: GLTFLoader | null = null;
let dracoLoader: DRACOLoader | null = null;

export function loadGLTF(
	url: string,
	onProgress?: (event: ProgressEvent) => void,
): Promise<GLTF> {
	if (!gltfLoader) {
		gltfLoader = new GLTFLoader();
	}
	const loader = gltfLoader;
	return new Promise((resolve, reject) => {
		loader.load(url, resolve, onProgress, reject);
	});
}

export function loadCompressedGLB(
	url: string,
	onProgress?: (event: ProgressEvent) => void,
): Promise<GLTF> {
	if (!dracoLoader) {
		dracoLoader = new DRACOLoader();
		dracoLoader.setDecoderPath(
			"https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
		);
	}
	const loader = new GLTFLoader();
	loader.setDRACOLoader(dracoLoader);
	return new Promise((resolve, reject) => {
		loader.load(url, resolve, onProgress, reject);
	});
}
