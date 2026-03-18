import { Navigate, Route, Routes } from "react-router";
import DefaultLayout from "../layouts/DefaultLayout";
import AlertHistoryPage from "../pages/alert-history/AlertHistoryPage";
import AlertSettingPage from "../pages/alert-setting/AlertSettingPage";
import ContactManagementPage from "../pages/contact-management/ContactManagementPage";
import LlmPage from "../pages/llm/LlmPage";
import MainPage from "../pages/main/MainPage";
import BridgeMonitoringPage from "../pages/monitoring/BridgeMonitoringPage";
import FabCustomMonitoringPage from "../pages/monitoring/FabCustomMonitoringPage";
import FabLayoutMonitoringPage from "../pages/monitoring/FabLayoutMonitoringPage";
import ServerMonitoringPage from "../pages/monitoring/ServerMonitoringPage";
import AmChartsSamplePage from "../pages/samples/AmChartsSamplePage";
import EChartsSamplePage from "../pages/samples/EChartsSamplePage";

export default function AppRoutes() {
	return (
		<Routes>
			<Route element={<DefaultLayout />}>
				<Route index element={<MainPage />} />
				<Route path="monitor">
					<Route index element={<Navigate to="fab-layout" replace />} />
					<Route path="fab-layout" element={<FabLayoutMonitoringPage />} />
					<Route path="bridge" element={<BridgeMonitoringPage />} />
					<Route path="fab-custom" element={<FabCustomMonitoringPage />} />
					<Route path="server" element={<ServerMonitoringPage />} />
				</Route>
				<Route path="history/alert" element={<AlertHistoryPage />} />
				<Route path="llm" element={<LlmPage />} />
				<Route path="manage/contact" element={<ContactManagementPage />} />
				<Route path="settings/alert" element={<AlertSettingPage />} />
				<Route path="sample/echarts" element={<EChartsSamplePage />} />
				<Route path="sample/amcharts" element={<AmChartsSamplePage />} />
			</Route>
		</Routes>
	);
}
