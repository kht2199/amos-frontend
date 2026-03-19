import { Button, Card, List, Space, Typography } from "antd";
import { useState } from "react";
import { TextField } from "@/lib/antd";

const { TextArea } = TextField;

interface Message {
	role: "user" | "assistant";
	content: string;
}

const SAMPLE_RESPONSES: Record<string, string> = {
	default:
		"죄송합니다. 현재 LLM 서비스에 연결되어 있지 않습니다. 이 페이지는 샘플 UI입니다.",
	안녕: "안녕하세요! 무엇을 도와드릴까요?",
	도움: "이 페이지는 LLM 채팅 인터페이스 샘플입니다. 메시지를 입력하고 전송 버튼을 눌러보세요.",
};

function getSampleResponse(input: string): string {
	const key = Object.keys(SAMPLE_RESPONSES).find(
		(k) => k !== "default" && input.includes(k),
	);
	return SAMPLE_RESPONSES[key ?? "default"];
}

export default function LlmPage() {
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSend = () => {
		const text = input.trim();
		if (!text) return;

		const userMsg: Message = { role: "user", content: text };
		setMessages((prev) => [...prev, userMsg]);
		setInput("");
		setLoading(true);

		setTimeout(() => {
			const assistantMsg: Message = {
				role: "assistant",
				content: getSampleResponse(text),
			};
			setMessages((prev) => [...prev, assistantMsg]);
			setLoading(false);
		}, 500);
	};

	return (
		<div className="page-container">
			<Typography.Title level={3} className="page-title">
				LLM
			</Typography.Title>
			<Card
				className="llm-chat-card"
				styles={{
					body: {
						flex: 1,
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
					},
				}}
			>
				<List
					className="llm-message-list"
					dataSource={messages}
					locale={{ emptyText: "메시지를 입력하세요." }}
					renderItem={(msg, i) => (
						<List.Item
							key={i}
							className={
								msg.role === "user" ? "llm-msg-user" : "llm-msg-assistant"
							}
						>
							<Card
								className={
									msg.role === "user"
										? "llm-bubble--user"
										: "llm-bubble--assistant"
								}
							>
								<Typography.Text strong>
									{msg.role === "user" ? "나" : "AI"}
								</Typography.Text>
								<br />
								{msg.content}
							</Card>
						</List.Item>
					)}
				/>
				<Space.Compact className="llm-input-area">
					<TextArea
						value={input}
						onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
							setInput(e.target.value)
						}
						onPressEnter={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
							if (!e.shiftKey) {
								e.preventDefault();
								handleSend();
							}
						}}
						placeholder="메시지를 입력하세요..."
						autoSize={{ minRows: 1, maxRows: 3 }}
						className="llm-textarea"
					/>
					<Button type="primary" onClick={handleSend} loading={loading}>
						전송
					</Button>
				</Space.Compact>
			</Card>
		</div>
	);
}
