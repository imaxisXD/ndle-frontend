"use client";

import { useState } from "react";
import {
	ExternalLink,
	Folder,
	MoreVertical,
	Plus,
	Trash2,
} from "@/components/icons";

interface Collection {
	id: string;
	name: string;
	description: string;
	linkCount: number;
	totalClicks: number;
	healedCount: number;
	color: string;
	createdAt: string;
}

interface Link {
	id: string;
	shortUrl: string;
	destination: string;
	title: string;
	clicks: number;
	status: "healthy" | "healed" | "checking";
}

export function Collections() {
	const [collections, setCollections] = useState<Collection[]>([
		{
			id: "1",
			name: "Product Docs",
			description: "Documentation and guides for our products",
			linkCount: 12,
			totalClicks: 1847,
			healedCount: 2,
			color: "#3b82f6",
			createdAt: "2024-01-15",
		},
		{
			id: "2",
			name: "Marketing Pages",
			description: "Landing pages and marketing materials",
			linkCount: 8,
			totalClicks: 3421,
			healedCount: 1,
			color: "#10b981",
			createdAt: "2024-01-20",
		},
		{
			id: "3",
			name: "Blog Posts",
			description: "Published blog articles and content",
			linkCount: 24,
			totalClicks: 5632,
			healedCount: 4,
			color: "#f59e0b",
			createdAt: "2024-02-01",
		},
		{
			id: "4",
			name: "API References",
			description: "API documentation and endpoints",
			linkCount: 15,
			totalClicks: 892,
			healedCount: 0,
			color: "#8b5cf6",
			createdAt: "2024-02-10",
		},
		{
			id: "5",
			name: "Tutorials",
			description: "Step-by-step guides and tutorials",
			linkCount: 18,
			totalClicks: 2156,
			healedCount: 3,
			color: "#ec4899",
			createdAt: "2024-02-15",
		},
		{
			id: "6",
			name: "Resources",
			description: "External resources and references",
			linkCount: 9,
			totalClicks: 743,
			healedCount: 1,
			color: "#06b6d4",
			createdAt: "2024-02-20",
		},
	]);

	const [selectedCollection, setSelectedCollection] =
		useState<Collection | null>(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newCollectionName, setNewCollectionName] = useState("");
	const [newCollectionDescription, setNewCollectionDescription] = useState("");

	// Dummy links for selected collection
	const collectionLinks: Link[] = selectedCollection
		? [
				{
					id: "1",
					shortUrl: "short.link/a8x9k2",
					destination: "https://example.com/blog/how-to-build-a-saas-product",
					title: "How to Build a SaaS Product",
					clicks: 342,
					status: "healthy",
				},
				{
					id: "2",
					shortUrl: "short.link/m3p7q1",
					destination: "https://example.com/documentation/getting-started",
					title: "Getting Started Documentation",
					clicks: 189,
					status: "healed",
				},
				{
					id: "3",
					shortUrl: "short.link/k9n2w5",
					destination: "https://example.com/pricing/enterprise-plan",
					title: "Enterprise Pricing Plan",
					clicks: 567,
					status: "checking",
				},
			]
		: [];

	const handleCreateCollection = () => {
		if (!newCollectionName.trim()) return;

		const newCollection: Collection = {
			id: Date.now().toString(),
			name: newCollectionName,
			description: newCollectionDescription,
			linkCount: 0,
			totalClicks: 0,
			healedCount: 0,
			color: "#" + Math.floor(Math.random() * 16777215).toString(16),
			createdAt: new Date().toISOString().split("T")[0],
		};

		setCollections([...collections, newCollection]);
		setNewCollectionName("");
		setNewCollectionDescription("");
		setShowCreateModal(false);
	};

	const handleDeleteCollection = (id: string) => {
		setCollections(collections.filter((c) => c.id !== id));
		if (selectedCollection?.id === id) {
			setSelectedCollection(null);
		}
	};

	if (selectedCollection) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<button
							type="button"
							onClick={() => setSelectedCollection(null)}
							className="flex items-center gap-2 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							← Back to Collections
						</button>
					</div>
				</div>

				<div className="rounded-lg border border-border bg-card p-6">
					<div className="flex items-start justify-between">
						<div className="flex items-start gap-4">
							<div
								className="flex h-12 w-12 items-center justify-center rounded-lg"
								style={{ backgroundColor: selectedCollection.color + "20" }}
							>
								<Folder
									className="h-6 w-6"
									style={{ color: selectedCollection.color }}
								/>
							</div>
							<div>
								<h2 className="font-mono text-2xl font-medium">
									{selectedCollection.name}
								</h2>
								<p className="mt-1 font-mono text-sm text-muted-foreground">
									{selectedCollection.description}
								</p>
								<div className="mt-4 flex gap-4 font-mono text-xs text-muted-foreground">
									<span>{selectedCollection.linkCount} links</span>
									<span>
										{selectedCollection.totalClicks.toLocaleString()} total
										clicks
									</span>
									<span>{selectedCollection.healedCount} healed</span>
								</div>
							</div>
						</div>
						<button
							type="button"
							className="rounded-md p-2 hover:bg-accent transition-colors"
						>
							<MoreVertical className="h-4 w-4" />
						</button>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="font-mono text-lg font-medium">
							Links in this collection
						</h3>
						<button
							type="button"
							className="flex items-center gap-2 rounded-md bg-foreground px-3 py-2 font-mono text-sm text-background transition-colors hover:bg-foreground/90"
						>
							<Plus className="h-4 w-4" />
							Add Link
						</button>
					</div>

					{collectionLinks.length === 0 ? (
						<div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
							<Folder className="mx-auto h-12 w-12 text-muted-foreground" />
							<h3 className="mt-4 font-mono text-sm font-medium">
								No links yet
							</h3>
							<p className="mt-2 font-mono text-xs text-muted-foreground">
								Add links to this collection to get started
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{collectionLinks.map((link) => (
								<div
									key={link.id}
									className="rounded-lg border border-border bg-card p-4"
								>
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<span className="font-mono text-sm font-medium">
													{link.shortUrl}
												</span>
												<span
													className={`rounded-full px-2 py-0.5 font-mono text-xs ${
														link.status === "healthy"
															? "bg-green-100 text-green-700"
															: link.status === "healed"
																? "bg-[#fbbf24] text-foreground"
																: "bg-orange-100 text-orange-700"
													}`}
												>
													{link.status === "healthy"
														? "Healthy"
														: link.status === "healed"
															? "Auto-healed"
															: "Checking"}
												</span>
											</div>
											<p className="mt-1 font-mono text-xs text-muted-foreground">
												{link.destination}
											</p>
											<div className="mt-2 flex gap-4 font-mono text-xs text-muted-foreground">
												<span>{link.clicks} clicks</span>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<button
												type="button"
												className="rounded-md p-2 hover:bg-accent transition-colors"
											>
												<ExternalLink className="h-4 w-4" />
											</button>
											<button
												type="button"
												className="rounded-md p-2 hover:bg-accent transition-colors text-red-500"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-mono text-lg font-medium">All Collections</h2>
					<p className="mt-1 font-mono text-xs text-muted-foreground">
						Organize your links into collections for better management
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowCreateModal(true)}
					className="flex items-center gap-2 rounded-md bg-foreground px-4 py-2 font-mono text-sm text-background transition-colors hover:bg-foreground/90"
				>
					<Plus className="h-4 w-4" />
					New Collection
				</button>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{collections.map((collection) => (
					<button
						type="button"
						key={collection.id}
						onClick={() => setSelectedCollection(collection)}
						className="group rounded-lg border border-border bg-card p-6 hover:border-foreground/20 transition-all cursor-pointer"
					>
						<div className="flex items-start justify-between">
							<div
								className="flex h-10 w-10 items-center justify-center rounded-lg"
								style={{ backgroundColor: collection.color + "20" }}
							>
								<Folder
									className="h-5 w-5"
									style={{ color: collection.color }}
								/>
							</div>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
								}}
								className="opacity-0 group-hover:opacity-100 rounded-md p-1 hover:bg-accent transition-all"
							>
								<MoreVertical className="h-4 w-4" />
							</button>
						</div>
						<h3 className="mt-4 font-mono text-base font-medium">
							{collection.name}
						</h3>
						<p className="mt-1 font-mono text-xs text-muted-foreground line-clamp-2">
							{collection.description}
						</p>
						<div className="mt-4 flex flex-wrap gap-2">
							<span className="rounded-full bg-accent px-2 py-1 font-mono text-xs">
								{collection.linkCount} links
							</span>
							<span className="rounded-full bg-accent px-2 py-1 font-mono text-xs">
								{collection.totalClicks.toLocaleString()} clicks
							</span>
							{collection.healedCount > 0 && (
								<span className="rounded-full bg-[#fbbf24] px-2 py-1 font-mono text-xs text-foreground">
									{collection.healedCount} healed
								</span>
							)}
						</div>
					</button>
				))}
			</div>

			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
						<h3 className="font-mono text-lg font-medium">
							Create New Collection
						</h3>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							Organize your links into a new collection
						</p>
						<div className="mt-6 space-y-4">
							<div>
								<label
									htmlFor="newCollectionName"
									className="font-mono text-sm font-medium"
								>
									Collection Name
								</label>
								<input
									type="text"
									value={newCollectionName}
									onChange={(e) => setNewCollectionName(e.target.value)}
									placeholder="e.g., Product Documentation"
									className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
								/>
							</div>
							<div>
								<label
									htmlFor="newCollectionDescription"
									className="font-mono text-sm font-medium"
								>
									Description (optional)
								</label>
								<textarea
									value={newCollectionDescription}
									onChange={(e) => setNewCollectionDescription(e.target.value)}
									placeholder="Brief description of this collection"
									className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 h-20 resize-none"
								/>
							</div>
						</div>
						<div className="mt-6 flex gap-3">
							<button
								type="button"
								onClick={() => {
									setShowCreateModal(false);
									setNewCollectionName("");
									setNewCollectionDescription("");
								}}
								className="flex-1 rounded-md border border-border bg-background px-4 py-2 font-mono text-sm transition-colors hover:bg-accent"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleCreateCollection}
								disabled={!newCollectionName.trim()}
								className="flex-1 rounded-md bg-foreground px-4 py-2 font-mono text-sm text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Create
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
