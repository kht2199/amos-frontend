import { test } from "@playwright/test";

test("nav 스크린샷", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto("http://localhost:5174/");
	await page.waitForTimeout(2000);
	await page.screenshot({
		path: "/Users/htkim/.openclaw/workspace/agents/main/nav-screenshot.png",
	});
});
