import * as echarts from "echarts";
import { useEffect, useRef } from "react";

const months = [
	"1월",
	"2월",
	"3월",
	"4월",
	"5월",
	"6월",
	"7월",
	"8월",
	"9월",
	"10월",
	"11월",
	"12월",
];

// 범위가 서로 전혀 다른 4개 데이터
const temperature = [3, 5, 10, 16, 22, 27, 30, 29, 24, 17, 10, 4]; // °C: 3~30
const pressure = [
	1013, 1010, 1008, 1006, 1005, 1004, 1003, 1004, 1007, 1010, 1012, 1014,
]; // hPa: ~1003~1014
const humidity = [45, 48, 55, 62, 68, 72, 78, 76, 65, 58, 50, 44]; // %: 44~78
const co2 = [410, 415, 420, 425, 430, 435, 440, 438, 432, 425, 418, 412]; // ppm: 410~440

export default function EChartsMultiLineChart() {
	const chartRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!chartRef.current) return;
		const chart = echarts.init(chartRef.current);
		chart.setOption({
			tooltip: { trigger: "axis" },
			legend: {
				data: ["온도(°C)", "기압(hPa)", "습도(%)", "CO₂(ppm)"],
				top: 0,
			},
			grid: { top: 60, left: 80, right: 120, bottom: 40 },
			xAxis: {
				type: "category",
				data: months,
				boundaryGap: false,
			},
			yAxis: [
				{
					// 좌측 1: 온도
					type: "value",
					name: "온도(°C)",
					position: "left",
					axisLine: { show: true, lineStyle: { color: "#ee6666" } },
					axisLabel: { formatter: "{value}°C", color: "#ee6666" },
					splitLine: { show: true },
				},
				{
					// 우측 1: 기압
					type: "value",
					name: "기압(hPa)",
					position: "right",
					axisLine: { show: true, lineStyle: { color: "#5470c6" } },
					axisLabel: { formatter: "{value}", color: "#5470c6" },
					splitLine: { show: false },
				},
				{
					// 우측 2: 습도 (offset으로 간격 조정)
					type: "value",
					name: "습도(%)",
					position: "right",
					offset: 80,
					axisLine: { show: true, lineStyle: { color: "#91cc75" } },
					axisLabel: { formatter: "{value}%", color: "#91cc75" },
					splitLine: { show: false },
				},
				{
					// 좌측 2: CO₂ (offset으로 간격 조정)
					type: "value",
					name: "CO₂(ppm)",
					position: "left",
					offset: 80,
					axisLine: { show: true, lineStyle: { color: "#fac858" } },
					axisLabel: { formatter: "{value}", color: "#fac858" },
					splitLine: { show: false },
				},
			],
			series: [
				{
					name: "온도(°C)",
					type: "line",
					yAxisIndex: 0,
					data: temperature,
					smooth: true,
					lineStyle: { color: "#ee6666", width: 2 },
					itemStyle: { color: "#ee6666" },
					label: {
						show: true,
						position: "top",
						fontSize: 10,
						color: "#ee6666",
					},
				},
				{
					name: "기압(hPa)",
					type: "line",
					yAxisIndex: 1,
					data: pressure,
					smooth: true,
					lineStyle: { color: "#5470c6", width: 2 },
					itemStyle: { color: "#5470c6" },
					label: {
						show: true,
						position: "bottom",
						fontSize: 10,
						color: "#5470c6",
					},
				},
				{
					name: "습도(%)",
					type: "line",
					yAxisIndex: 2,
					data: humidity,
					smooth: true,
					lineStyle: { color: "#91cc75", width: 2 },
					itemStyle: { color: "#91cc75" },
					label: {
						show: true,
						position: "top",
						fontSize: 10,
						color: "#91cc75",
					},
				},
				{
					name: "CO₂(ppm)",
					type: "line",
					yAxisIndex: 3,
					data: co2,
					smooth: true,
					lineStyle: { color: "#fac858", width: 2 },
					itemStyle: { color: "#fac858" },
					label: {
						show: true,
						position: "bottom",
						fontSize: 10,
						color: "#fac858",
					},
				},
			],
		});

		const onResize = () => chart.resize();
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
			chart.dispose();
		};
	}, []);

	return <div ref={chartRef} className="chart-container" />;
}
