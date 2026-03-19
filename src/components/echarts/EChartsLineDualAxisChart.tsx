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
const temperature = [-3, 0, 6, 14, 20, 26, 30, 29, 23, 15, 7, -1];
const powerConsumption = [
	520, 480, 380, 280, 220, 190, 180, 195, 250, 330, 420, 510,
];

export default function EChartsLineDualAxisChart() {
	const chartRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!chartRef.current) return;
		const chart = echarts.init(chartRef.current);
		chart.setOption({
			tooltip: { trigger: "axis" },
			legend: { data: ["기온(°C)", "전력소비(kWh)"] },
			xAxis: {
				type: "category",
				data: months,
				boundaryGap: false,
			},
			yAxis: [
				{
					type: "value",
					name: "기온(°C)",
					position: "left",
					axisLabel: { formatter: "{value}°C" },
					axisLine: { show: true, lineStyle: { color: "#5470c6" } },
					splitLine: { show: true },
				},
				{
					type: "value",
					name: "전력소비(kWh)",
					position: "right",
					axisLabel: { formatter: "{value}" },
					axisLine: { show: true, lineStyle: { color: "#ee6666" } },
					splitLine: { show: false },
				},
			],
			series: [
				{
					name: "기온(°C)",
					type: "line",
					yAxisIndex: 0,
					data: temperature,
					smooth: true,
					lineStyle: { color: "#5470c6", width: 2 },
					itemStyle: { color: "#5470c6" },
					label: {
						show: true,
						position: "top",
						formatter: "{c}°C",
						fontSize: 11,
						color: "#5470c6",
					},
				},
				{
					name: "전력소비(kWh)",
					type: "line",
					yAxisIndex: 1,
					data: powerConsumption,
					smooth: true,
					lineStyle: { color: "#ee6666", width: 2 },
					itemStyle: { color: "#ee6666" },
					label: {
						show: true,
						position: "bottom",
						formatter: "{c}",
						fontSize: 11,
						color: "#ee6666",
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
