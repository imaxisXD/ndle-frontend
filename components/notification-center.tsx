"use client";

import { useState } from "react";
import {
	AlertCircleIcon,
	CheckCircle2Icon,
	MousePointerClickIcon,
	RefreshCwIcon,
	SparklesIcon,
	X,
} from "./icons";

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
		message: "short.link/m3p7q1 was automatically fixed using semantic search",
		timestamp: "2 minutes ago",
		read: false,
		link: "short.link/m3p7q1",
	},
	{
		id: "2",
		type: "click",
		title: "High Traffic Alert",
		message: "short.link/a8x9k2 received 100+ clicks in the last hour",
		timestamp: "1 hour ago",
		read: false,
		link: "short.link/a8x9k2",
	},
	{
		id: "3",
		type: "ai",
		title: "AI Summary Generated",
		message: "New AI summary created for your latest link",
		timestamp: "3 hours ago",
		read: true,
		link: "short.link/k9n2w5",
	},
	{
		id: "4",
		type: "created",
		title: "Link Created",
		message: "Successfully created short.link/p4r8t3",
		timestamp: "5 hours ago",
		read: true,
		link: "short.link/p4r8t3",
	},
	{
		id: "5",
		type: "error",
		title: "Healing Failed",
		message: "Unable to find alternative for broken link short.link/x7y2z9",
		timestamp: "1 day ago",
		read: true,
		link: "short.link/x7y2z9",
	},
];

export function NotificationCenter() {
	const [isOpen, setIsOpen] = useState(false);
	const [notifications, setNotifications] = useState(mockNotifications);

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
				return <RefreshCwIcon className="h-4 w-4 text-yellow-600" />;
			case "click":
				return <MousePointerClickIcon className="h-4 w-4 text-blue-600" />;
			case "created":
				return <CheckCircle2Icon className="h-4 w-4 text-green-600" />;
			case "ai":
				return <SparklesIcon className="h-4 w-4 text-yellow-600" />;
			case "error":
				return <AlertCircleIcon className="h-4 w-4 text-red-600" />;
		}
	};

	return (
		<div className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
			>
				<svg
					className="h-5 w-5"
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
				{unreadCount > 0 && (
					<span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 font-mono text-xs text-white">
						{unreadCount}
					</span>
				)}
			</button>

			{isOpen && (
				<>
					<button
						type="button"
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					<div className="absolute left-16 top-[-414px] z-50 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card shadow-xl">
						<div className="flex items-center justify-between border-b border-border p-4">
							<h3 className="font-mono text-sm font-medium">Notifications</h3>
							{unreadCount > 0 && (
								<button
									type="button"
									onClick={markAllAsRead}
									className="font-mono text-xs text-muted-foreground hover:text-foreground"
								>
									Mark all as read
								</button>
							)}
						</div>

						<div className="max-h-96 overflow-y-auto">
							{notifications.length === 0 ? (
								<div className="p-8 text-center">
									<svg
										className="mx-auto h-12 w-12 text-muted-foreground"
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
									<p className="mt-2 font-mono text-sm text-muted-foreground">
										No notifications
									</p>
								</div>
							) : (
								<div className="divide-y divide-border">
									{notifications.map((notification) => (
										<button
											type="button"
											key={notification.id}
											className={`group relative p-4 transition-colors hover:bg-muted/30 ${
												!notification.read ? "bg-blue-50/50" : ""
											}`}
											onClick={() => markAsRead(notification.id)}
										>
											<div className="flex gap-3">
												<div className="flex-shrink-0 mt-0.5">
													{getIcon(notification.type)}
												</div>
												<div className="flex-1 min-w-0">
													<div className="flex items-start justify-between gap-2">
														<h4 className="font-mono text-sm font-medium">
															{notification.title}
														</h4>
														{!notification.read && (
															<span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
														)}
													</div>
													<p className="mt-1 font-mono text-xs text-muted-foreground">
														{notification.message}
													</p>
													{notification.link && (
														<code className="mt-2 inline-block font-mono text-xs text-blue-600">
															{notification.link}
														</code>
													)}
													<p className="mt-2 font-mono text-xs text-muted-foreground">
														{notification.timestamp}
													</p>
												</div>
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														deleteNotification(notification.id);
													}}
													className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
												>
													<X className="h-4 w-4" />
												</button>
											</div>
										</button>
									))}
								</div>
							)}
						</div>

						{notifications.length > 0 && (
							<div className="border-t border-border p-3 text-center">
								<button
									type="button"
									className="font-mono text-xs text-muted-foreground hover:text-foreground"
								>
									View all notifications
								</button>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
