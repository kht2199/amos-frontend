import { Table } from "antd";
import { useMemo } from "react";
import { type AlertHistoryRecord, antdColumns } from "./columns";
import { generateSampleData } from "./sampleData";

export default function AntdAlertHistory() {
	const dataSource = useMemo<AlertHistoryRecord[]>(
		() => generateSampleData(),
		[],
	);

	return (
		<Table<AlertHistoryRecord>
			columns={antdColumns}
			dataSource={dataSource}
			rowKey="id"
			pagination={{ pageSize: 20 }}
		/>
	);
}
