import { Flex } from "antd";
import AlarmPanel from "../../shared/components/AlarmPanel";
import Campus3D from "../../shared/components/campus3d/Campus3D";

export default function MainPage() {
	return (
		<div style={{ width: "100%", height: "calc(100vh - 64px)" }}>
			<Flex style={{ width: "100%", height: "100%" }}>
				<div style={{ flex: 1, position: "relative" }}>
					<Campus3D />
				</div>
				<AlarmPanel />
			</Flex>
		</div>
	);
}
