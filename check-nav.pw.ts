import { expect, test } from "@playwright/test";

const URL = "http://localhost:5174/";

test("네비게이션 스타일 검사", async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(URL);
	await page.waitForTimeout(2000);

	const result = await page.evaluate(() => {
		const header = document.querySelector(".ant-layout-header") as HTMLElement;
		const menuRoot = document.querySelector(
			".ant-menu.ant-menu-root",
		) as HTMLElement;

		// overflow rest indicator(.ant-menu-overflow-item-rest) 제외한 실제 메뉴 아이템
		const items = Array.from(
			document.querySelectorAll(
				".ant-menu-root > li:not(.ant-menu-overflow-item-rest)",
			),
		).filter((el) => {
			// opacity:0 으로 숨겨진 overflow 측정용 아이템도 제외
			const style = (el as HTMLElement).style;
			return style.opacity !== "0" && style.height !== "0px";
		}) as HTMLElement[];

		const cs = (el: HTMLElement) => window.getComputedStyle(el);

		const headerStyle = header
			? {
					paddingTop: cs(header).paddingTop,
					paddingBottom: cs(header).paddingBottom,
					paddingLeft: cs(header).paddingLeft,
					paddingRight: cs(header).paddingRight,
					marginTop: cs(header).marginTop,
					marginBottom: cs(header).marginBottom,
				}
			: null;

		// 아이템 padding (시각적 gap의 원천)
		const itemPaddings = items.map((el) => ({
			paddingLeft: Number.parseFloat(cs(el).paddingLeft),
			paddingRight: Number.parseFloat(cs(el).paddingRight),
		}));

		// 중앙 정렬 확인
		let isCentered = false;
		if (menuRoot) {
			const rect = menuRoot.getBoundingClientRect();
			const menuCenter = rect.left + rect.width / 2;
			const viewportCenter = window.innerWidth / 2;
			isCentered = Math.abs(menuCenter - viewportCenter) < 20;
		}

		// 한 줄 여부 (overflow 아이템 제외)
		const rects = items.map((el) => el.getBoundingClientRect());
		const allSameLine = rects.every((r) => Math.abs(r.top - rects[0].top) < 4);

		return {
			headerStyle,
			itemPaddings,
			itemCount: items.length,
			allSameLine,
			isCentered,
		};
	});

	console.log("\n=== 네비게이션 스타일 결과 ===");
	console.log("Header paddingLeft:", result.headerStyle?.paddingLeft);
	console.log("Header paddingRight:", result.headerStyle?.paddingRight);
	console.log("Header paddingTop:", result.headerStyle?.paddingTop);
	console.log("Header paddingBottom:", result.headerStyle?.paddingBottom);
	console.log("아이템 개수:", result.itemCount);
	console.log("아이템 padding (첫 번째):", result.itemPaddings[0]);
	console.log("한 줄 표시:", result.allSameLine);
	console.log("중앙 정렬:", result.isCentered);

	// 검증
	expect(result.isCentered, "메뉴 중앙 정렬").toBe(true);
	expect(result.allSameLine, "아이템 한 줄 표시 (overflow 없음)").toBe(true);

	// 각 아이템 좌우 padding >= 8px (아이템 간 시각적 간격)
	for (let i = 0; i < result.itemPaddings.length; i++) {
		const { paddingLeft, paddingRight } = result.itemPaddings[i];
		expect(
			paddingLeft,
			`아이템[${i}] paddingLeft >= 8px`,
		).toBeGreaterThanOrEqual(8);
		expect(
			paddingRight,
			`아이템[${i}] paddingRight >= 8px`,
		).toBeGreaterThanOrEqual(8);
	}

	// Header 사방 padding/margin 0
	expect(result.headerStyle?.paddingLeft, "Header paddingLeft 0").toBe("0px");
	expect(result.headerStyle?.paddingRight, "Header paddingRight 0").toBe("0px");
	expect(result.headerStyle?.paddingTop, "Header paddingTop 0").toBe("0px");
	expect(result.headerStyle?.paddingBottom, "Header paddingBottom 0").toBe(
		"0px",
	);
	expect(result.headerStyle?.marginTop, "Header marginTop 0").toBe("0px");
	expect(result.headerStyle?.marginBottom, "Header marginBottom 0").toBe("0px");
});
