#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ENDPOINTS } from "./mock-endpoints.config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../src/mocks/data");
const BASE_URL = process.env.VITE_API_BASE_URL ?? "http://localhost:8080";

function buildUrl(path, pathParams, queryParams) {
	let resolved = path;
	for (const [k, v] of Object.entries(pathParams ?? {})) {
		resolved = resolved.replace(`:${k}`, v);
	}
	const url = new URL(`${BASE_URL}${resolved}`);
	for (const [k, v] of Object.entries(queryParams ?? {})) {
		url.searchParams.set(k, String(v));
	}
	return url.toString();
}

async function fetchAndSave({ file, path, pathParams, queryParams }) {
	const url = buildUrl(path, pathParams, queryParams);
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
		const data = await res.json();
		writeFileSync(resolve(DATA_DIR, file), JSON.stringify(data, null, 2));
		console.log(`✓ saved ${file}`);
		return { file, ok: true };
	} catch (err) {
		console.warn(`⚠ skipped ${file}: ${err.message}`);
		return { file, ok: false };
	}
}

async function main() {
	mkdirSync(DATA_DIR, { recursive: true });
	console.log(`Fetching mock data from ${BASE_URL}...`);
	const results = await Promise.all(ENDPOINTS.map(fetchAndSave));
	const saved = results.filter((r) => r.ok).length;
	console.log(`Done: ${saved}/${ENDPOINTS.length} files saved.`);
	if (saved === 0) {
		console.warn("No files were saved. Is the server running?");
	}
}

main();
