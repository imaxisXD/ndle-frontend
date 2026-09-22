"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogAction,
} from "@/components/ui/base-dialog";
import { StatusBadge } from "./StatusBadge";
import type { DomainData } from "./types";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  CheckIcon,
  CopyIcon,
  InfoIcon,
  TrashIcon,
} from "@phosphor-icons/react/dist/ssr";
import { getShortDomain } from "@/lib/config";

interface DomainItemProps {
  domain: DomainData;
  onDelete: (id: Id<"custom_domains">) => void;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      variant={"ghost"}
      size={"icon"}
      onClick={handleCopy}
      className="hover:bg-gray-100"
    >
      {copied ? (
        <CheckIcon weight="bold" className="size-4 text-emerald-500" />
      ) : (
        <CopyIcon weight="duotone" className="size-4" />
      )}
    </Button>
  );
}

export function DomainItem({ domain, onDelete }: DomainItemProps) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const domainLabels = domain.domain.split(".");
  const isLikelyApexDomain = domainLabels.length === 2;
  const recordType = isLikelyApexDomain ? "ALIAS / ANAME" : "CNAME";
  const recordName = isLikelyApexDomain
    ? "@"
    : domainLabels.slice(0, -2).join(".");
  const shortDomain = getShortDomain();

  return (
    <div className="space-y-2 rounded-sm border border-dashed border-gray-300 p-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-1">
          <StatusBadge status={domain.status} />
          <span className="text-primary min-w-0 text-sm [overflow-wrap:anywhere]">
            {domain.domain}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant={"destructive"}
            size={"sm"}
            onClick={() => setIsDeleteOpen(true)}
          >
            <TrashIcon weight="duotone" className="size-4 fill-white" />
            <span className="sr-only sm:not-sr-only">Delete</span>
          </Button>
        </div>
      </div>

      {/* Pending: DNS Instructions */}
      {domain.status === "pending" && (
        <div className="border-border space-y-4 border-t pt-4">
          {/* DNS Records table */}
          <div className="rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-3">
              <h4 className="text-sm font-medium text-gray-900">
                Add this DNS record to your DNS provider
              </h4>
            </div>

            {/* Phones: one record per line, so the values and their copy
                buttons stay on screen. */}
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 px-4 py-3 text-sm sm:hidden">
              <dt className="text-xs font-medium text-gray-500">Type</dt>
              <dd className="font-mono text-gray-600">{recordType}</dd>
              <dt className="text-xs font-medium text-gray-500">Name</dt>
              <dd className="flex min-w-0 items-center gap-2">
                <code className="min-w-0 font-mono break-all text-gray-900">
                  {recordName}
                </code>
                <CopyButton value={recordName} />
              </dd>
              <dt className="text-xs font-medium text-gray-500">Content</dt>
              <dd className="flex min-w-0 items-center gap-2">
                <code className="min-w-0 font-mono break-all text-gray-900">
                  {shortDomain}
                </code>
                <CopyButton value={shortDomain} />
              </dd>
            </dl>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="w-20 px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Content</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 font-mono whitespace-nowrap text-gray-600">
                      {recordType}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-gray-900">
                          {recordName}
                        </code>
                        <CopyButton value={recordName} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-gray-900">
                          {shortDomain}
                        </code>
                        <CopyButton value={shortDomain} />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="flex items-start gap-1 pb-2 text-xs text-blue-500">
            <InfoIcon weight="duotone" className="mt-px size-4 shrink-0" />
            <span>
              DNS changes can take a few minutes to propagate. We check
              automatically.
            </span>
          </p>
        </div>
      )}
      {/* Failed */}
      {domain.status === "failed" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Verification failed</p>
          <p className="mt-1 text-red-600">
            Check your CNAME record and make sure Cloudflare proxy (orange
            cloud) is disabled.
          </p>
        </div>
      )}

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        domain={domain.domain}
        onConfirm={() => {
          onDelete(domain._id as Id<"custom_domains">);
          setIsDeleteOpen(false);
        }}
      />
    </div>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  domain,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card gap-6">
        <div>
          <DialogTitle className="text-base">
            Remove Domain <span className="text-blue-500">{domain}</span> ?
          </DialogTitle>
          <DialogDescription className="mt-2">
            Links using this domain will stop working.
          </DialogDescription>
        </div>
        <DialogFooter className="flex items-center border-t border-dashed pt-4">
          <DialogClose className="border-border border">Cancel</DialogClose>
          <DialogAction
            onClick={onConfirm}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            <TrashIcon weight="duotone" className="size-4 fill-white" />
            Remove Domain
          </DialogAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
