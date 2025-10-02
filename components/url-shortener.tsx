"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/toast-context";
import { CopyIcon, ExternalLinkIcon } from "./icons";

export function UrlShortener() {
	const [url, setUrl] = useState("");
	const [shortUrl, setShortUrl] = useState("");
	const { showToast } = useToast();

	const handleShorten = () => {
		if (!url) {
			showToast("Please enter a URL to shorten", "error");
			return;
		}

		// Mock URL shortening
		const randomId = Math.random().toString(36).substring(2, 8);
		setShortUrl(`https://short.link/${randomId}`);
		showToast("Link shortened successfully!", "success");
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(shortUrl);
		showToast("Link copied to clipboard!", "success");
	};

	return (
		<div className="rounded-xl border border-border bg-card p-6 drop-shadow">
			<div className="space-y-4">
				<div>
					<label
						htmlFor="url"
						className="mb-2 block font-mono text-sm text-muted-foreground"
					>
						Enter your long URL
					</label>
					<div className="flex gap-2">
						<Input
							id={useId()}
							type="url"
							placeholder="https://example.com/very/long/url/path"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							className="flex-1 border-border bg-background font-mono text-sm"
						/>
						<Button
							disabled={!url}
							onClick={handleShorten}
							className="bg-accent text-black font-mono font-medium text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed hover:drop-shadow-md ease-in-out drop-shadow-none transition-shadow duration-150"
						>
							Shorten
						</Button>
					</div>
				</div>

				{shortUrl && (
					<div className="rounded-xl border border-border bg-accent p-4">
						<div className="mb-2 font-mono text-xs text-muted-foreground">
							Your shortened URL
						</div>
						<div className="flex items-center justify-between">
							<code className="font-mono text-sm font-medium text-foreground">
								{shortUrl}
							</code>
							<div className="flex gap-2">
								<button
									onClick={handleCopy}
									className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
								>
									<CopyIcon className="h-4 w-4" />
								</button>
								<a
									href={shortUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
								>
									<ExternalLinkIcon className="h-4 w-4" />
								</a>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
