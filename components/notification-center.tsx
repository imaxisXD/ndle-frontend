"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/base-dialog";
import { ScrollArea } from "./ui/scroll-area";
import {
  Bell,
  BellNotificationSolid,
  CheckCircle,
  MagicWand,
  MouseButtonLeft,
  RefreshDouble,
  XmarkCircle,
} from "iconoir-react";

interface Notification {
  id: string;
  type: "healing" | "click" | "created" | "ai" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "healing",
    title: "Link Auto-Healed",
    message: "ndle.im/m3p7q1 was automatically fixed using semantic search",
    timestamp: "2 minutes ago",
    read: false,
    link: "ndle.im/m3p7q1",
  },
  {
    id: "2",
    type: "click",
    title: "High Traffic Alert",
    message: "ndle.im/a8x9k2 received 100+ clicks in the last hour",
    timestamp: "1 hour ago",
    read: false,
    link: "ndle.im/a8x9k2",
  },
  {
    id: "3",
    type: "ai",
    title: "AI Summary Generated",
    message: "New AI summary created for your latest link",
    timestamp: "3 hours ago",
    read: true,
    link: "ndle.im/k9n2w5",
  },
  {
    id: "4",
    type: "created",
    title: "Link Created",
    message: "Successfully created ndle.im/p4r8t3",
    timestamp: "5 hours ago",
    read: true,
    link: "ndle.im/p4r8t3",
  },
  {
    id: "5",
    type: "error",
    title: "Healing Failed",
    message: "Unable to find alternative for broken link ndle.im/x7y2z9",
    timestamp: "1 day ago",
    read: true,
    link: "ndle.im/x7y2z9",
  },
];

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "healing":
        return <RefreshDouble className="h-4 w-4 text-yellow-600" />;
      case "click":
        return <MouseButtonLeft className="h-4 w-4 text-blue-600" />;
      case "created":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "ai":
        return <MagicWand className="h-4 w-4 text-yellow-600" />;
      case "error":
        return <XmarkCircle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger
          render={
            <button
              type="button"
              className="group text-muted-foreground hover:bg-accent hover:text-foreground relative rounded-md p-2 transition-colors"
              aria-label="Open notifications"
            >
              {unreadCount > 0 ? (
                <BellNotificationSolid className="h-5 w-5 text-red-500 transition-colors group-hover:text-black" />
              ) : (
                <Bell className="h-5 w-5 transition-colors" strokeWidth={1.5} />
              )}
            </button>
          }
        />

        <DialogContent
          showBackdrop={true}
          showDismissButton={false}
          className="border-border bg-card bottom-3 left-76 z-[100] w-96 max-w-[calc(100vw-2rem)] rounded-lg border p-0 shadow-xl"
        >
          <DialogHeader className="border-border flex flex-row items-center justify-between gap-0 rounded-t-lg border-b bg-black/90 p-4">
            <DialogTitle className="font-doto roundness-100 text-base font-bold tracking-tighter text-white">
              Notifications
            </DialogTitle>
            {unreadCount > 0 && (
              <DialogDescription>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-accent/90 hover:text-accent text-xs"
                >
                  Mark all as read
                </button>
              </DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="h-96">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className="text-muted-foreground mx-auto h-12 w-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-muted-foreground mt-2 text-sm">
                  No notifications
                </p>
              </div>
            ) : (
              <div className="divide-border divide-y">
                {notifications.map((notification) => (
                  <div
                    role="button"
                    tabIndex={0}
                    key={notification.id}
                    className={`group relative p-4 transition-colors hover:bg-white ${
                      !notification.read ? "bg-blue-50/50" : ""
                    }`}
                    onClick={() => markAsRead(notification.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {notification.message}
                        </p>
                        {notification.link && (
                          <code className="mt-2 inline-block text-xs text-blue-600">
                            {notification.link}
                          </code>
                        )}
                        <p className="text-muted-foreground mt-2 text-xs">
                          {notification.timestamp}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="text-muted-foreground hover:text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <XmarkCircle className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
