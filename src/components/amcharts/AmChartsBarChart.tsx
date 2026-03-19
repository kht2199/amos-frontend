import * as am5 from "@amcharts/amcharts5";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import * as am5xy from "@amcharts/amcharts5/xy";
import { useLayoutEffect, useRef } from "react";

const data = [
	{ category: "1월", value: 120 },
	{ category: "2월", value: 200 },
	{ category: "3월", value: 150 },
	{ category: "4월", value: 80 },
	{ category: "5월", value: 70 },
	{ category: "6월", value: 110 },
];

export default function AmChartsBarChart() {
	const chartRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		if (!chartRef.current) return;
		const root = am5.Root.new(chartRef.current);
		root.setThemes([am5themes_Animated.new(root)]);

		const chart = root.container.children.push(
			am5xy.XYChart.new(root, {
				panX: false,
				panY: false,
				wheelX: "none",
				wheelY: "none",
			}),
		);

		const xAxis = chart.xAxes.push(
			am5xy.CategoryAxis.new(root, {
				categoryField: "category",
				renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 }),
			}),
		);
		xAxis.data.setAll(data);

		const yAxis = chart.yAxes.push(
			am5xy.ValueAxis.new(root, {
				renderer: am5xy.AxisRendererY.new(root, {}),
			}),
		);

		const series = chart.series.push(
			am5xy.ColumnSeries.new(root, {
				name: "생산량",
				xAxis: xAxis,
				yAxis: yAxis,
				valueYField: "value",
				categoryXField: "category",
				tooltip: am5.Tooltip.new(root, { labelText: "{valueY}" }),
			}),
		);
		series.data.setAll(data);

		chart.set("cursor", am5xy.XYCursor.new(root, {}));

		return () => root.dispose();
	}, []);

	return <div ref={chartRef} className="chart-container" />;
}
