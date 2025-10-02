"use client"

import { useState } from "react"
import { SparklesIcon, RefreshIcon } from "./icons"
import { useToast } from "@/lib/toast-context"

interface AiSummaryGeneratorProps {
  url: string
  existingSummary?: string
  onSummaryGenerated?: (summary: string) => void
}

export function AiSummaryGenerator({ url, existingSummary, onSummaryGenerated }: AiSummaryGeneratorProps) {
  const [summary, setSummary] = useState(existingSummary || "")
  const [isGenerating, setIsGenerating] = useState(false)
  const { showToast } = useToast()

  const generateSummary = async () => {
    setIsGenerating(true)

    // Simulate AI summary generation
    setTimeout(() => {
      const mockSummary =
        "This resource provides comprehensive information on the topic, covering essential concepts, practical applications, and best practices. It includes detailed explanations, real-world examples, and actionable insights that can be immediately applied. The content is well-structured and suitable for both beginners and advanced users looking to deepen their understanding."

      setSummary(mockSummary)
      onSummaryGenerated?.(mockSummary)
      setIsGenerating(false)
      showToast("AI summary generated successfully", "success")
    }, 2000)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-yellow-600" />
          <h4 className="font-mono text-sm font-medium">AI Summary</h4>
        </div>
        <button
          onClick={generateSummary}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1 font-mono text-xs transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshIcon className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating..." : summary ? "Regenerate" : "Generate"}
        </button>
      </div>

      {summary ? (
        <p className="font-mono text-sm text-muted-foreground leading-relaxed">{summary}</p>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
          <SparklesIcon className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-mono text-xs text-muted-foreground">No summary yet</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">Click generate to create an AI summary</p>
        </div>
      )}

      {summary && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="font-mono text-xs text-muted-foreground">
            Generated using AI • <span className="text-foreground">GPT-4</span>
          </p>
        </div>
      )}
    </div>
  )
}
