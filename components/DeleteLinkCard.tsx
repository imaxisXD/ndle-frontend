"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogAction,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/base-dialog";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr";

export function DeleteLinkCard({
  onDelete,
}: {
  onDelete: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="border-red-500">
      <CardHeader className="rounded-t-xl border-red-500 bg-red-50">
        <CardTitle className="text-red-600">Delete Link</CardTitle>
        <CardToolbar>
          <Button
            variant="destructive"
            type="button"
            onClick={() => setOpen(true)}
          >
            <TrashIcon className="h-4 w-4" /> Delete Link
          </Button>
        </CardToolbar>
      </CardHeader>
      <CardContent className="flex flex-col items-start justify-between gap-2">
        <CardDescription className="">
          Delete this shortened link permanently.
        </CardDescription>
        <p className="text-muted-foreground mt-1 text-xs">
          This will remove all the data associated with this link, including
          clicks, analytics and metadata.
        </p>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card gap-6">
          <div>
            <DialogTitle className="text-base">
              Permanently delete this link?
            </DialogTitle>
            <DialogDescription className="mt-2">
              This removes the short link, analytics, and saved metadata. This
              action cannot be undone.
            </DialogDescription>
          </div>
          <DialogFooter className="flex items-center border-t border-dashed pt-4">
            <DialogClose className="border-border border" disabled={deleting}>
              Cancel
            </DialogClose>
            <DialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <TrashIcon className="size-4 fill-white" />
              {deleting ? "Deleting" : "Delete permanently"}
            </DialogAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
