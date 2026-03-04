import type { BuildingInfo } from "./types";

interface BuildingPanelProps {
	selectedBuilding: string;
	panelData: BuildingInfo;
	panelPos: { x: number; y: number };
	onClose: () => void;
}

/* ============================================================================
 * BuildingPanel — 선택된 건물 정보 패널 컴포넌트
 *
 * 건물명, 유형, 상세 설명, 사양(SPECIFICATIONS), 공정 흐름(PROCESS FLOW)을
 * 다크 글라스모피즘 스타일로 표시한다.
 * ============================================================================ */
export default function BuildingPanel({
	selectedBuilding,
	panelData,
	panelPos,
	onClose,
}: BuildingPanelProps) {
	const panelW = 300;
	const panelMaxH = 360;
	let px = panelPos.x + 100;
	let py = panelPos.y - 60;
	const vw = window.innerWidth,
		vh = window.innerHeight;
	// 패널이 화면 밖으로 나가지 않도록 위치 보정
	if (px + panelW > vw - 10) px = panelPos.x - panelW - 20;
	if (py < 10) py = 10;
	if (py + panelMaxH > vh - 10) py = vh - panelMaxH - 10;

	return (
		<div
			style={{
				position: "absolute",
				left: px,
				top: py,
				zIndex: 100,
				width: panelW,
				maxHeight: panelMaxH,
				background: "rgba(10,10,20,0.92)",
				backdropFilter: "blur(20px)",
				border: "1px solid rgba(255,255,255,0.08)",
				borderRadius: 14,
				overflow: "hidden",
				animation: "slideIn 0.3s ease",
			}}
		>
			{/* 헤더: 건물명 + 유형 + 닫기 버튼 */}
			<div
				style={{
					padding: "14px 18px 10px",
					borderBottom: "1px solid rgba(255,255,255,0.06)",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
				}}
			>
				<div>
					<div
						style={{
							fontSize: 17,
							fontWeight: 800,
							color: "#fff",
							display: "flex",
							alignItems: "center",
							gap: 8,
							marginBottom: 3,
						}}
					>
						{/* 건물 색상 인디케이터 */}
						<span
							style={{
								display: "inline-block",
								width: 10,
								height: 10,
								borderRadius: 3,
								background: `#${panelData.color.toString(16).padStart(6, "0")}`,
							}}
						/>
						{selectedBuilding}
					</div>
					<div
						style={{
							fontSize: 10,
							color: "#888",
							letterSpacing: 2,
							textTransform: "uppercase",
						}}
					>
						{panelData.type}
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					style={{
						background: "rgba(255,255,255,0.06)",
						border: "none",
						color: "#999",
						fontSize: 14,
						cursor: "pointer",
						padding: "4px 8px",
						lineHeight: 1,
						borderRadius: 6,
						display: "flex",
						alignItems: "center",
						gap: 4,
					}}
				>
					&#10005; Close
				</button>
			</div>

			{/* 본문: 상세 설명 + 사양 + 공정 흐름 */}
			<div
				style={{
					padding: "12px 18px 16px",
					overflowY: "auto",
					maxHeight: "calc(100vh - 200px)",
				}}
			>
				{/* 상세 설명 (줄바꿈 지원) */}
				<div
					style={{
						fontSize: 12,
						color: "#aaa",
						lineHeight: 1.6,
						marginBottom: 12,
						whiteSpace: "pre-line",
					}}
				>
					{panelData.detail}
				</div>

				{/* SPECIFICATIONS 섹션 */}
				{panelData.specs && (
					<div style={{ marginBottom: 12 }}>
						<div
							style={{
								fontSize: 10,
								color: "#666",
								letterSpacing: 2,
								textTransform: "uppercase",
								marginBottom: 6,
							}}
						>
							SPECIFICATIONS
						</div>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
							{Object.entries(panelData.specs).map(([k, v]) => (
								<div
									key={k}
									style={{
										background: "rgba(255,255,255,0.04)",
										borderRadius: 6,
										padding: "4px 10px",
										fontSize: 11,
										color: "#bbb",
									}}
								>
									<span style={{ color: "#666", marginRight: 4 }}>{k}:</span>
									<span style={{ color: "#ddd" }}>{v}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* PROCESS FLOW 섹션: 화살표(→)로 연결된 공정 단계 */}
				{panelData.processFlow && (
					<div>
						<div
							style={{
								fontSize: 10,
								color: "#666",
								letterSpacing: 2,
								textTransform: "uppercase",
								marginBottom: 6,
							}}
						>
							PROCESS FLOW
						</div>
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: 4,
								alignItems: "center",
							}}
						>
							{panelData.processFlow.map((step, i) => (
								<span
									key={step}
									style={{ display: "flex", alignItems: "center", gap: 4 }}
								>
									<span
										style={{
											background: `rgba(${(panelData.color >> 16) & 0xff}, ${(panelData.color >> 8) & 0xff}, ${panelData.color & 0xff}, 0.15)`,
											color: `#${panelData.color.toString(16).padStart(6, "0")}`,
											borderRadius: 4,
											padding: "3px 8px",
											fontSize: 11,
											fontWeight: 600,
										}}
									>
										{step}
									</span>
									{i < panelData.processFlow.length - 1 && (
										<span style={{ color: "#444", fontSize: 10 }}>→</span>
									)}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
