import { test } from "@playwright/test";

test("header and nav styles", async ({ page }) => {
	await page.goto("http://localhost:5175/");
	await page.waitForLoadState("networkidle");

	// 스크린샷
	await page.screenshot({ path: "/tmp/header-full.png", fullPage: false });

	// Header 영역만 crop
	const header = page.locator(".ant-layout-header").first();
	await header.screenshot({ path: "/tmp/header-crop.png" });

	// 계산된 스타일 확인
	const nav = page.locator(".layout-nav").first();
	const navStyles = await nav.evaluate((el) => {
		const cs = window.getComputedStyle(el);
		return {
			background: cs.background,
			backgroundColor: cs.backgroundColor,
			flex: cs.flex,
			justifyContent: cs.justifyContent,
			display: cs.display,
		};
	});
	console.log("NAV computed styles:", JSON.stringify(navStyles, null, 2));

	const headerEl = page.locator(".layout-header").first();
	const headerStyles = await headerEl.evaluate((el) => {
		const cs = window.getComputedStyle(el);
		return {
			background: cs.background,
			backgroundColor: cs.backgroundColor,
			display: cs.display,
			alignItems: cs.alignItems,
		};
	});
	console.log("HEADER computed styles:", JSON.stringify(headerStyles, null, 2));
});
