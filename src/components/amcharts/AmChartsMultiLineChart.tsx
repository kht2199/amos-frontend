import * as am5 from "@amcharts/amcharts5";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import * as am5xy from "@amcharts/amcharts5/xy";
import { useLayoutEffect, useRef } from "react";

// 범위가 서로 전혀 다른 4개 데이터
const data = [
	{ month: "1월", temp: 3, pressure: 1013, humidity: 45, co2: 410 },
	{ month: "2월", temp: 5, pressure: 1010, humidity: 48, co2: 415 },
	{ month: "3월", temp: 10, pressure: 1008, humidity: 55, co2: 420 },
	{ month: "4월", temp: 16, pressure: 1006, humidity: 62, co2: 425 },
	{ month: "5월", temp: 22, pressure: 1005, humidity: 68, co2: 430 },
	{ month: "6월", temp: 27, pressure: 1004, humidity: 72, co2: 435 },
	{ month: "7월", temp: 30, pressure: 1003, humidity: 78, co2: 440 },
	{ month: "8월", temp: 29, pressure: 1004, humidity: 76, co2: 438 },
	{ month: "9월", temp: 24, pressure: 1007, humidity: 65, co2: 432 },
	{ month: "10월", temp: 17, pressure: 1010, humidity: 58, co2: 425 },
	{ month: "11월", temp: 10, pressure: 1012, humidity: 50, co2: 418 },
	{ month: "12월", temp: 4, pressure: 1014, humidity: 44, co2: 412 },
];

const SERIES_CONFIG = [
	{ name: "온도(°C)", field: "temp", color: 0xee6666, opposite: false },
	{ name: "기압(hPa)", field: "pressure", color: 0x5470c6, opposite: true },
	{ name: "습도(%)", field: "humidity", color: 0x91cc75, opposite: false },
	{ name: "CO₂(ppm)", field: "co2", color: 0xfac858, opposite: true },
] as const;

export default function AmChartsMultiLineChart() {
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

		const yAxes = SERIES_CONFIG.map((cfg, i) => {
			const yAxis = chart.yAxes.push(
				am5xy.ValueAxis.new(root, {
					renderer: am5xy.AxisRendererY.new(root, { opposite: cfg.opposite }),
				}),
			);
			const renderer = yAxis.get("renderer");
			renderer.labels.template.setAll({
				fill: am5.color(cfg.color),
				fontSize: 11,
			});
			// 첫 번째 좌/우 축만 그리드 표시
			renderer.grid.template.setAll({ strokeOpacity: i < 2 ? 0.15 : 0 });
			return yAxis;
		});

		for (let i = 0; i < SERIES_CONFIG.length; i++) {
			const cfg = SERIES_CONFIG[i];
			const series = chart.series.push(
				am5xy.LineSeries.new(root, {
					name: cfg.name,
					xAxis: xAxis,
					yAxis: yAxes[i],
					valueYField: cfg.field,
					categoryXField: "month",
					stroke: am5.color(cfg.color),
					tooltip: am5.Tooltip.new(root, {
						labelText: `${cfg.name}: {valueY}`,
					}),
				}),
			);
			series.strokes.template.setAll({ strokeWidth: 2 });
			series.bullets.push(() =>
				am5.Bullet.new(root, {
					sprite: am5.Circle.new(root, {
						radius: 3,
						fill: am5.color(cfg.color),
					}),
				}),
			);
			const labelDy = i % 2 === 0 ? -10 : 10;
			const labelCenterY = i % 2 === 0 ? am5.percent(100) : am5.percent(0);
			series.bullets.push(() =>
				am5.Bullet.new(root, {
					sprite: am5.Label.new(root, {
						text: "{valueY}",
						fill: am5.color(cfg.color),
						centerX: am5.percent(50),
						centerY: labelCenterY,
						dy: labelDy,
						fontSize: 10,
						populateText: true,
					}),
				}),
			);
			series.data.setAll(data);
		}

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
