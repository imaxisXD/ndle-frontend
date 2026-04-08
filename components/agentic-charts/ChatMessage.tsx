"use client";

/**
 * Chat Message Component
 *
 * Renders individual messages in the chart chat conversation.
 */

import { cn } from "@/lib/utils";
import { User, Robot } from "@phosphor-icons/react";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  children: React.ReactNode;
  className?: string;
}

export function ChatMessage({ role, children, className }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg p-3",
        isUser
          ? "bg-zinc-100 dark:bg-zinc-800"
          : "border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-blue-500 text-white"
            : "bg-amber-500/20 text-amber-600 dark:text-amber-400",
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" weight="bold" />
        ) : (
          <Robot className="h-4 w-4" weight="bold" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {isUser ? "You" : "AI Assistant"}
        </p>
        <div className="text-sm text-zinc-900 dark:text-zinc-100">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ChatMessageTextProps {
  text: string;
  className?: string;
}

export function ChatMessageText({ text, className }: ChatMessageTextProps) {
  return <p className={cn("whitespace-pre-wrap", className)}>{text}</p>;
}

interface ChatMessageLoadingProps {
  className?: string;
}

export function ChatMessageLoading({ className }: ChatMessageLoadingProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
    </div>
  );
}
