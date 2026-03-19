import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import { useLayoutEffect, useRef } from "react";

const data = [
	{ category: "A 라인", value: 335 },
	{ category: "B 라인", value: 310 },
	{ category: "C 라인", value: 234 },
	{ category: "D 라인", value: 135 },
	{ category: "E 라인", value: 148 },
];

export default function AmChartsPieChart() {
	const chartRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!chartRef.current) return;
		const root = am5.Root.new(chartRef.current);
		root.setThemes([am5themes_Animated.new(root)]);

		const chart = root.container.children.push(
			am5percent.PieChart.new(root, {}),
		);

		const series = chart.series.push(
			am5percent.PieSeries.new(root, {
				valueField: "value",
				categoryField: "category",
				tooltip: am5.Tooltip.new(root, {
					labelText: "{category}: {value}",
				}),
			}),
		);
		series.data.setAll(data);

		chart.children.push(
			am5.Legend.new(root, {
				centerX: am5.percent(50),
				x: am5.percent(50),
				layout: root.horizontalLayout,
			}),
		);

		return () => root.dispose();
	}, []);

	return <div ref={chartRef} className="chart-container" />;
}
