"use client";

import { useState } from "react";

import { SendIcon, SparklesIcon } from "./icons";
import { useToast } from "@/hooks/use-toast";

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
    ])
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
          input
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
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <SparklesIcon className="mx-auto h-8 w-8 text-yellow-600" />
          <p className="mt-2 font-mono text-sm text-foreground">
            Ask AI about this link
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Get instant answers about the content, key points, or specific
            details
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : ""}
            >
              {message.role === "assistant" ? (
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <SparklesIcon className="h-3.5 w-3.5 text-yellow-600" />
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      AI Assistant
                    </span>
                  </div>
                  <p className="font-mono text-sm text-foreground leading-relaxed">
                    {message.content}
                  </p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {message.timestamp}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-4 max-w-[80%]">
                  <p className="font-mono text-sm text-foreground">
                    {message.content}
                  </p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {message.timestamp}
                  </p>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <SparklesIcon className="h-3.5 w-3.5 text-yellow-600 animate-pulse" />
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  AI is thinking...
                </span>
              </div>
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask anything about this link..."
            disabled={isLoading}
            className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-md bg-foreground p-2 text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setInput("What is this page about?")}
            className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            What is this about?
          </button>
          <button
            type="button"
            onClick={() => setInput("Summarize the key points")}
            className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Key points
          </button>
          <button
            type="button"
            onClick={() => setInput("How can I use this information?")}
            className="rounded-full border border-border bg-background px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            How to use
          </button>
        </div>
      </div>
    </div>
  );
}
