import { expect, test } from "@playwright/test";

const URL = "http://localhost:5174/";
const LOAD_WAIT = 15000;

test("WebGL 캔버스 초기화 확인 (크기 및 context)", async ({ page }) => {
	await page.goto(URL);
	await page.waitForTimeout(LOAD_WAIT);

	const canvas = page.locator("canvas").first();
	await expect(canvas).toBeVisible({ timeout: 5000 });

	// preserveDrawingBuffer=false(R3F 기본값)이면 readPixels로 픽셀을 읽을 수 없음.
	// 대신 캔버스 크기와 WebGL context 존재 여부로 렌더러 초기화를 검증
	const result = await canvas.evaluate((el: HTMLCanvasElement) => {
		const ctx =
			(el.getContext("webgl2") as WebGL2RenderingContext | null) ??
			(el.getContext("webgl") as WebGLRenderingContext | null);
		return {
			hasContext: !!ctx,
			width: el.width,
			height: el.height,
		};
	});

	console.log("캔버스 상태:", result);
	expect(result.hasContext, "WebGL context가 있어야 함").toBe(true);
	expect(result.width, "캔버스 width > 0").toBeGreaterThan(0);
	expect(result.height, "캔버스 height > 0").toBeGreaterThan(0);
});

test("콘솔 에러 없음 (WebGL 환경 에러 제외)", async ({ page }) => {
	const errors: string[] = [];

	page.on("console", (msg) => {
		if (msg.type() === "error") errors.push(msg.text());
	});
	page.on("pageerror", (err) => errors.push(err.message));

	await page.goto(URL);
	await page.waitForTimeout(LOAD_WAIT);

	const relevant = errors.filter(
		(e) =>
			!e.includes("antd") &&
			!e.includes("findDOMNode") &&
			!e.includes("ResizeObserver") &&
			!e.includes("WebGL") &&
			!e.includes("WebGLRenderer"),
	);

	if (relevant.length > 0) console.log("에러 목록:", relevant);
	expect(relevant, `콘솔 에러 발생:\n${relevant.join("\n")}`).toHaveLength(0);
});

test("미니맵 캔버스 존재 (canvas 2개 이상)", async ({ page }) => {
	await page.goto(URL);
	await page.waitForTimeout(LOAD_WAIT);

	const count = await page.locator("canvas").count();
	console.log(`캔버스 개수: ${count}`);
	expect(
		count,
		"캔버스가 2개 이상이어야 함 (WebGL + 2D 미니맵)",
	).toBeGreaterThanOrEqual(2);
});
