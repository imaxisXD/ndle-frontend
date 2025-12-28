"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  MagicWandIcon,
  PaperPlaneTiltIcon,
} from "@phosphor-icons/react/dist/ssr";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AiChatProps {
  linkUrl: string;
  existingConversations?: Array<{
    id: string;
    question: string;
    answer: string;
    timestamp: string;
  }>;
}

export function AiChat({ linkUrl, existingConversations = [] }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>(
    existingConversations.flatMap((conv) => [
      {
        id: `${conv.id}-q`,
        role: "user" as const,
        content: conv.question,
        timestamp: conv.timestamp,
      },
      {
        id: `${conv.id}-a`,
        role: "assistant" as const,
        content: conv.answer,
        timestamp: conv.timestamp,
      },
    ]),
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { add } = useToast();

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: input,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: `Based on the content at ${linkUrl}, here's what I found: ${getMockResponse(
          input,
        )}`,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
      add({
        type: "success",
        title: "AI response generated",
        description: `AI response generated ${getMockResponse(input)}`,
      });
    }, 1500);
  };

  const getMockResponse = (question: string) => {
    const lowerQuestion = question.toLowerCase();
    if (lowerQuestion.includes("summary") || lowerQuestion.includes("about")) {
      return "This page provides comprehensive information about the topic, covering key concepts, practical examples, and best practices. It's particularly useful for understanding the fundamentals and getting started quickly.";
    }
    if (lowerQuestion.includes("how") || lowerQuestion.includes("what")) {
      return "The content explains the process step-by-step, with clear instructions and helpful examples. It covers both basic and advanced use cases, making it suitable for users at different skill levels.";
    }
    return "I've analyzed the content and found relevant information that addresses your question. The page contains detailed explanations and practical guidance on this topic.";
  };

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
          <MagicWandIcon className="mx-auto h-8 w-8 text-yellow-600" />
          <p className="text-foreground mt-2 text-sm">Ask AI about this link</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Get instant answers about the content, key points, or specific
            details
          </p>
        </div>
      ) : (
        <div className="max-h-96 space-y-3 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : ""}
            >
              {message.role === "assistant" ? (
                <div className="border-border bg-card rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <MagicWandIcon className="h-3.5 w-3.5 text-yellow-600" />
                    <span className="text-muted-foreground text-xs font-medium">
                      AI Assistant
                    </span>
                  </div>
                  <p className="text-foreground text-sm leading-relaxed">
                    {message.content}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {message.timestamp}
                  </p>
                </div>
              ) : (
                <div className="bg-muted max-w-[80%] rounded-lg p-4">
                  <p className="text-foreground text-sm">{message.content}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {message.timestamp}
                  </p>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="border-border bg-card rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2">
                <MagicWandIcon className="h-3.5 w-3.5 animate-pulse text-yellow-600" />
                <span className="text-muted-foreground text-xs font-medium">
                  AI is thinking...
                </span>
              </div>
              <div className="flex gap-1">
                <div className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full" />
                <div className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full [animation-delay:0.2s]" />
                <div className="bg-muted-foreground h-2 w-2 animate-bounce rounded-full [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-border bg-card rounded-lg border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask anything about this link..."
            disabled={isLoading}
            className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-foreground text-background hover:bg-foreground/90 rounded-md p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PaperPlaneTiltIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setInput("What is this page about?")}
            className="border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground rounded-full border px-3 py-1 text-xs transition-colors"
          >
            What is this about?
          </button>
          <button
            type="button"
            onClick={() => setInput("Summarize the key points")}
            className="border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground rounded-full border px-3 py-1 text-xs transition-colors"
          >
            Key points
          </button>
          <button
            type="button"
            onClick={() => setInput("How can I use this information?")}
            className="border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground rounded-full border px-3 py-1 text-xs transition-colors"
          >
            How to use
          </button>
        </div>
      </div>
    </div>
  );
}
