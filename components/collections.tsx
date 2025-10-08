"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "@ui/badge";
import {
  BinMinusIn,
  Folder,
  MoreVertCircle,
  OpenInBrowser,
  Plus,
} from "iconoir-react";

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
          shortUrl: "ndle.im/a8x9k2",
          destination: "https://example.com/blog/how-to-build-a-saas-product",
          title: "How to Build a SaaS Product",
          clicks: 342,
          status: "healthy",
        },
        {
          id: "2",
          shortUrl: "ndle.im/m3p7q1",
          destination: "https://example.com/documentation/getting-started",
          title: "Getting Started Documentation",
          clicks: 189,
          status: "healed",
        },
        {
          id: "3",
          shortUrl: "ndle.im/k9n2w5",
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

  // (Removed unused delete handler)

  if (selectedCollection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSelectedCollection(null)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
            >
              ← Back to Collections
            </button>
          </div>
        </div>

        <div className="border-border bg-card rounded-lg border p-6">
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
                <h2 className="text-2xl font-medium">
                  {selectedCollection.name}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {selectedCollection.description}
                </p>
                <div className="text-muted-foreground mt-4 flex gap-4 text-xs">
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
              className="hover:bg-accent rounded-md p-2 transition-colors"
            >
              <MoreVertCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Links in this collection</h3>
            <button
              type="button"
              className="bg-accent text-accent-foreground hover:bg-accent/90 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Link
            </button>
          </div>

          {collectionLinks.length === 0 ? (
            <div className="border-border bg-card rounded-lg border border-dashed p-12 text-center">
              <Folder className="text-muted-foreground mx-auto h-12 w-12" />
              <h3 className="mt-4 text-sm font-medium">No links yet</h3>
              <p className="text-muted-foreground mt-2 text-xs">
                Add links to this collection to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {collectionLinks.map((link) => (
                <div
                  key={link.id}
                  className="border-border bg-card rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {link.shortUrl}
                        </span>
                        {link.status === "healed" ? (
                          <Badge
                            className="inline-flex items-center gap-1.5"
                            variant="green"
                          >
                            <span className="bg-success h-1.5 w-1.5 rounded-full" />
                            Auto-healed
                          </Badge>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs ${
                              link.status === "healthy"
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {link.status === "healthy" ? "Healthy" : "Checking"}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {link.destination}
                      </p>
                      <div className="text-muted-foreground mt-2 flex gap-4 text-xs">
                        <span>{link.clicks} clicks</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="hover:bg-accent rounded-md p-2 transition-colors"
                      >
                        <OpenInBrowser className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="text-destructive hover:bg-destructive/10 rounded-md p-2 transition-colors"
                      >
                        <BinMinusIn className="h-4 w-4" />
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
          <h2 className="text-lg font-medium">All Collections</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Organize your links into collections for better management
          </p>
        </div>
        <Button type="button" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <div
            role="button"
            tabIndex={0}
            key={collection.id}
            onClick={() => setSelectedCollection(collection)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSelectedCollection(collection);
              }
            }}
            className="group border-border bg-card hover:border-foreground/20 cursor-pointer rounded-lg border p-6 transition-all"
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
                className="hover:bg-accent rounded-md p-1 opacity-0 transition-all group-hover:opacity-100"
              >
                <MoreVertCircle className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-4 text-base font-medium">{collection.name}</h3>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {collection.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="default">{collection.linkCount} links</Badge>
              <Badge variant="default">
                {collection.totalClicks.toLocaleString()} clicks
              </Badge>
              {collection.healedCount > 0 && (
                <Badge
                  className="inline-flex items-center gap-1.5"
                  variant="green"
                >
                  <span className="bg-success h-1.5 w-1.5 rounded-full" />
                  {collection.healedCount} healed
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="border-border bg-card w-full max-w-md rounded-lg border p-6">
            <h3 className="text-lg font-medium">Create New Collection</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Organize your links into a new collection
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="newCollectionName"
                  className="text-sm font-medium"
                >
                  Collection Name
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g., Product Documentation"
                  className="border-input bg-background focus:ring-foreground/20 mt-2 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="newCollectionDescription"
                  className="text-sm font-medium"
                >
                  Description (optional)
                </label>
                <textarea
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Brief description of this collection"
                  className="border-input bg-background focus:ring-foreground/20 mt-2 h-20 w-full resize-none rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
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
                className="border-border bg-background hover:bg-secondary flex-1 rounded-md border px-4 py-2 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCollection}
                disabled={!newCollectionName.trim()}
                className="bg-accent text-accent-foreground hover:bg-accent/90 flex-1 rounded-md px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
