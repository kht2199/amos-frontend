import { Typography } from "antd";
import * as echarts from "echarts";
import { useEffect, useRef, useState } from "react";

// ── 데이터 타입 ──────────────────────────────────────────────────────────────

type SimpleChartData = { labels: string[]; values: number[] };

type QueueSavingData = {
	labels: string[];
	saved: number[];
	potential: number[];
	target: number[];
	baseline: number[];
};

// ── 공통 차트 래퍼 ────────────────────────────────────────────────────────────

function ChartTitle({ children }: { children: React.ReactNode }) {
	return (
		<Typography.Text
			strong
			style={{ fontSize: 12, display: "block", marginBottom: 4, color: "#555" }}
		>
			{children}
		</Typography.Text>
	);
}

// ── Canceled Queue 차트 ───────────────────────────────────────────────────────

function CanceledQueueChart({ isActive }: { isActive: boolean }) {
	const chartRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<echarts.ECharts | null>(null);
	const [data, setData] = useState<SimpleChartData | null>(null);

	useEffect(() => {
		fetch("/trend-canceled-queue.json")
			.then((r) => r.json())
			.then(setData);
	}, []);

	useEffect(() => {
		if (!chartRef.current || !data) return;
		const chart = echarts.init(chartRef.current);
		instanceRef.current = chart;
		chart.setOption({
			tooltip: { trigger: "axis" },
			grid: { top: 16, right: 8, bottom: 32, left: 36 },
			xAxis: {
				type: "category",
				data: data.labels,
				axisLabel: { fontSize: 10 },
			},
			yAxis: { type: "value", axisLabel: { fontSize: 10 } },
			series: [
				{
					name: "Canceled Queue",
					type: "bar",
					data: data.values,
					itemStyle: { color: "#fa8c16" },
				},
			],
		});
		const onResize = () => chart.resize();
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
			chart.dispose();
			instanceRef.current = null;
		};
	}, [data]);

	useEffect(() => {
		if (isActive) instanceRef.current?.resize();
	}, [isActive]);

	return <div ref={chartRef} style={{ width: "100%", height: 160 }} />;
}

// ── OHT Usage 차트 ────────────────────────────────────────────────────────────

function OhtUsageChart({ isActive }: { isActive: boolean }) {
	const chartRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<echarts.ECharts | null>(null);
	const [data, setData] = useState<SimpleChartData | null>(null);

	useEffect(() => {
		fetch("/trend-oht-usage.json")
			.then((r) => r.json())
			.then(setData);
	}, []);

	useEffect(() => {
		if (!chartRef.current || !data) return;
		const chart = echarts.init(chartRef.current);
		instanceRef.current = chart;
		chart.setOption({
			tooltip: { trigger: "axis" },
			grid: { top: 16, right: 8, bottom: 32, left: 36 },
			xAxis: {
				type: "category",
				data: data.labels,
				axisLabel: { fontSize: 10 },
			},
			yAxis: {
				type: "value",
				max: 100,
				axisLabel: { fontSize: 10, formatter: "{value}%" },
			},
			series: [
				{
					name: "OHT Usage",
					type: "bar",
					data: data.values,
					itemStyle: { color: "#1677ff" },
				},
			],
		});
		const onResize = () => chart.resize();
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
			chart.dispose();
			instanceRef.current = null;
		};
	}, [data]);

	useEffect(() => {
		if (isActive) instanceRef.current?.resize();
	}, [isActive]);

	return <div ref={chartRef} style={{ width: "100%", height: 160 }} />;
}

// ── Queue Saving 차트 (스택 바 + 적색/청색 라인) ──────────────────────────────

function QueueSavingChart({ isActive }: { isActive: boolean }) {
	const chartRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<echarts.ECharts | null>(null);
	const [data, setData] = useState<QueueSavingData | null>(null);

	useEffect(() => {
		fetch("/trend-queue-saving.json")
			.then((r) => r.json())
			.then(setData);
	}, []);

	useEffect(() => {
		if (!chartRef.current || !data) return;
		const chart = echarts.init(chartRef.current);
		instanceRef.current = chart;
		chart.setOption({
			tooltip: { trigger: "axis" },
			legend: {
				data: ["Saved", "Potential", "Target", "Baseline"],
				top: 0,
				textStyle: { fontSize: 10 },
				itemWidth: 12,
				itemHeight: 8,
			},
			grid: { top: 36, right: 8, bottom: 32, left: 36 },
			xAxis: {
				type: "category",
				data: data.labels,
				axisLabel: { fontSize: 10 },
			},
			yAxis: { type: "value", axisLabel: { fontSize: 10 } },
			series: [
				{
					name: "Saved",
					type: "bar",
					stack: "saving",
					data: data.saved,
					itemStyle: { color: "#52c41a" },
				},
				{
					name: "Potential",
					type: "bar",
					stack: "saving",
					data: data.potential,
					itemStyle: { color: "#b7eb8f" },
				},
				{
					name: "Target",
					type: "line",
					data: data.target,
					symbol: "none",
					lineStyle: { color: "#ff4d4f", width: 2, type: "dashed" },
					itemStyle: { color: "#ff4d4f" },
					label: {
						show: true,
						position: "end",
						formatter: "{c}",
						fontSize: 10,
						color: "#ff4d4f",
					},
				},
				{
					name: "Baseline",
					type: "line",
					data: data.baseline,
					symbol: "none",
					lineStyle: { color: "#1677ff", width: 2, type: "dashed" },
					itemStyle: { color: "#1677ff" },
					label: {
						show: true,
						position: "end",
						formatter: "{c}",
						fontSize: 10,
						color: "#1677ff",
					},
				},
			],
		});
		const onResize = () => chart.resize();
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
			chart.dispose();
			instanceRef.current = null;
		};
	}, [data]);

	useEffect(() => {
		if (isActive) instanceRef.current?.resize();
	}, [isActive]);

	return <div ref={chartRef} style={{ width: "100%", height: 200 }} />;
}

// ── TrendPanel ────────────────────────────────────────────────────────────────

export default function TrendPanel({ isActive }: { isActive: boolean }) {
	return (
		<div style={{ padding: "8px 0" }}>
			<ChartTitle>Canceled Queue</ChartTitle>
			<CanceledQueueChart isActive={isActive} />

			<ChartTitle>OHT Usage</ChartTitle>
			<OhtUsageChart isActive={isActive} />

			<ChartTitle>Queue Saving</ChartTitle>
			<QueueSavingChart isActive={isActive} />
		</div>
	);
}
