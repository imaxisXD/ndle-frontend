"use client";

import { toast } from "sonner";

export type ToastType =
  | "default"
  | "loading"
  | "success"
  | "error"
  | "info"
  | "warning";

export interface ToastOptions {
  type?: ToastType;
  title: string;
  description?: string;
}

/**
 * Custom hook that wraps Sonner's toast API to provide a consistent interface.
 * Preserves the same API as the previous Base UI implementation: add({ type, title, description })
 */
export function useToast() {
  const add = (options: ToastOptions) => {
    const { type = "default", title, description } = options;

    // Map type to corresponding Sonner toast method
    switch (type) {
      case "success":
        toast.success(title, { description });
        break;
      case "error":
        toast.error(title, { description });
        break;
      case "info":
        toast.info(title, { description });
        break;
      case "warning":
        toast.warning(title, { description });
        break;
      case "loading":
        toast.loading(title, { description });
        break;
      default:
        toast(title, { description });
    }
  };

  return { add };
}
