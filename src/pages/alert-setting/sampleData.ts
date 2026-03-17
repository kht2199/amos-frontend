import type {
	CategoryRecord,
	DetailRecord,
	PropertyRecord,
	RecipientRecord,
} from "./types";

const CATEGORY_TYPES = [
	"Temperature",
	"Pressure",
	"Humidity",
	"Vibration",
	"Power",
];
const GROUP_CODES = ["GRP-A", "GRP-B", "GRP-C"];
const DESCRIPTIONS = [
	"High temperature alert threshold",
	"Low pressure warning level",
	"Humidity out of range detection",
	"Abnormal vibration monitoring",
	"Power supply fluctuation alert",
	"Sensor disconnection warning",
	"Equipment maintenance reminder",
	"Network latency threshold",
	"Disk usage critical level",
	"Process timeout detection",
];

const NAMES = [
	"김민수",
	"이서연",
	"박지훈",
	"최수빈",
	"정현우",
	"강예진",
	"조태현",
	"윤하은",
	"장준영",
	"임다은",
	"김성호",
	"이지민",
	"박우진",
	"최소영",
	"정동혁",
];

export function generateCategories(): CategoryRecord[] {
	const records: CategoryRecord[] = [];
	for (let i = 0; i < 20; i++) {
		records.push({
			id: i + 1,
			categoryType: CATEGORY_TYPES[i % CATEGORY_TYPES.length],
			categoryCode: `CAT-${String(i + 1).padStart(3, "0")}`,
			groupCode: GROUP_CODES[i % GROUP_CODES.length],
			description: DESCRIPTIONS[i % DESCRIPTIONS.length],
		});
	}
	return records;
}

export function generateProperties(categoryId: number): PropertyRecord[] {
	return [
		{ id: 1, property: "Category ID", value: String(categoryId) },
		{ id: 2, property: "Threshold Min", value: String(10 + categoryId * 5) },
		{ id: 3, property: "Threshold Max", value: String(50 + categoryId * 10) },
		{
			id: 4,
			property: "Check Interval (sec)",
			value: String(30 + categoryId * 2),
		},
		{ id: 5, property: "Retry Count", value: String(1 + (categoryId % 5)) },
		{ id: 6, property: "Enabled", value: categoryId % 3 === 0 ? "N" : "Y" },
		{
			id: 7,
			property: "Priority",
			value: categoryId % 2 === 0 ? "High" : "Normal",
		},
	];
}

export function generateRecipients(categoryId: number): RecipientRecord[] {
	return NAMES.map((name, i) => ({
		id: 1000 + i + 1,
		name,
		userTag: `USR${String(i + 1).padStart(3, "0")}`,
		receive: (i + categoryId) % 3 === 0,
	}));
}

export function generateDetails(categoryId: number): DetailRecord[] {
	return [
		{
			id: 1,
			item: "알림 메시지",
			value: `Alert for category ${categoryId}`,
			remark: "",
		},
		{
			id: 2,
			item: "발송 간격",
			value: `${5 + categoryId}분`,
			remark: "최소 1분",
		},
		{
			id: 3,
			item: "최대 발송 횟수",
			value: String(3 + (categoryId % 5)),
			remark: "0=무제한",
		},
		{
			id: 4,
			item: "알림 등급",
			value: categoryId % 2 === 0 ? "긴급" : "일반",
			remark: "",
		},
		{
			id: 5,
			item: "에스컬레이션",
			value: categoryId % 3 === 0 ? "사용" : "미사용",
			remark: "",
		},
	];
}
