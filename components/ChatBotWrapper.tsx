"use client";

import dynamic from "next/dynamic";

const ChatBot = dynamic(() => import("@/components/BotpressWebChat"), {
  ssr: false,
});

export default function ChatBotWrapper() {
  return <ChatBot />;
}