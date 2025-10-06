"use client";

import { useState } from "react";

import { RefreshIcon, SparklesIcon } from "./icons";
import { useToast } from "@/hooks/use-toast";

interface AiSummaryGeneratorProps {
  url: string;
  existingSummary?: string;
  onSummaryGenerated?: (summary: string) => void;
}

export function AiSummaryGenerator({
  url,
  existingSummary,
  onSummaryGenerated,
}: AiSummaryGeneratorProps) {
  const [summary, setSummary] = useState(existingSummary || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const { add } = useToast();

  const generateSummary = async () => {
    setIsGenerating(true);

    // Simulate AI summary generation
    setTimeout(() => {
      const mockSummary =
        "This resource provides comprehensive information on the topic, covering essential concepts, practical applications, and best practices. It includes detailed explanations, real-world examples, and actionable insights that can be immediately applied. The content is well-structured and suitable for both beginners and advanced users looking to deepen their understanding.";

      setSummary(mockSummary);
      onSummaryGenerated?.(mockSummary);
      setIsGenerating(false);
      add({
        type: "success",
        title: "AI summary generated successfully",
        description: `AI summary generated successfully ${mockSummary}`,
      });
    }, 2000);
  };

  return (
    <div className="border-border bg-card rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-yellow-600" />
          <h4 className="text-sm font-medium">AI Summary</h4>
        </div>
        <button
          type="button"
          onClick={generateSummary}
          disabled={isGenerating}
          className="border-border bg-background hover:bg-accent flex items-center gap-2 rounded-md border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshIcon
            className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`}
          />
          {isGenerating ? "Generating..." : summary ? "Regenerate" : "Generate"}
        </button>
      </div>

      {summary ? (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {summary}
        </p>
      ) : (
        <div className="border-border bg-muted/30 rounded-lg border border-dashed p-6 text-center">
          <SparklesIcon className="text-muted-foreground mx-auto h-6 w-6" />
          <p className="text-muted-foreground mt-2 text-xs">No summary yet</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Click generate to create an AI summary
          </p>
        </div>
      )}

      {summary && (
        <div className="border-border mt-3 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            Generated using AI • <span className="text-foreground">GPT-4</span>
          </p>
        </div>
      )}
    </div>
  );
}
