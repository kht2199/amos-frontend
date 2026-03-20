#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "./mock-endpoints.config.mjs");
const BASE_URL = process.env.VITE_API_BASE_URL ?? "http://localhost:8080";

function pathToFilename(path) {
	return `${path
		.replace(/^\/api\/v\d+\//, "")
		.replace(/\//g, "-")
		.replace(/:/g, "")}.json`;
}

function extractParams(specPath, method) {
	const params = method.parameters ?? [];
	const pathParams = {};
	const queryParams = {};
	for (const p of params) {
		if (p.in === "path") pathParams[p.name] = "";
		if (p.in === "query") queryParams[p.name] = "";
	}
	// Convert {param} style to :param style
	const normalizedPath = specPath.replace(/\{(\w+)\}/g, ":$1");
	return { normalizedPath, pathParams, queryParams };
}

function serializeEndpoint(e) {
	let line = `\t{ file: "${e.file}", path: "${e.path}"`;
	if (e.pathParams && Object.keys(e.pathParams).length > 0)
		line += `, pathParams: ${JSON.stringify(e.pathParams)}`;
	if (e.queryParams && Object.keys(e.queryParams).length > 0)
		line += `, queryParams: ${JSON.stringify(e.queryParams)}`;
	line += " },";
	return line;
}

function generateConfig(endpoints) {
	const header = `/**
 * Mock 데이터 fetch 설정
 *
 * - file: 저장할 파일명 (src/mocks/data/{file})
 * - path: API 경로. 경로 파라미터는 :paramName 형식으로 작성
 * - pathParams: 경로 파라미터 값 (선택)
 * - queryParams: 쿼리 파라미터 값 (선택, 빈 값은 직접 채워주세요)
 */
export const ENDPOINTS = [
`;
	const entries = endpoints.map(serializeEndpoint).join("\n");
	return `${header}${entries}\n];\n`;
}

async function main() {
	let spec;
	try {
		const res = await fetch(`${BASE_URL}/v3/api-docs`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		spec = await res.json();
	} catch (err) {
		console.warn(
			`⚠ sync-mock-endpoints: OpenAPI 스펙을 가져올 수 없습니다: ${err.message}`,
		);
		return;
	}

	const specEntries = Object.entries(spec.paths ?? {})
		.filter(([, methods]) => "get" in methods)
		.map(([specPath, methods]) => {
			const { normalizedPath, pathParams, queryParams } = extractParams(
				specPath,
				methods.get,
			);
			return { specPath, normalizedPath, pathParams, queryParams };
		});

	const entries = specEntries.map(
		({ normalizedPath, pathParams, queryParams }) => ({
			file: pathToFilename(normalizedPath),
			path: normalizedPath,
			...(Object.keys(pathParams).length > 0 && { pathParams }),
			...(Object.keys(queryParams).length > 0 && { queryParams }),
		}),
	);

	writeFileSync(CONFIG_PATH, generateConfig(entries));

	console.log(
		`✓ mock-endpoints.config.mjs 갱신됨 (${entries.length}개 엔드포인트):`,
	);
	for (const e of entries) console.log(`  ${e.path}`);
	console.log("빈 값으로 추가된 파라미터를 직접 채워주세요.");
}

main();
