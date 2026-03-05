import {
	Badge,
	Card,
	Divider,
	Flex,
	Statistic,
	Tabs,
	Tag,
	Typography,
} from "antd";
import { useState } from "react";
import TrendPanel from "./TrendPanel";

type AlarmState = "error" | "warning" | "normal";

type AlarmCard = {
	id: string;
	title: string;
	subtitle: string;
	state: AlarmState;
	datetime: string;
};

type LevelData = {
	level: number;
	cards: AlarmCard[];
};

const STATE_CARD_STYLE: Record<
	AlarmState,
	{ border: string; background: string; color: string }
> = {
	error: { border: "#ff4d4f", background: "#ff4d4f", color: "#fff" },
	warning: { border: "#faad14", background: "#faad14", color: "#fff" },
	normal: { border: "#52c41a", background: "#52c41a", color: "#fff" },
};

const STATE_ALARM_STYLE: Record<
	AlarmState,
	{ border: string; background: string; color: string; subColor: string }
> = {
	error: {
		border: "#ff4d4f",
		background: "#fff1f0",
		color: "#cf1322",
		subColor: "#ff4d4f",
	},
	warning: {
		border: "#faad14",
		background: "#fffbe6",
		color: "#ad6800",
		subColor: "#faad14",
	},
	normal: {
		border: "#52c41a",
		background: "#f6ffed",
		color: "#389e0d",
		subColor: "#52c41a",
	},
};

const STATE_TAG_COLOR: Record<AlarmState, string> = {
	error: "error",
	warning: "warning",
	normal: "success",
};

const STATE_BADGE_STATUS: Record<AlarmState, "error" | "warning" | "success"> =
	{
		error: "error",
		warning: "warning",
		normal: "success",
	};

const LEVEL_COUNTS: { label: string; count: number; state: AlarmState }[] = [
	{ label: "LV1", count: 12, state: "error" },
	{ label: "LV2", count: 5, state: "error" },
	{ label: "LV3", count: 3, state: "warning" },
	{ label: "LV4", count: 1, state: "warning" },
	{ label: "LV5", count: 0, state: "normal" },
];

const LEVEL_DATA: LevelData[] = [
	{
		level: 1,
		cards: [
			{
				id: "1",
				title: "M14",
				subtitle: "Current Queue too High",
				state: "error",
				datetime: "2026-02-24 10:32",
			},
			{
				id: "2",
				title: "M07",
				subtitle: "Temperature Exceeded",
				state: "error",
				datetime: "2026-02-24 09:51",
			},
		],
	},
	{
		level: 2,
		cards: [
			{
				id: "3",
				title: "M08",
				subtitle: "Pressure Sensor Fault",
				state: "error",
				datetime: "2026-02-24 11:05",
			},
			{
				id: "4",
				title: "M21",
				subtitle: "Flow Rate Warning",
				state: "warning",
				datetime: "2026-02-24 10:44",
			},
		],
	},
	{
		level: 3,
		cards: [
			{
				id: "5",
				title: "M03",
				subtitle: "Vibration Detected",
				state: "warning",
				datetime: "2026-02-24 08:20",
			},
		],
	},
	{
		level: 4,
		cards: [
			{
				id: "6",
				title: "M11",
				subtitle: "Maintenance Scheduled",
				state: "warning",
				datetime: "2026-02-24 07:00",
			},
		],
	},
	{
		level: 5,
		cards: [
			{
				id: "7",
				title: "M05",
				subtitle: "System Normal",
				state: "normal",
				datetime: "2026-02-24 06:30",
			},
		],
	},
];

function LevelSummaryCard({
	label,
	count,
	state,
}: {
	label: string;
	count: number;
	state: AlarmState;
}) {
	const { border, background, color } = STATE_CARD_STYLE[state];
	return (
		<Card
			style={{
				flex: 1,
				border: `1px solid ${border}`,
				background,
				textAlign: "center",
				borderRadius: 0,
			}}
			styles={{ body: { padding: "6px 4px" } }}
		>
			<Statistic
				title={<span style={{ fontSize: 10, color }}>{label}</span>}
				value={count}
				valueStyle={{ fontSize: 18, color }}
			/>
		</Card>
	);
}

function AlarmCardItem({ card, level }: { card: AlarmCard; level: number }) {
	const { border, background, color, subColor } = STATE_ALARM_STYLE[card.state];
	return (
		<Card
			style={{
				border: `1px solid ${border}`,
				background,
				marginBottom: 6,
				borderRadius: 0,
			}}
			styles={{ body: { padding: "6px 10px" } }}
		>
			<Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
				<Flex align="center" gap={6}>
					<Badge status={STATE_BADGE_STATUS[card.state]} />
					<Typography.Text
						strong
						style={{
							fontSize: 14,
							fontWeight: 700,
							color,
							whiteSpace: "nowrap",
						}}
					>
						{card.title}
					</Typography.Text>
					<Typography.Text
						style={{ fontSize: 11, color, whiteSpace: "nowrap" }}
					>
						{card.subtitle}
					</Typography.Text>
				</Flex>
				<Tag
					color={STATE_TAG_COLOR[card.state]}
					style={{ margin: "0 0 0 4px", fontSize: 10, flexShrink: 0 }}
				>
					L{level}
				</Tag>
			</Flex>
			<Typography.Text style={{ fontSize: 10, color: subColor }}>
				{card.datetime}
			</Typography.Text>
		</Card>
	);
}

function TodaysAlarmContent() {
	return (
		<>
			<Flex gap={4} style={{ marginBottom: 16 }}>
				{LEVEL_COUNTS.map((lv) => (
					<LevelSummaryCard key={lv.label} {...lv} />
				))}
			</Flex>

			{LEVEL_DATA.map((lvData) => (
				<div key={lvData.level}>
					<Divider
						orientation="left"
						orientationMargin={0}
						plain
						style={{ margin: "10px 0 8px", fontSize: 14, fontWeight: 700 }}
					>
						Level {lvData.level}
					</Divider>
					{lvData.cards.map((card) => (
						<AlarmCardItem key={card.id} card={card} level={lvData.level} />
					))}
				</div>
			))}
		</>
	);
}

export default function AlarmPanel() {
	const [activeTab, setActiveTab] = useState("alarm");

	return (
		<div
			style={{
				width: 300,
				flexShrink: 0,
				height: "calc(100vh - 64px)",
				overflowY: "auto",
				background: "#fafafa",
				borderLeft: "1px solid #e8e8e8",
			}}
		>
			<Tabs
				activeKey={activeTab}
				onChange={setActiveTab}
				size="small"
				style={{ padding: "0 10px" }}
				items={[
					{
						key: "alarm",
						label: "Today's Alarm",
						children: <TodaysAlarmContent />,
					},
					{
						key: "trend",
						label: "Trend",
						children: <TrendPanel isActive={activeTab === "trend"} />,
					},
				]}
			/>
		</div>
	);
}
