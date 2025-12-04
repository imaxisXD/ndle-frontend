import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "./button";
import { Kbd, KbdGroup } from "./kbd";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

interface HotkeyButtonProps
  extends Omit<React.ComponentProps<"button">, "onClick"> {
  hotkey: string | string[];
  onClick: () => void;
  variant?: VariantProps<typeof Button>["variant"];
  size?: VariantProps<typeof Button>["size"];
  asChild?: boolean;
  enabled?: boolean;
  enableOnFormTags?: boolean;
  kbdClassName?: string;
}

/**
 * HotkeyButton - A reusable button component with keyboard shortcut support
 *
 * Usage examples:
 * - Single key: <HotkeyButton hotkey="n" onClick={...}>Create</HotkeyButton>
 * - Multiple keys: <HotkeyButton hotkey={["n", "c"]} onClick={...}>Create</HotkeyButton>
 * - With modifiers: <HotkeyButton hotkey="meta+n" onClick={...}>Create</HotkeyButton>
 * - Multiple modifiers: <HotkeyButton hotkey="meta+enter" onClick={...}>Submit</HotkeyButton>
 * - Conditional enabling: <HotkeyButton hotkey="n" enabled={!isDialogOpen} onClick={...}>Create</HotkeyButton>
 *
 * Supported modifiers: meta (⌘/Ctrl), ctrl, shift (⇧), alt (⌥), cmd, control, option
 * Special keys: enter (↵), space (␣), escape (Esc), backspace (⌫), delete (⌦), tab (⇥)
 *
 * Note: Modifier combinations like "meta+enter" will render as separate Kbd components
 * Use the `enabled` prop to conditionally enable/disable hotkeys (useful for dialogs)
 */

function formatHotkey(hotkey: string): string[] {
  const parts = hotkey.split("+").map((part) => part.trim().toLowerCase());

  const modifierMap: Record<string, string> = {
    meta: "⌘", // react-hotkeys-hook uses 'meta' for cross-platform modifier
    ctrl: "Ctrl",
    shift: "⇧",
    alt: "⌥",
    cmd: "⌘",
    control: "Ctrl",
    option: "⌥",
    enter: "↵",
    space: "␣",
    escape: "Esc",
    backspace: "⌫",
    delete: "⌦",
    tab: "⇥",
  };

  const formattedParts = parts.map((part) => {
    if (modifierMap[part]) {
      return modifierMap[part];
    }
    // For regular keys, capitalize them
    return part.toUpperCase();
  });

  return formattedParts;
}

export function HotkeyButton({
  hotkey,
  onClick,
  children,
  enabled = true,
  enableOnFormTags = true,
  kbdClassName,
  ...props
}: HotkeyButtonProps) {
  // Check if hotkey is empty
  const hasHotkey = Array.isArray(hotkey)
    ? hotkey.length > 0 && hotkey.some((key) => key.trim() !== "")
    : hotkey.trim() !== "";

  // Register hotkeys with react-hotkeys-hook only if hotkey is provided
  useHotkeys(hotkey, onClick, {
    preventDefault: true,
    enableOnFormTags,
    enabled: enabled && hasHotkey,
  });

  const renderHotkeyDisplay = () => {
    // Don't render anything if no hotkey is provided
    if (!hasHotkey) {
      return null;
    }

    if (Array.isArray(hotkey)) {
      return (
        <KbdGroup>
          {hotkey.map((key, index) => {
            const formattedKeys = formatHotkey(key);
            return formattedKeys.map((formattedKey, keyIndex) => (
              <Kbd key={`${index}-${keyIndex}`} className={kbdClassName}>
                {formattedKey}
              </Kbd>
            ));
          })}
        </KbdGroup>
      );
    }

    const formattedKeys = formatHotkey(hotkey);
    if (formattedKeys.length === 1) {
      return <Kbd className={kbdClassName}>{formattedKeys[0]}</Kbd>;
    }

    return (
      <KbdGroup>
        {formattedKeys.map((key, index) => (
          <Kbd key={index} className={kbdClassName}>
            {key}
          </Kbd>
        ))}
      </KbdGroup>
    );
  };

  return (
    <Button {...props} onClick={onClick}>
      {children}
      {renderHotkeyDisplay()}
    </Button>
  );
}
