"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MagicWand, Send, Bookmark, EditPencil, Check } from "iconoir-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface LinkAIChatPanelProps {
  shortUrl: string;
  fullUrl: string;
}

// Dummy saved notes for demonstration
const DUMMY_NOTES = [
  {
    id: "1",
    content:
      "Important resource for product development strategies. Contains MVP approach insights.",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, // 2 days ago
  },
  {
    id: "2",
    content: "Good examples of data visualization patterns to reference later.",
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5, // 5 days ago
  },
];

// Dummy existing conversations
const DUMMY_CONVERSATIONS: Message[] = [
  {
    id: "1",
    role: "user",
    content: "What is this page about?",
    timestamp: "2 days ago",
  },
  {
    id: "2",
    role: "assistant",
    content:
      "This page provides comprehensive information about building SaaS products, covering key concepts like MVP development, pricing strategies, and growth tactics. It's particularly useful for founders and product managers.",
    timestamp: "2 days ago",
  },
];

export function LinkAIChatPanel({ shortUrl, fullUrl }: LinkAIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(DUMMY_CONVERSATIONS);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

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
        content: getMockResponse(input),
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
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

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="space-y-6">
      {/* Notes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="text-muted-foreground size-4" />
              <CardTitle className="text-sm font-medium">
                Notes & Memory
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingNote(!isAddingNote)}
              className="gap-1.5 text-xs"
            >
              {isAddingNote ? (
                <>
                  <Check className="size-3.5" />
                  Done
                </>
              ) : (
                <>
                  <EditPencil className="size-3.5" />
                  Add Note
                </>
              )}
            </Button>
          </div>
          <CardDescription>
            Save important information about this link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAddingNote && (
            <div className="flex gap-2">
              <Input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Add a note about this link..."
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={() => {
                  // Would save note here
                  setNoteInput("");
                  setIsAddingNote(false);
                }}
                disabled={!noteInput.trim()}
              >
                Save
              </Button>
            </div>
          )}

          {DUMMY_NOTES.length > 0 ? (
            <div className="space-y-2">
              {DUMMY_NOTES.map((note) => (
                <div
                  key={note.id}
                  className="bg-muted/30 border-border rounded-lg border p-3"
                >
                  <p className="text-sm">{note.content}</p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {formatRelativeTime(note.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No notes saved yet. Add a note to remember important details.
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Chat Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MagicWand className="size-4 text-yellow-600" />
            <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
            <Badge variant="primary" className="text-xs">
              {messages.filter((m) => m.role === "user").length} conversations
            </Badge>
          </div>
          <CardDescription>
            Ask questions about the content at this link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Chat Messages */}
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
                <MagicWand className="mx-auto h-8 w-8 text-yellow-600" />
                <p className="text-foreground mt-2 text-sm font-medium">
                  Ask AI about this link
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Get instant answers about the content, key points, or specific
                  details
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "flex justify-end" : ""}
                >
                  {message.role === "assistant" ? (
                    <div className="border-border bg-card rounded-lg border p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <MagicWand className="h-3.5 w-3.5 text-yellow-600" />
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
                    <div className="bg-muted max-w-[80%] rounded-lg p-3">
                      <p className="text-foreground text-sm">
                        {message.content}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {message.timestamp}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="border-border bg-card rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <MagicWand className="h-3.5 w-3.5 animate-pulse text-yellow-600" />
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

          {/* Input Area */}
          <div className="border-border rounded-lg border p-3">
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
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}
