import { useCampus3dStore } from "../store/campus3dStore";

export function LoadingOverlay() {
	const loading = useCampus3dStore((s) => s.loading);
	const loadProgress = useCampus3dStore((s) => s.loadProgress);

	if (!loading) return null;

	return (
		<div
			style={{
				position: "absolute",
				inset: 0,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(10,10,20,0.95)",
				zIndex: 1000,
			}}
		>
			<div
				style={{
					fontSize: 13,
					color: "#888",
					letterSpacing: 3,
					marginBottom: 16,
				}}
			>
				Loading...
			</div>
			<div
				style={{
					width: 200,
					height: 4,
					background: "rgba(255,255,255,0.1)",
					borderRadius: 2,
				}}
			>
				<div
					style={{
						width: `${loadProgress}%`,
						height: "100%",
						background: "linear-gradient(90deg, #4af, #48bb78)",
						borderRadius: 2,
						transition: "width 0.3s",
					}}
				/>
			</div>
			<div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
				{loadProgress}%
			</div>
		</div>
	);
}
