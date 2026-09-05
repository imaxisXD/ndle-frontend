"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bookmark, EditPencil, Check } from "iconoir-react";
import { formatRelativeDate } from "@/lib/utils";

interface LinkNotesPanelProps {
  shortUrl: string;
  fullUrl: string;
}

interface SavedNote {
  id: string;
  content: string;
  createdAt: number;
}

export function LinkNotesPanel({ shortUrl, fullUrl }: LinkNotesPanelProps) {
  const storageKey = `ndle_link_notes:${shortUrl || fullUrl}`;
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [loadedNotesKey, setLoadedNotesKey] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      setNotes(stored ? (JSON.parse(stored) as SavedNote[]) : []);
    } catch {
      setNotes([]);
    }
    setLoadedNotesKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedNotesKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch {
      // Local notes are best-effort when storage is unavailable.
    }
  }, [notes, loadedNotesKey, storageKey]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="text-muted-foreground size-4" />
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
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
                Add note
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Save notes about this link in this browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAddingNote && (
          <div className="flex gap-2">
            <Input
              aria-label="Note"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Add a note about this link..."
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={() => {
                const trimmed = noteInput.trim();
                if (trimmed) {
                  setNotes((prev) => [
                    {
                      id: crypto.randomUUID(),
                      content: trimmed,
                      createdAt: Date.now(),
                    },
                    ...prev,
                  ]);
                }
                setNoteInput("");
                setIsAddingNote(false);
              }}
              disabled={!noteInput.trim()}
            >
              Save
            </Button>
          </div>
        )}

        {notes.length > 0 ? (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-muted/30 border-border rounded-lg border p-3"
              >
                <p className="text-sm">{note.content}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {formatRelativeDate(note.createdAt)}
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
  );
}
