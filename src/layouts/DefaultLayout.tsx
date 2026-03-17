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
		<Layout style={{ minHeight: "100vh" }}>
			<Header
				style={{
					display: "flex",
					alignItems: "center",
					padding: "0 16px",
					background: "#000",
					borderBottom: "none",
				}}
			>
				<button
					type="button"
					onClick={() => navigate("/")}
					style={{
						color: "#fff",
						fontSize: 20,
						fontWeight: 700,
						letterSpacing: 2,
						minWidth: 100,
						cursor: "pointer",
						background: "none",
						border: "none",
						padding: 0,
					}}
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
						style={{
							flex: 1,
							justifyContent: "flex-start",
							background: "transparent",
						}}
					/>
				</ConfigProvider>
				<div style={{ display: "flex", gap: 4 }}>
					<Button
						type="text"
						icon={<SearchOutlined />}
						style={{ color: "#fff" }}
					/>
					<Button
						type="text"
						icon={<BellOutlined />}
						style={{ color: "#fff" }}
					/>
					<Button
						type="text"
						icon={<UserOutlined />}
						style={{ color: "#fff" }}
					/>
				</div>
			</Header>
			<div
				style={{
					height: 50,
					background: "#fff",
					borderBottom: "1px solid #e0e0e0",
				}}
			/>
			<Content
				style={{
					display: "flex",
					gap: 12,
					padding: 16,
					overflow: "hidden",
					background: "#f5f5f5",
					height: "calc(100vh - 114px)",
				}}
			>
				<Outlet />
			</Content>
		</Layout>
	);
}
