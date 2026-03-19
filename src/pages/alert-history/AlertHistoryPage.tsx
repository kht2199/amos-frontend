import { Tabs, Typography } from "antd";
import AgGridAlertHistory from "./AgGridAlertHistory";
import AntdAlertHistory from "./AntdAlertHistory";
import SearchFilters from "./SearchFilters";

export default function AlertHistoryPage() {
	return (
		<div className="page-container">
			<Typography.Title level={3} className="page-title">
				알림 이력
			</Typography.Title>
			<SearchFilters />
			<Tabs
				defaultActiveKey="agGrid"
				className="tabs-fill-height"
				items={[
					{
						key: "agGrid",
						label: "AG Grid",
						children: <AgGridAlertHistory />,
					},
					{
						key: "antd",
						label: "Antd Table",
						children: <AntdAlertHistory />,
					},
				]}
			/>
		</div>
	);
}
