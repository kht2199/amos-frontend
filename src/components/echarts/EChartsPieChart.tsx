import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function EChartsPieChart() {
	const chartRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!chartRef.current) return;
		const chart = echarts.init(chartRef.current);
		chart.setOption({
			tooltip: { trigger: "item" },
			legend: { orient: "vertical", left: "left" },
			series: [
				{
					name: "설비 가동 현황",
					type: "pie",
					radius: "50%",
					data: [
						{ value: 335, name: "A 라인" },
						{ value: 310, name: "B 라인" },
						{ value: 234, name: "C 라인" },
						{ value: 135, name: "D 라인" },
						{ value: 148, name: "E 라인" },
					],
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
