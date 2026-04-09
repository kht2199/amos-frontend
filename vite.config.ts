/// <reference types="vitest/config" />
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		host: true,
		port: 5174,
		strictPort: true,
	},
	preview: {
		host: true,
		port: 4176,
		strictPort: true,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
			"@modules": path.resolve(__dirname, "src/models"),
			"@layouts": path.resolve(__dirname, "src/layouts"),
			"@hooks": path.resolve(__dirname, "src/hooks"),
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		css: true,
	},
});
