import * as am5 from "@amcharts/amcharts5";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import * as am5xy from "@amcharts/amcharts5/xy";
import { useLayoutEffect, useRef } from "react";

const data = [
	{ category: "1월", bar: 120, line: 93 },
	{ category: "2월", bar: 200, line: 87 },
	{ category: "3월", bar: 150, line: 91 },
	{ category: "4월", bar: 80, line: 95 },
	{ category: "5월", bar: 70, line: 89 },
	{ category: "6월", bar: 110, line: 92 },
];

export default function AmChartsBarLineChart() {
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

		const yAxisLeft = chart.yAxes.push(
			am5xy.ValueAxis.new(root, {
				renderer: am5xy.AxisRendererY.new(root, {}),
			}),
		);

		const yAxisRight = chart.yAxes.push(
			am5xy.ValueAxis.new(root, {
				renderer: am5xy.AxisRendererY.new(root, { opposite: true }),
				max: 100,
			}),
		);

		const barSeries = chart.series.push(
			am5xy.ColumnSeries.new(root, {
				name: "생산량",
				xAxis: xAxis,
				yAxis: yAxisLeft,
				valueYField: "bar",
				categoryXField: "category",
				tooltip: am5.Tooltip.new(root, { labelText: "{valueY}" }),
			}),
		);
		barSeries.data.setAll(data);

		const lineSeries = chart.series.push(
			am5xy.LineSeries.new(root, {
				name: "가동률",
				xAxis: xAxis,
				yAxis: yAxisRight,
				valueYField: "line",
				categoryXField: "category",
				tooltip: am5.Tooltip.new(root, { labelText: "{valueY}%" }),
			}),
		);
		lineSeries.strokes.template.setAll({ strokeWidth: 2 });
		lineSeries.bullets.push(() =>
			am5.Bullet.new(root, {
				sprite: am5.Circle.new(root, {
					radius: 4,
					fill: lineSeries.get("fill"),
				}),
			}),
		);
		lineSeries.data.setAll(data);

		chart.set("cursor", am5xy.XYCursor.new(root, {}));
		chart.children.unshift(
			am5.Legend.new(root, {
				centerX: am5.percent(50),
				x: am5.percent(50),
			}),
		);

		return () => root.dispose();
	}, []);

	return <div ref={chartRef} className="chart-container" />;
}
