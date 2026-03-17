import {
	AllCommunityModule,
	type GridApi,
	ModuleRegistry,
	type RowClickedEvent,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { Button, Card, Form, Select, Typography } from "antd";
import { useCallback, useMemo, useRef, useState } from "react";
import {
	generateCategories,
	generateDetails,
	generateProperties,
	generateRecipients,
} from "./sampleData";
import {
	type CategoryRecord,
	categoryColumns,
	detailColumns,
	propertyColumns,
	recipientColumns,
} from "./types";

ModuleRegistry.registerModules([AllCommunityModule]);

const cardBodyStyle: React.CSSProperties = {
	flex: 1,
	minHeight: 0,
	padding: 8,
};
const cardStyle: React.CSSProperties = {
	height: "100%",
	display: "flex",
	flexDirection: "column",
};

export default function AlertSettingPage() {
	const categoryGridRef = useRef<AgGridReact<CategoryRecord>>(null);

	const categories = useMemo(() => generateCategories(), []);
	const [selectedId, setSelectedId] = useState<number | null>(null);

	const properties = useMemo(
		() => (selectedId ? generateProperties(selectedId) : []),
		[selectedId],
	);
	const recipients = useMemo(
		() => (selectedId ? generateRecipients(selectedId) : []),
		[selectedId],
	);
	const details = useMemo(
		() => (selectedId ? generateDetails(selectedId) : []),
		[selectedId],
	);

	const onCategoryRowClicked = useCallback(
		(event: RowClickedEvent<CategoryRecord>) => {
			if (event.data) {
				setSelectedId(event.data.id);
			}
		},
		[],
	);

	const onCategoryReady = useCallback(
		(params: { api: GridApi<CategoryRecord> }) => {
			const firstNode = params.api.getDisplayedRowAtIndex(0);
			if (firstNode) {
				firstNode.setSelected(true);
				setSelectedId(firstNode.data?.id ?? null);
			}
		},
		[],
	);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				overflow: "hidden",
			}}
		>
			<Typography.Title level={3} style={{ flexShrink: 0, marginBottom: 8 }}>
				알람 설정
			</Typography.Title>

			<Form layout="inline" style={{ flexShrink: 0, marginBottom: 8 }}>
				<Form.Item label="Fab">
					<Select
						defaultValue="A"
						style={{ width: 120 }}
						options={[
							{ label: "A", value: "A" },
							{ label: "B", value: "B" },
						]}
					/>
				</Form.Item>
				<Form.Item>
					<Button type="primary">조회</Button>
				</Form.Item>
			</Form>

			<div
				style={{
					flex: 1,
					minHeight: 0,
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gridTemplateRows: "1fr 1fr",
					gap: 12,
				}}
			>
				{/* 테이블 1: 카테고리 목록 */}
				<Card
					title="Category"
					style={cardStyle}
					styles={{ body: cardBodyStyle }}
				>
					<div className="ag-theme-quartz" style={{ height: "100%" }}>
						<AgGridReact
							ref={categoryGridRef}
							rowData={categories}
							columnDefs={categoryColumns}
							rowSelection="single"
							onRowClicked={onCategoryRowClicked}
							onGridReady={onCategoryReady}
							getRowId={(p) => p.data.id.toString()}
						/>
					</div>
				</Card>

				{/* 테이블 2: 속성 */}
				<Card
					title="Properties"
					style={cardStyle}
					styles={{ body: cardBodyStyle }}
				>
					<div className="ag-theme-quartz" style={{ height: "100%" }}>
						<AgGridReact
							rowData={properties}
							columnDefs={propertyColumns}
							getRowId={(p) => p.data.id.toString()}
							singleClickEdit={true}
						/>
					</div>
				</Card>

				{/* 테이블 3: 알림 수신자 */}
				<Card
					title="알림 설정"
					style={cardStyle}
					styles={{ body: cardBodyStyle }}
				>
					<div className="ag-theme-quartz" style={{ height: "100%" }}>
						<AgGridReact
							rowData={recipients}
							columnDefs={recipientColumns}
							getRowId={(p) => p.data.id.toString()}
							singleClickEdit={true}
						/>
					</div>
				</Card>

				{/* 테이블 4: 상세 항목 */}
				<Card
					title="상세 정보"
					style={cardStyle}
					styles={{ body: cardBodyStyle }}
				>
					<div className="ag-theme-quartz" style={{ height: "100%" }}>
						<AgGridReact
							rowData={details}
							columnDefs={detailColumns}
							getRowId={(p) => p.data.id.toString()}
							singleClickEdit={true}
						/>
					</div>
				</Card>
			</div>
		</div>
	);
}
