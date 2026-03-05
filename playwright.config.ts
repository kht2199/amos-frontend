import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testMatch: "*.pw.ts",
	timeout: 60000,
	use: {
		...devices["Desktop Chrome"],
		launchOptions: {
			args: [
				"--use-gl=angle",
				"--enable-webgl",
				"--ignore-gpu-blocklist",
				"--enable-gpu-rasterization",
				"--no-sandbox",
				"--disable-setuid-sandbox",
			],
		},
	},
});
