"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr";

export function DeleteLinkCard({
  onDelete,
}: {
  onDelete: () => Promise<void>;
}) {
  return (
    <Card className="border-red-500">
      <CardHeader className="rounded-t-xl border-red-500 bg-red-50">
        <CardTitle className="text-red-600">Delete Link</CardTitle>
        <CardToolbar>
          <Button variant="destructive" type="button" onClick={onDelete}>
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
    </Card>
  );
}
