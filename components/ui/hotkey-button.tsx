import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "./button";
import { Kbd, KbdGroup } from "./kbd";
import { KeyCommand } from "iconoir-react";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

interface HotkeyButtonProps extends Omit<
  React.ComponentProps<"button">,
  "onClick"
> {
  hotkey: string | string[];
  onClick?: () => void;
  variant?: VariantProps<typeof Button>["variant"];
  size?: VariantProps<typeof Button>["size"];
  asChild?: boolean;
  enabled?: boolean;
  enableOnFormTags?: boolean;
  kbdClassName?: string;
  loading?: boolean;
}

function formatHotkey(hotkey: string): string[] {
  const parts = hotkey.split("+").map((part) => part.trim().toLowerCase());

  const modifierMap: Record<string, string> = {
    meta: "⌘",
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

  return parts.map((part) => modifierMap[part] ?? part.toUpperCase());
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref && "current" in ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

export function HotkeyButton({
  hotkey,
  onClick,
  children,
  enabled = true,
  enableOnFormTags = true,
  kbdClassName,
  loading = false,
  className,
  disabled,
  ref,
  ...props
}: HotkeyButtonProps) {
  const internalRef = useRef<HTMLButtonElement | null>(null);
  const buttonDisabled = Boolean(disabled || loading);

  const hasHotkey = Array.isArray(hotkey)
    ? hotkey.some((key) => key.trim() !== "")
    : hotkey.trim() !== "";

  const handleHotkey = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (props.type === "submit") {
      const form = internalRef.current?.form;
      if (form) {
        form.requestSubmit();
        return;
      }
    }
    internalRef.current?.click();
  };

  useHotkeys(hotkey, handleHotkey, {
    preventDefault: true,
    enableOnFormTags,
    enabled: enabled && hasHotkey && !buttonDisabled,
  });

  const renderHotkeyDisplay = () => {
    if (!hasHotkey) {
      return null;
    }

    const renderKey = (
      originalPart: string,
      formattedKey: string,
      key: string,
    ) => {
      if (
        originalPart.toLowerCase() === "meta" ||
        originalPart.toLowerCase() === "cmd"
      ) {
        return (
          <Kbd key={key} className={kbdClassName}>
            <KeyCommand className="size-2.5 text-white" strokeWidth="2" />
          </Kbd>
        );
      }
      return (
        <Kbd key={key} className={kbdClassName}>
          {formattedKey}
        </Kbd>
      );
    };

    if (Array.isArray(hotkey)) {
      return (
        <KbdGroup>
          {hotkey.map((key, index) => {
            const parts = key
              .split("+")
              .map((part) => part.trim().toLowerCase());
            const formattedKeys = formatHotkey(key);
            return formattedKeys.map((formattedKey, keyIndex) =>
              renderKey(parts[keyIndex], formattedKey, `${index}-${keyIndex}`),
            );
          })}
        </KbdGroup>
      );
    }

    const parts = hotkey.split("+").map((part) => part.trim().toLowerCase());
    const formattedKeys = formatHotkey(hotkey);
    if (formattedKeys.length === 1) {
      return renderKey(parts[0], formattedKeys[0], "0");
    }

    return (
      <KbdGroup>
        {formattedKeys.map((formattedKey, index) =>
          renderKey(parts[index], formattedKey, String(index)),
        )}
      </KbdGroup>
    );
  };

  return (
    <Button
      {...props}
      ref={(node) => {
        internalRef.current = node;
        assignRef(ref, node);
      }}
      onClick={onClick}
      disabled={buttonDisabled}
      aria-busy={loading ? true : props["aria-busy"]}
      data-loading={loading ? "true" : undefined}
      className={cn(
        className,
        loading &&
          "bg-black/85 text-white shadow-none transition-[background-color,color,box-shadow,filter] duration-150 ease-out hover:bg-black/85 hover:text-white hover:drop-shadow-none disabled:cursor-wait disabled:bg-black/85 disabled:text-white disabled:opacity-80",
      )}
    >
      {children}
      {/* Touch screens have no keyboard to press the shortcut with. */}
      <span className="contents pointer-coarse:hidden">
        {renderHotkeyDisplay()}
      </span>
    </Button>
  );
}
