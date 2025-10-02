"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/lib/toast-context";
import {
	AlertCircleIcon,
	ArchiveIcon,
	ArrowUpDown,
	CheckCircle2Icon,
	ClockIcon,
	CopyIcon,
	ExternalLinkIcon,
	FileTextIcon,
	Filter,
	MessageSquareIcon,
	MoreVerticalIcon,
	RefreshCwIcon,
	Search,
	SparklesIcon,
	X,
} from "./icons";

type LinkStatus = "healthy" | "healed" | "checking";
type SortOption = "clicks" | "date" | "name";

interface Link {
	id: string;
	shortUrl: string;
	originalUrl: string;
	clicks: number;
	created: string;
	status: LinkStatus;
	healingHistory?: {
		date: string;
		action: string;
		from?: string;
		to?: string;
	}[];
	memory?: {
		summary: string;
		notes: string;
		savedReason: string;
	};
	conversations?: {
		id: string;
		question: string;
		answer: string;
		timestamp: string;
	}[];
}

const mockUrls: Link[] = [
	{
		id: "1",
		shortUrl: "short.link/a8x9k2",
		originalUrl: "https://example.com/blog/how-to-build-a-saas-product",
		clicks: 342,
		created: "2 days ago",
		status: "healthy",
		memory: {
			summary:
				"Comprehensive guide on building SaaS products from scratch, covering MVP development, pricing strategies, and customer acquisition.",
			notes:
				"Great resource for the team meeting next week. Focus on the pricing section.",
			savedReason: "Reference for product strategy discussion",
		},
		conversations: [
			{
				id: "c1",
				question: "What pricing models are discussed?",
				answer:
					"The article covers three main pricing models: freemium, tiered pricing, and usage-based pricing. It recommends starting with tiered pricing for B2B SaaS.",
				timestamp: "1 hour ago",
			},
		],
	},
	{
		id: "2",
		shortUrl: "short.link/m3p7q1",
		originalUrl: "https://example.com/documentation/getting-started",
		clicks: 189,
		created: "5 days ago",
		status: "healed",
		healingHistory: [
			{
				date: "3 days ago",
				action: "Detected 404 error",
				from: "https://example.com/documentation/getting-started",
			},
			{
				date: "3 days ago",
				action: "Found alternative via semantic search",
				to: "https://example.com/docs/quickstart",
			},
		],
		memory: {
			summary:
				"Quick start guide for new developers. Covers installation, basic configuration, and first project setup.",
			notes: "Send to new hires during onboarding",
			savedReason: "Onboarding documentation",
		},
	},
	{
		id: "3",
		shortUrl: "short.link/k9n2w5",
		originalUrl: "https://example.com/pricing/enterprise-plan",
		clicks: 567,
		created: "1 week ago",
		status: "checking",
		memory: {
			summary:
				"Enterprise pricing details including custom features, dedicated support, and SLA guarantees.",
			notes: "Compare with competitors before renewal",
			savedReason: "Contract renewal research",
		},
		conversations: [
			{
				id: "c2",
				question: "What's included in enterprise support?",
				answer:
					"Enterprise support includes 24/7 phone and email support, dedicated account manager, 99.99% uptime SLA, and priority feature requests.",
				timestamp: "2 days ago",
			},
			{
				id: "c3",
				question: "How does this compare to the pro plan?",
				answer:
					"Enterprise adds dedicated support, custom integrations, advanced security features, and unlimited team members compared to Pro's 50 member limit.",
				timestamp: "2 days ago",
			},
		],
	},
	{
		id: "4",
		shortUrl: "short.link/p4r8t3",
		originalUrl: "https://example.com/features/analytics-dashboard",
		clicks: 234,
		created: "2 weeks ago",
		status: "healthy",
		healingHistory: [
			{
				date: "1 week ago",
				action: "Detected slow response time",
			},
			{
				date: "1 week ago",
				action: "Cached via Wayback Machine as backup",
			},
		],
		memory: {
			summary:
				"Analytics dashboard features including real-time metrics, custom reports, and data export capabilities.",
			notes: "Inspiration for our own dashboard redesign",
			savedReason: "UI/UX research",
		},
	},
];

export function UrlList() {
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<"memory" | "chat" | "healing">(
		"memory",
	);

	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<LinkStatus | "all">("all");
	const [sortBy, setSortBy] = useState<SortOption>("date");
	const [showFilters, setShowFilters] = useState(false);

	const { showToast } = useToast();

	const filteredAndSortedUrls = useMemo(() => {
		let filtered = mockUrls;

		// Apply search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(url) =>
					url.shortUrl.toLowerCase().includes(query) ||
					url.originalUrl.toLowerCase().includes(query) ||
					url.memory?.summary.toLowerCase().includes(query) ||
					url.memory?.notes.toLowerCase().includes(query),
			);
		}

		// Apply status filter
		if (statusFilter !== "all") {
			filtered = filtered.filter((url) => url.status === statusFilter);
		}

		// Apply sorting
		const sorted = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "clicks":
					return b.clicks - a.clicks;
				case "name":
					return a.shortUrl.localeCompare(b.shortUrl);
				case "date":
				default:
					// For demo purposes, using clicks as proxy for date
					return b.clicks - a.clicks;
			}
		});

		return sorted;
	}, [searchQuery, statusFilter, sortBy]);

	const getStatusIcon = (status: LinkStatus) => {
		switch (status) {
			case "healthy":
				return <CheckCircle2Icon className="h-4 w-4 text-green-600" />;
			case "healed":
				return <RefreshCwIcon className="h-4 w-4 text-yellow-600" />;
			case "checking":
				return <AlertCircleIcon className="h-4 w-4 text-orange-600" />;
		}
	};

	const getStatusText = (status: LinkStatus) => {
		switch (status) {
			case "healthy":
				return "Healthy";
			case "healed":
				return "Auto-healed";
			case "checking":
				return "Checking";
		}
	};

	const handleCopy = (shortUrl: string) => {
		navigator.clipboard.writeText(`https://${shortUrl}`);
		showToast("Link copied to clipboard!", "success");
	};

	return (
		<div className="rounded-xl border border-border bg-card">
			<div className="border-b border-border p-6">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h2 className="font-mono text-lg font-medium">Recent Links</h2>
						<p className="mt-1 font-mono text-sm text-muted-foreground">
							Self-healing links with AI memory and conversations
						</p>
					</div>
					<button
						type="button"
						onClick={() => setShowFilters(!showFilters)}
						className={`flex items-center gap-2 rounded-md px-3 py-2 font-mono text-sm transition-colors ${showFilters || statusFilter !== "all"
							? "bg-foreground text-background"
							: "border border-border hover:bg-accent"
							}`}
					>
						<Filter className="h-4 w-4" />
						Filters
					</button>
				</div>

				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search links by URL, content, or notes..."
						className="w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>

				{showFilters && (
					<div className="mt-4 flex flex-wrap gap-3 p-4 rounded-lg bg-muted/30 border border-border">
						<div className="flex items-center gap-2">
							<span className="font-mono text-xs font-medium text-muted-foreground">
								Status:
							</span>
							<div className="flex gap-2">
								{(["all", "healthy", "healed", "checking"] as const).map(
									(status) => (
										<button
											type="button"
											key={status}
											onClick={() => setStatusFilter(status)}
											className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${statusFilter === status
												? "bg-foreground text-background"
												: "bg-background border border-border hover:bg-accent"
												}`}
										>
											{status === "all" ? "All" : getStatusText(status)}
										</button>
									),
								)}
							</div>
						</div>

						<div className="flex items-center gap-2 ml-auto">
							<ArrowUpDown className="h-4 w-4 text-muted-foreground" />
							<span className="font-mono text-xs font-medium text-muted-foreground">
								Sort by:
							</span>
							<select
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value as SortOption)}
								className="rounded-md border border-input bg-background px-3 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-foreground/20"
							>
								<option value="date">Date Created</option>
								<option value="clicks">Most Clicks</option>
								<option value="name">Name (A-Z)</option>
							</select>
						</div>
					</div>
				)}

				{(searchQuery || statusFilter !== "all") && (
					<div className="mt-3 flex items-center gap-2 flex-wrap">
						<span className="font-mono text-xs text-muted-foreground">
							Active filters:
						</span>
						{searchQuery && (
							<span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 font-mono text-xs">
								Search: {searchQuery}
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="hover:text-foreground"
								>
									<X className="h-3 w-3" />
								</button>
							</span>
						)}
						{statusFilter !== "all" && (
							<span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 font-mono text-xs">
								Status: {getStatusText(statusFilter)}
								<button
									type="button"
									onClick={() => setStatusFilter("all")}
									className="hover:text-foreground"
								>
									<X className="h-3 w-3" />
								</button>
							</span>
						)}
						<button
							type="button"
							onClick={() => {
								setSearchQuery("");
								setStatusFilter("all");
							}}
							className="font-mono text-xs text-muted-foreground hover:text-foreground underline"
						>
							Clear all
						</button>
					</div>
				)}
			</div>

			{filteredAndSortedUrls.length === 0 ? (
				<div className="p-12 text-center">
					<Search className="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 className="mt-4 font-mono text-sm font-medium">No links found</h3>
					<p className="mt-2 font-mono text-xs text-muted-foreground">
						{searchQuery || statusFilter !== "all"
							? "Try adjusting your search or filters"
							: "Create your first shortened link to get started"}
					</p>
					{(searchQuery || statusFilter !== "all") && (
						<button
							type="button"
							onClick={() => {
								setSearchQuery("");
								setStatusFilter("all");
							}}
							className="mt-4 rounded-md bg-foreground px-4 py-2 font-mono text-sm text-background transition-colors hover:bg-foreground/90"
						>
							Clear filters
						</button>
					)}
				</div>
			) : (
				<div className="divide-y divide-border">
					{filteredAndSortedUrls.map((url) => (
						<div key={url.id} className="transition-colors hover:bg-muted/30">
							{/* Main Link Row */}
							<button
								type="button"
								className="flex cursor-pointer items-center justify-between p-6"
								onClick={() =>
									setExpandedId(expandedId === url.id ? null : url.id)
								}
							>
								<div className="flex-1 space-y-2">
									<div className="flex items-center gap-3">
										{getStatusIcon(url.status)}
										<code className="font-mono text-sm font-medium text-foreground">
											{url.shortUrl}
										</code>
										<button
											type="button"
											className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
											onClick={(e) => {
												e.stopPropagation();
												handleCopy(url.shortUrl);
											}}
										>
											<CopyIcon className="h-3.5 w-3.5" />
										</button>
										<a
											href={`https://${url.shortUrl}`}
											target="_blank"
											rel="noopener noreferrer"
											className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
											onClick={(e) => e.stopPropagation()}
										>
											<ExternalLinkIcon className="h-3.5 w-3.5" />
										</a>
										<span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
											{getStatusText(url.status)}
										</span>
									</div>
									<p className="font-mono text-xs text-muted-foreground">
										{url.originalUrl}
									</p>
								</div>

								<div className="flex items-center gap-6">
									<div className="text-right">
										<p className="font-mono text-sm font-medium">
											{url.clicks}
										</p>
										<p className="font-mono text-xs text-muted-foreground">
											clicks
										</p>
									</div>
									<div className="text-right">
										<p className="font-mono text-xs text-muted-foreground">
											{url.created}
										</p>
									</div>
									<button
										type="button"
										className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
										onClick={(e) => e.stopPropagation()}
									>
										<MoreVerticalIcon className="h-4 w-4" />
									</button>
								</div>
							</button>

							{/* Expanded Details */}
							{expandedId === url.id && (
								<div className="border-t border-border bg-muted/20 p-6">
									{/* Tabs */}
									<div className="mb-4 flex gap-2 border-b border-border">
										<button
											type="button"
											onClick={() => setActiveTab("memory")}
											className={`flex items-center gap-2 border-b-2 px-4 py-2 font-mono text-sm transition-colors ${activeTab === "memory"
												? "border-foreground text-foreground"
												: "border-transparent text-muted-foreground hover:text-foreground"
												}`}
										>
											<FileTextIcon className="h-4 w-4" />
											Memory
										</button>
										<button
											type="button"
											onClick={() => setActiveTab("chat")}
											className={`flex items-center gap-2 border-b-2 px-4 py-2 font-mono text-sm transition-colors ${activeTab === "chat"
												? "border-foreground text-foreground"
												: "border-transparent text-muted-foreground hover:text-foreground"
												}`}
										>
											<MessageSquareIcon className="h-4 w-4" />
											Chat ({url.conversations?.length || 0})
										</button>
										<button
											type="button"
											onClick={() => setActiveTab("healing")}
											className={`flex items-center gap-2 border-b-2 px-4 py-2 font-mono text-sm transition-colors ${activeTab === "healing"
												? "border-foreground text-foreground"
												: "border-transparent text-muted-foreground hover:text-foreground"
												}`}
										>
											<RefreshCwIcon className="h-4 w-4" />
											Healing History
										</button>
									</div>

									{/* Tab Content */}
									<div className="space-y-4">
										{activeTab === "memory" && url.memory && (
											<div className="space-y-4">
												<div className="rounded-lg border border-border bg-card p-4">
													<div className="mb-2 flex items-center gap-2">
														<SparklesIcon className="h-4 w-4 text-yellow-600" />
														<h4 className="font-mono text-sm font-medium">
															AI Summary
														</h4>
													</div>
													<p className="font-mono text-sm text-muted-foreground leading-relaxed">
														{url.memory.summary}
													</p>
												</div>

												<div className="rounded-lg border border-border bg-card p-4">
													<div className="mb-2 flex items-center gap-2">
														<FileTextIcon className="h-4 w-4 text-muted-foreground" />
														<h4 className="font-mono text-sm font-medium">
															Your Notes
														</h4>
													</div>
													<p className="font-mono text-sm text-muted-foreground">
														{url.memory.notes}
													</p>
												</div>

												<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
													<div className="mb-2 flex items-center gap-2">
														<ClockIcon className="h-4 w-4 text-yellow-700" />
														<h4 className="font-mono text-sm font-medium text-yellow-900">
															Why You Saved This
														</h4>
													</div>
													<p className="font-mono text-sm text-yellow-700">
														{url.memory.savedReason}
													</p>
												</div>
											</div>
										)}

										{activeTab === "chat" && (
											<div className="space-y-4">
												{url.conversations && url.conversations.length > 0 ? (
													<>
														{url.conversations.map((conv) => (
															<div key={conv.id} className="space-y-3">
																<div className="rounded-lg bg-muted p-4">
																	<p className="font-mono text-sm text-foreground">
																		{conv.question}
																	</p>
																	<p className="mt-1 font-mono text-xs text-muted-foreground">
																		{conv.timestamp}
																	</p>
																</div>
																<div className="rounded-lg border border-border bg-card p-4">
																	<div className="mb-2 flex items-center gap-2">
																		<SparklesIcon className="h-3.5 w-3.5 text-yellow-600" />
																		<span className="font-mono text-xs font-medium text-muted-foreground">
																			AI Assistant
																		</span>
																	</div>
																	<p className="font-mono text-sm text-foreground leading-relaxed">
																		{conv.answer}
																	</p>
																</div>
															</div>
														))}
														<div className="rounded-lg border border-border bg-card p-4">
															<input
																type="text"
																placeholder="Ask anything about this link..."
																className="w-full bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
															/>
														</div>
													</>
												) : (
													<div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
														<MessageSquareIcon className="mx-auto h-8 w-8 text-muted-foreground" />
														<p className="mt-2 font-mono text-sm text-muted-foreground">
															No conversations yet
														</p>
														<p className="mt-1 font-mono text-xs text-muted-foreground">
															Ask questions about this link&apos;s content
														</p>
													</div>
												)}
											</div>
										)}

										{activeTab === "healing" && (
											<div className="space-y-3">
												{url.healingHistory && url.healingHistory.length > 0 ? (
													url.healingHistory.map((event, idx) => (
														<div key={event.date} className="flex gap-4">
															<div className="flex flex-col items-center">
																<div className="rounded-full bg-muted p-2">
																	{event.action.includes("404") ||
																		event.action.includes("Detected") ? (
																		<AlertCircleIcon className="h-3.5 w-3.5 text-orange-600" />
																	) : event.action.includes("Found") ||
																		event.action.includes("semantic") ? (
																		<RefreshCwIcon className="h-3.5 w-3.5 text-yellow-600" />
																	) : (
																		<ArchiveIcon className="h-3.5 w-3.5 text-blue-600" />
																	)}
																</div>
																{idx < url.healingHistory!.length - 1 && (
																	<div className="h-full w-px bg-border" />
																)}
															</div>
															<div className="flex-1 pb-4">
																<p className="font-mono text-sm font-medium">
																	{event.action}
																</p>
																<p className="mt-1 font-mono text-xs text-muted-foreground">
																	{event.date}
																</p>
																{event.from && (
																	<p className="mt-2 font-mono text-xs text-muted-foreground">
																		From: {event.from}
																	</p>
																)}
																{event.to && (
																	<p className="mt-1 font-mono text-xs text-muted-foreground">
																		To: {event.to}
																	</p>
																)}
															</div>
														</div>
													))
												) : (
													<div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
														<CheckCircle2Icon className="mx-auto h-8 w-8 text-green-600" />
														<p className="mt-2 font-mono text-sm text-foreground">
															Link is healthy
														</p>
														<p className="mt-1 font-mono text-xs text-muted-foreground">
															No healing actions required
														</p>
													</div>
												)}
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
