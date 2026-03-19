import * as am5 from "@amcharts/amcharts5";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import * as am5xy from "@amcharts/amcharts5/xy";
import { useLayoutEffect, useRef } from "react";

const data = [
	{ month: "1월", temp: -3, power: 520 },
	{ month: "2월", temp: 0, power: 480 },
	{ month: "3월", temp: 6, power: 380 },
	{ month: "4월", temp: 14, power: 280 },
	{ month: "5월", temp: 20, power: 220 },
	{ month: "6월", temp: 26, power: 190 },
	{ month: "7월", temp: 30, power: 180 },
	{ month: "8월", temp: 29, power: 195 },
	{ month: "9월", temp: 23, power: 250 },
	{ month: "10월", temp: 15, power: 330 },
	{ month: "11월", temp: 7, power: 420 },
	{ month: "12월", temp: -1, power: 510 },
];

export default function AmChartsLineDualAxisChart() {
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
				categoryField: "month",
				renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 30 }),
			}),
		);
		xAxis.data.setAll(data);

		// 좌측 Y축: 기온
		const yAxisTemp = chart.yAxes.push(
			am5xy.ValueAxis.new(root, {
				renderer: am5xy.AxisRendererY.new(root, {}),
			}),
		);
		const tempRendered = yAxisTemp.get("renderer");
		tempRendered.labels.template.setAll({ fill: am5.color(0x5470c6) });
		tempRendered.grid.template.setAll({ strokeOpacity: 0.2 });

		// 우측 Y축: 전력소비
		const yAxisPower = chart.yAxes.push(
			am5xy.ValueAxis.new(root, {
				renderer: am5xy.AxisRendererY.new(root, { opposite: true }),
			}),
		);
		const powerRenderer = yAxisPower.get("renderer");
		powerRenderer.labels.template.setAll({ fill: am5.color(0xee6666) });
		powerRenderer.grid.template.setAll({ strokeOpacity: 0 });

		// 기온 라인 시리즈
		const tempSeries = chart.series.push(
			am5xy.LineSeries.new(root, {
				name: "기온(°C)",
				xAxis: xAxis,
				yAxis: yAxisTemp,
				valueYField: "temp",
				categoryXField: "month",
				stroke: am5.color(0x5470c6),
				tooltip: am5.Tooltip.new(root, { labelText: "기온: {valueY}°C" }),
			}),
		);
		tempSeries.strokes.template.setAll({ strokeWidth: 2 });
		tempSeries.bullets.push(() =>
			am5.Bullet.new(root, {
				sprite: am5.Circle.new(root, { radius: 4, fill: am5.color(0x5470c6) }),
			}),
		);
		tempSeries.bullets.push(() =>
			am5.Bullet.new(root, {
				sprite: am5.Label.new(root, {
					text: "{valueY}°C",
					fill: am5.color(0x5470c6),
					centerX: am5.percent(50),
					centerY: am5.percent(100),
					dy: -10,
					fontSize: 11,
					populateText: true,
				}),
			}),
		);
		tempSeries.data.setAll(data);

		// 전력소비 라인 시리즈
		const powerSeries = chart.series.push(
			am5xy.LineSeries.new(root, {
				name: "전력소비(kWh)",
				xAxis: xAxis,
				yAxis: yAxisPower,
				valueYField: "power",
				categoryXField: "month",
				stroke: am5.color(0xee6666),
				tooltip: am5.Tooltip.new(root, { labelText: "전력: {valueY}kWh" }),
			}),
		);
		powerSeries.strokes.template.setAll({ strokeWidth: 2 });
		powerSeries.bullets.push(() =>
			am5.Bullet.new(root, {
				sprite: am5.Circle.new(root, { radius: 4, fill: am5.color(0xee6666) }),
			}),
		);
		powerSeries.bullets.push(() =>
			am5.Bullet.new(root, {
				sprite: am5.Label.new(root, {
					text: "{valueY}",
					fill: am5.color(0xee6666),
					centerX: am5.percent(50),
					centerY: am5.percent(0),
					dy: 10,
					fontSize: 11,
					populateText: true,
				}),
			}),
		);
		powerSeries.data.setAll(data);

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
