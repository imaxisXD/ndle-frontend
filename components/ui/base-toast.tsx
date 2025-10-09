"use client";

import { toastManager, useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Toast } from "@base-ui-components/react/toast";
import { cva } from "class-variance-authority";
import { CircleGridLoaderIcon } from "../icons";
import { Xmark } from "iconoir-react";

export type ToastType =
  | "default"
  | "loading"
  | "success"
  | "error"
  | "info"
  | "warning";

export type ToastPosition =
  | "top-center"
  | "top-right"
  | "top-left"
  | "bottom-center"
  | "bottom-right"
  | "bottom-left";

export type ToastTimeout = number;

export type ToastSwipeDirection = "up" | "down" | "left" | "right";

const toastVariants = cva(
  [
    "absolute z-[calc(1000-var(--toast-index))] m-0 w-[calc(100%_-_2rem)] sm:w-96",
    "bg-clip-padding transition-all [transition-property:opacity,transform] duration-200 ease-out select-none",
    'after:absolute after:start-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[""]',
    "[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+calc(min(var(--toast-index),10)*-1*var(--gap))))_scale(calc(max(0,1-(var(--toast-index)*0.1))))]",

    "data-[position^=top]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+calc(min(var(--toast-index),10)*var(--gap))))_scale(calc(max(0,1-(var(--toast-index)*0.1))))]",

    "data-[expanded]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y)))]",
    "data-[expanded]:data-[position^=top]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-offset-y)+calc(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y)))]",

    "data-[ending-style]:opacity-0 data-[limited]:opacity-0 data-[starting-style]:[transform:translateY(150%)]",
    "data-[starting-style]:opacity-0 data-[ending-style]:[&:not([data-limited])]:[transform:translateY(150%)]",
    "data-[starting-style]:data-[position^=top]:[transform:translateY(-150%)]",
    "data-[ending-style]:data-[position^=top]:[&:not([data-limited]):not([data-swipe-direction])]:[transform:translateY(-150%)]",

    "data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",
    "data-[expanded]:data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]",

    "data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",
    "data-[expanded]:data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))]",

    "data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
    "data-[expanded]:data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))]",
  ],
  {
    variants: {
      position: {
        "top-center": "start-1/2 -translate-x-1/2 top-0 after:top-full",
        "top-right": "end-0 top-0 after:top-full",
        "top-left": "start-0 top-0 after:top-full",
        "bottom-center":
          "start-1/2 -translate-x-1/2 bottom-0 after:bottom-full",
        "bottom-right": "end-3 bottom-0 after:bottom-full",
        "bottom-left": "start-0 bottom-0 after:bottom-full",
      },
    },
    defaultVariants: {
      position: "bottom-right",
    },
  },
);

const toastTypeVariants = cva(
  "rounded-md bg-gradient-to-t from-background to-popover outline outline-1 outline-border shadow-lg text-popover-foreground",
  {
    variants: {
      type: {
        default: "",
        loading: "",
        error: "outline-destructive",
        success: "outline-green-600",
        info: "outline-blue-500",
        warning: "outline-yellow-500",
      },
    },
    defaultVariants: {
      type: "default",
    },
  },
);

const toastContainerVariants = cva(["fixed flex flex-col gap-2 z-50"], {
  variants: {
    position: {
      "top-center": "end-1/2 -translate-x-1/2 top-3",
      "top-right": "end-3 top-3",
      "top-left": "start-3 top-3",
      "bottom-center": "end-1/2 -translate-x-1/2 bottom-3",
      "bottom-right": "end-3 bottom-3",
      "bottom-left": "start-3 bottom-3",
    },
  },
  defaultVariants: {
    position: "bottom-right",
  },
});

const TOAST_ICONS: {
  [key: string]: React.ReactNode;
} = {
  loading: <CircleGridLoaderIcon className="mr-2 size-3" />,
  success: <div className="h-4 w-1.5 rounded-full bg-green-600" />,
  error: <div className="h-4 w-1.5 rounded-full bg-red-500" />,
  info: <div className="h-4 w-1.5 rounded-full bg-blue-500" />,
  warning: <div className="h-4 w-1.5 rounded-full bg-amber-400" />,
};

interface ToastProviderProps
  extends Omit<React.ComponentProps<typeof Toast.Provider>, "toastManager"> {
  position?: ToastPosition;
  timeout?: ToastTimeout;
  swipeDirection?: ToastSwipeDirection[];
  limit?: number;
  showCloseButton?: boolean;
}

function ToastProvider({
  children,
  position = "bottom-right",
  timeout = 5000,
  swipeDirection,
  limit = 5,
  showCloseButton = false,
  ...props
}: ToastProviderProps) {
  return (
    <Toast.Provider
      toastManager={toastManager}
      timeout={timeout}
      limit={limit}
      {...props}
    >
      {children}
      <ToastList
        position={position}
        swipeDirection={swipeDirection}
        showCloseButton={showCloseButton}
      />
    </Toast.Provider>
  );
}

interface CustomToastData {
  content?: string;
  close?: boolean;
  position?: ToastPosition;
}

function isCustomToast(
  toast: Toast.Root.ToastObject,
): toast is Toast.Root.ToastObject<CustomToastData> {
  return toast.data?.content !== undefined;
}

function getDefaultSwipeDirection(
  position: ToastPosition,
): ToastSwipeDirection[] {
  switch (position) {
    case "top-center":
      return ["up", "right", "left"];
    case "top-right":
      return ["up", "right"];
    case "top-left":
      return ["up", "left"];
    case "bottom-center":
      return ["down", "right", "left"];
    case "bottom-left":
      return ["down", "left"];
    case "bottom-right":
    default:
      return ["right", "down"];
  }
}

interface ToastListProps {
  position: ToastPosition;
  swipeDirection?: ToastSwipeDirection[];
  showCloseButton: boolean;
}

function ToastList({
  position,
  swipeDirection,
  showCloseButton,
}: ToastListProps) {
  const { toasts } = useToast();

  // Group toasts by position (individual or default)
  const toastsByPosition = toasts.reduce(
    (groups, toast) => {
      const toastPosition = (toast.data?.position || position) as ToastPosition;
      if (!groups[toastPosition]) {
        groups[toastPosition] = [];
      }
      groups[toastPosition].push(toast);
      return groups;
    },
    {} as Record<ToastPosition, typeof toasts>,
  );

  return (
    <>
      {Object.entries(toastsByPosition).map(
        ([toastPosition, positionToasts]) => {
          const currentSwipeDirection =
            swipeDirection ||
            getDefaultSwipeDirection(toastPosition as ToastPosition);

          return (
            <Toast.Portal data-slot="toast-portal" key={toastPosition}>
              <Toast.Viewport
                className={cn(
                  toastContainerVariants({
                    position: toastPosition as ToastPosition,
                  }),
                )}
                data-slot="toast-viewport"
                data-position={toastPosition}
              >
                {positionToasts.map((toast, index) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const type = (toast as any).type || "default";
                  return (
                    <Toast.Root
                      key={toast.id}
                      toast={toast}
                      swipeDirection={currentSwipeDirection}
                      data-slot="toast"
                      data-position={toastPosition}
                      data-type={type}
                      className={cn(
                        toastVariants({
                          position: toastPosition as ToastPosition,
                        }),
                      )}
                      style={{
                        ["--gap" as string]: "0.8rem",
                        ["--toast-index" as string]: index.toString(),
                        ["--offset-y" as string]: toastPosition.startsWith(
                          "top",
                        )
                          ? "calc(var(--toast-offset-y) + (var(--toast-index) * var(--gap)) + var(--toast-swipe-movement-y))"
                          : "calc(var(--toast-offset-y) * -1 + (var(--toast-index) * var(--gap) * -1) + var(--toast-swipe-movement-y))",
                      }}
                    >
                      {isCustomToast(toast) && toast.data ? (
                        <div data-slot="toast-wrapper">
                          {toast.data.content}
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "flex w-full items-center justify-between gap-2 p-2.5",
                            toastTypeVariants({ type: type as ToastType }),
                          )}
                          data-slot="toast-wrapper"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex flex-col gap-2">
                              <Toast.Title
                                className="text-sm tracking-tight"
                                data-slot="toast-title"
                              />
                              <div className="flex items-center gap-1">
                                {type && TOAST_ICONS[type] && TOAST_ICONS[type]}
                                <Toast.Description
                                  className="text-muted-foreground flex items-center justify-center text-xs tracking-tight"
                                  data-slot="toast-description"
                                />
                              </div>
                            </div>
                          </div>

                          {(toast.data?.close || showCloseButton) && (
                            <Toast.Close
                              className={cn(
                                "absolute -end-2 -top-1 cursor-pointer rounded-full bg-gradient-to-t from-black to-black/60 p-1 text-white [&_svg]:size-3 [&_svg]:opacity-70 hover:[&_svg]:opacity-100",
                              )}
                              data-slot="toast-action"
                              aria-label="Close"
                            >
                              <Xmark />
                            </Toast.Close>
                          )}
                        </div>
                      )}
                    </Toast.Root>
                  );
                })}
              </Toast.Viewport>
            </Toast.Portal>
          );
        },
      )}
    </>
  );
}

export { ToastProvider };
