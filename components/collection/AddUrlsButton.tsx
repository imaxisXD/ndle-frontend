import React from "react";
import { HotkeyButton } from "@/components/ui/hotkey-button";
import { Button } from "@/components/ui/button";

interface AddUrlsButtonProps {
  onOpen: () => void;
  hotkey?: string | string[];
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  disabled?: boolean;
}

export function AddUrlsButton({
  onOpen,
  hotkey = ["n"],
  label = "Add Links",
  variant = "default",
  size = "default",
  disabled = false,
}: AddUrlsButtonProps) {
  // Render using HotkeyButton so users can open with ⌘K / Ctrl+K
  return (
    <HotkeyButton
      hotkey={hotkey}
      onClick={onOpen}
      variant={variant}
      size={size}
      disabled={disabled}
    >
      {label}
    </HotkeyButton>
  );
}

export default AddUrlsButton;
