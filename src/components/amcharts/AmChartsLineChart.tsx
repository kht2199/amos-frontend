import * as am5 from "@amcharts/amcharts5";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import * as am5xy from "@amcharts/amcharts5/xy";
import { useLayoutEffect, useRef } from "react";

const data = [
	{ category: "1월", value: 93 },
	{ category: "2월", value: 87 },
	{ category: "3월", value: 91 },
	{ category: "4월", value: 95 },
	{ category: "5월", value: 89 },
	{ category: "6월", value: 92 },
];

export default function AmChartsLineChart() {
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
			am5xy.LineSeries.new(root, {
				name: "가동률",
				xAxis: xAxis,
				yAxis: yAxis,
				valueYField: "value",
				categoryXField: "category",
				tooltip: am5.Tooltip.new(root, { labelText: "{valueY}%" }),
			}),
		);
		series.strokes.template.setAll({ strokeWidth: 2 });
		series.bullets.push(() =>
			am5.Bullet.new(root, {
				sprite: am5.Circle.new(root, { radius: 4, fill: series.get("fill") }),
			}),
		);
		series.data.setAll(data);

		chart.set("cursor", am5xy.XYCursor.new(root, {}));

		return () => root.dispose();
	}, []);

	return <div ref={chartRef} className="chart-container" />;
}
