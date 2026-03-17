import type { ColDef } from "ag-grid-community";

// 테이블 1: 카테고리 목록
export interface CategoryRecord {
	id: number;
	categoryType: string;
	categoryCode: string;
	groupCode: string;
	description: string;
}

// 테이블 2: 속성-값
export interface PropertyRecord {
	id: number;
	property: string;
	value: string;
}

// 테이블 3: 알림 수신자
export interface RecipientRecord {
	id: number;
	name: string;
	userTag: string;
	receive: boolean;
}

// 테이블 4: 항목-값-비고
export interface DetailRecord {
	id: number;
	item: string;
	value: string;
	remark: string;
}

export const categoryColumns: ColDef<CategoryRecord>[] = [
	{ field: "id", headerName: "FAB_ID", width: 80 },
	{ field: "categoryType", headerName: "CATG_TYP", flex: 1, minWidth: 110 },
	{ field: "categoryCode", headerName: "CATG_CD", flex: 1, minWidth: 110 },
	{ field: "groupCode", headerName: "IDC_GRP_CD", flex: 1, minWidth: 120 },
	{ field: "description", headerName: "INDEX", flex: 1.5, minWidth: 180 },
];

export const propertyColumns: ColDef<PropertyRecord>[] = [
	{ field: "property", headerName: "PROPERTY", flex: 1, minWidth: 150 },
	{
		field: "value",
		headerName: "VALUE",
		flex: 1.5,
		minWidth: 200,
		editable: true,
	},
];

export const recipientColumns: ColDef<RecipientRecord>[] = [
	{ field: "id", headerName: "EMP_NO", width: 90 },
	{ field: "name", headerName: "NAME", flex: 1, minWidth: 120 },
	{ field: "userTag", headerName: "USER_TAG", flex: 1, minWidth: 120 },
	{
		field: "receive",
		headerName: "RECEIVED",
		width: 100,
		cellDataType: "boolean",
		editable: true,
	},
];

export const detailColumns: ColDef<DetailRecord>[] = [
	{ field: "item", headerName: "항목", flex: 1, minWidth: 150 },
	{
		field: "value",
		headerName: "값",
		flex: 1.5,
		minWidth: 200,
		editable: true,
	},
	{
		field: "remark",
		headerName: "비고",
		flex: 1,
		minWidth: 150,
		editable: true,
	},
];
