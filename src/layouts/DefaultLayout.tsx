import type { MenuProps } from "antd";
import { ConfigProvider, Layout, Menu } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router";

const { Header, Content } = Layout;

const navItems: MenuProps["items"] = [
	{
		key: "monitor",
		label: "모니터링",
		children: [
			{ key: "/monitor/fab", label: "Fab Monitoring" },
			{ key: "/monitor/fab-layout", label: "Fab Layout Monitoring" },
			{ key: "/monitor/bridge", label: "Bridge Monitoring" },
			{ key: "/monitor/fab-custom", label: "Fab Custom Monitoring" },
			{ key: "/monitor/server", label: "Server Monitoring" },
		],
	},
	{ key: "/settings/alert", label: "알람" },
	{ key: "/history/alert", label: "이력 관리" },
	{ key: "/llm", label: "LLM" },
	{ key: "/manage/contact", label: "관리자" },
	{
		key: "sample",
		label: "샘플",
		children: [
			{ key: "/sample/echarts", label: "ECharts" },
			{ key: "/sample/amcharts", label: "AmCharts" },
		],
	},
];

export default function DefaultLayout() {
	const navigate = useNavigate();
	const location = useLocation();

	const onClick: MenuProps["onClick"] = ({ key }) => {
		navigate(key);
	};

	return (
		<Layout style={{ minHeight: "100vh" }}>
			<Header style={{ display: "flex", alignItems: "center", padding: 0 }}>
				<ConfigProvider
					theme={{
						components: {
							Menu: {
								darkItemBg: "transparent",
								darkPopupBg: "#001529",
								itemMarginInline: 0,
								itemPaddingInline: 40,
							},
						},
					}}
				>
					<Menu
						theme="dark"
						mode="horizontal"
						selectedKeys={[location.pathname]}
						items={navItems}
						onClick={onClick}
						style={{ flex: 1, justifyContent: "center" }}
					/>
				</ConfigProvider>
			</Header>
			<Content style={{ padding: 0, background: "#001529" }}>
				<Outlet />
			</Content>
		</Layout>
	);
}
