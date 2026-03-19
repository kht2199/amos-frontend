import { Button, Checkbox, DatePicker, Form, Select } from "antd";

const SEND_TYPE_OPTIONS = [
	"All",
	"SMS",
	"Pager",
	"Sound",
	"AWS Popup",
	"EMS",
	"반송",
	"Mail",
	"MCS Popup",
	"Integrated",
];

export default function SearchFilters() {
	return (
		<Form layout="inline" className="search-filters">
			<Form.Item label="FAB" name="fab">
				<Select
					placeholder="선택"
					allowClear
					style={{ width: 100 }}
					options={[
						{ label: "A", value: "A" },
						{ label: "B", value: "B" },
					]}
				/>
			</Form.Item>
			<Form.Item label="기간 (From)" name="dateFrom">
				<DatePicker placeholder="시작일" />
			</Form.Item>
			<Form.Item label="기간 (To)" name="dateTo">
				<DatePicker placeholder="종료일" />
			</Form.Item>
			<Form.Item label="정보유형" name="infoType">
				<Select
					defaultValue="All"
					style={{ width: 120 }}
					options={[{ label: "All", value: "All" }]}
				/>
			</Form.Item>
			<Form.Item label="송신유형" name="sendType">
				<Checkbox.Group options={SEND_TYPE_OPTIONS} defaultValue={["All"]} />
			</Form.Item>
			<Form.Item>
				<Button type="primary">조회</Button>
			</Form.Item>
		</Form>
	);
}
