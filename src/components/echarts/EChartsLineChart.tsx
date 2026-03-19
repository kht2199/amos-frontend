import * as echarts from "echarts";
import { useEffect, useRef } from "react";

export default function EChartsLineChart() {
	const chartRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!chartRef.current) return;
		const chart = echarts.init(chartRef.current);
		chart.setOption({
			tooltip: { trigger: "axis" },
			xAxis: {
				type: "category",
				data: ["1월", "2월", "3월", "4월", "5월", "6월"],
			},
			yAxis: { type: "value" },
			series: [
				{
					name: "가동률",
					type: "line",
					data: [93, 87, 91, 95, 89, 92],
					smooth: true,
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
