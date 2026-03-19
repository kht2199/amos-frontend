import { Typography } from "antd";
import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import { useOhtUsageMetrics } from "../../../mocks/api/hooks/useOhtUsageMetrics";
import { useTransferCancelMetrics } from "../../../mocks/api/hooks/useTransferCancelMetrics";
import { useTransferStoreMetrics } from "../../../mocks/api/hooks/useTransferStoreMetrics";

// ── 공통 차트 래퍼 ────────────────────────────────────────────────────────────

function ChartTitle({ children }: { children: React.ReactNode }) {
	return (
		<Typography.Text strong className="trend-chart-title">
			{children}
		</Typography.Text>
	);
}

// ── Canceled Queue 차트 ───────────────────────────────────────────────────────

function CanceledQueueChart({ isActive }: { isActive: boolean }) {
	const chartRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<echarts.ECharts | null>(null);
	const { data } = useTransferCancelMetrics();

	useEffect(() => {
		if (!chartRef.current || !data) return;
		const chart = echarts.init(chartRef.current);
		instanceRef.current = chart;
		chart.setOption({
			tooltip: { trigger: "axis" },
			grid: { top: 24, right: 8, bottom: 32, left: 36 },
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
					label: { show: true, position: "top", fontSize: 10 },
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

	return <div ref={chartRef} className="chart-container--sm" />;
}

// ── OHT Usage 차트 ────────────────────────────────────────────────────────────

function OhtUsageChart({ isActive }: { isActive: boolean }) {
	const chartRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<echarts.ECharts | null>(null);
	const { data } = useOhtUsageMetrics();

	useEffect(() => {
		if (!chartRef.current || !data) return;
		const chart = echarts.init(chartRef.current);
		instanceRef.current = chart;
		chart.setOption({
			tooltip: { trigger: "axis" },
			grid: { top: 24, right: 8, bottom: 32, left: 36 },
			xAxis: {
				type: "category",
				data: data.labels,
				axisLabel: { fontSize: 10 },
			},
			yAxis: { type: "value", axisLabel: { fontSize: 10 } },
			series: [
				{
					name: "OHT Usage",
					type: "bar",
					data: data.values,
					itemStyle: { color: "#1677ff" },
					label: { show: true, position: "top", fontSize: 10 },
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

	return <div ref={chartRef} className="chart-container--sm" />;
}

// ── Queue Saving 차트 (스택 바 + 적색/청색 라인) ──────────────────────────────

function QueueSavingChart({ isActive }: { isActive: boolean }) {
	const chartRef = useRef<HTMLDivElement>(null);
	const instanceRef = useRef<echarts.ECharts | null>(null);
	const { data } = useTransferStoreMetrics();

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
					label: {
						show: true,
						position: "inside",
						fontSize: 10,
						color: "#fff",
					},
				},
				{
					name: "Potential",
					type: "bar",
					stack: "saving",
					data: data.potential,
					itemStyle: { color: "#b7eb8f" },
					label: { show: true, position: "top", fontSize: 10 },
				},
				{
					name: "Target",
					type: "line",
					data: data.target,
					symbol: "circle",
					symbolSize: 5,
					lineStyle: { color: "#ff4d4f", width: 2, type: "dashed" },
					itemStyle: { color: "#ff4d4f" },
					label: {
						show: true,
						position: "top",
						fontSize: 10,
						color: "#ff4d4f",
					},
				},
				{
					name: "Baseline",
					type: "line",
					data: data.baseline,
					symbol: "circle",
					symbolSize: 5,
					lineStyle: { color: "#1677ff", width: 2, type: "dashed" },
					itemStyle: { color: "#1677ff" },
					label: {
						show: true,
						position: "top",
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

	return <div ref={chartRef} className="chart-container--md" />;
}

// ── TrendPanel ────────────────────────────────────────────────────────────────

export default function TrendPanel({ isActive }: { isActive: boolean }) {
	return (
		<div className="trend-panel-root">
			<ChartTitle>Canceled Queue</ChartTitle>
			<CanceledQueueChart isActive={isActive} />

			<ChartTitle>OHT Usage</ChartTitle>
			<OhtUsageChart isActive={isActive} />

			<ChartTitle>Queue Saving</ChartTitle>
			<QueueSavingChart isActive={isActive} />
		</div>
	);
}
