import { setConfig } from "@kubb/plugin-client/clients/axios";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";

setConfig({
	baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
});
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

async function bootstrap() {
	if (import.meta.env.VITE_USE_MOCK_ALARMS === "true") {
		const { worker } = await import("./mocks/browser");
		await worker.start({ onUnhandledRequest: "bypass" });
	}

	const rootElement = document.getElementById("root");
	if (!rootElement) throw new Error("Root element not found");
	createRoot(rootElement).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}

bootstrap();
