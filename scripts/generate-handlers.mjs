#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ENDPOINTS } from "./mock-endpoints.config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HANDLERS_PATH = resolve(__dirname, "../src/mocks/handlers.ts");
const BASE_URL = process.env.VITE_API_BASE_URL ?? "http://localhost:8080";

function fileToIdentifier(file) {
	return `${file.replace(/\.json$/, "").replace(/[-]/g, "_")}Data`;
}

function generateHandlers(endpoints) {
	if (endpoints.length === 0) {
		return "export const handlers = [];\n";
	}

	const imports = endpoints
		.map((e) => `import ${fileToIdentifier(e.file)} from "./data/${e.file}";`)
		.join("\n");

	const handlers = endpoints
		.map(
			(e) =>
				`\thttp.get("${BASE_URL}${e.path}", () => HttpResponse.json(${fileToIdentifier(e.file)})),`,
		)
		.join("\n");

	return `import { http, HttpResponse } from "msw";\n${imports}\n\nexport const handlers = [\n${handlers}\n];\n`;
}

const content = generateHandlers(ENDPOINTS);
writeFileSync(HANDLERS_PATH, content);
console.log(`✓ handlers.ts generated with ${ENDPOINTS.length} handler(s).`);
