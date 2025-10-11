import React from "react";

interface UrlListFooterProps {
  content: string;
}

export function UrlListFooter({ content }: UrlListFooterProps) {
  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground text-sm">{content}</p>
      </div>
    </div>
  );
}
