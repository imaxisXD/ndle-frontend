import React, { ReactNode } from "react";

interface UrlListHeaderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

export function UrlListHeader({
  title,
  description,
  children,
}: UrlListHeaderProps) {
  return (
    <div className="border-border border-b p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
