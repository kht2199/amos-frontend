import { BellOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import type { MenuProps } from "antd";
import { Button, ConfigProvider, Layout, Menu } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router";

const { Header, Content } = Layout;

const navItems: MenuProps["items"] = [
	{
		key: "monitor",
		label: "모니터링",
		children: [
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
		<Layout className="layout-root">
			<Header className="layout-header">
				<button
					type="button"
					onClick={() => navigate("/")}
					className="layout-logo-btn"
				>
					AMOS
				</button>
				<ConfigProvider
					theme={{
						components: {
							Menu: {
								darkItemBg: "transparent",
								darkPopupBg: "#000",
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
						triggerSubMenuAction="click"
						className="layout-nav"
					/>
				</ConfigProvider>
				<div className="layout-header-actions">
					<Button
						type="text"
						icon={<SearchOutlined />}
						className="layout-header-btn"
					/>
					<Button
						type="text"
						icon={<BellOutlined />}
						className="layout-header-btn"
					/>
					<Button
						type="text"
						icon={<UserOutlined />}
						className="layout-header-btn"
					/>
				</div>
			</Header>
			<div className="layout-sub-header" />
			<Content className="layout-content">
				<Outlet />
			</Content>
		</Layout>
	);
}
