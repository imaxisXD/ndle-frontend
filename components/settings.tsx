"use client";

import { useState } from "react";
import {
	AlertCircleIcon,
	CopyIcon,
	GlobeIcon,
	RefreshIcon,
	ShieldIcon,
	SparklesIcon,
} from "./icons";

export function Settings() {
	const [customDomain, setCustomDomain] = useState("short.yourdomain.com");
	const [defaultExpiration, setDefaultExpiration] = useState("never");
	const [autoHealing, setAutoHealing] = useState(true);
	const [healingNotifications, setHealingNotifications] = useState(true);
	const [aiSummaries, setAiSummaries] = useState(true);
	const [aiChat, setAiChat] = useState(true);
	const [apiKey, setApiKey] = useState("sk_live_••••••••••••••••••••••••••••");
	const [webhookUrl, setWebhookUrl] = useState("");

	const handleGenerateApiKey = () => {
		const newKey =
			"sk_live_" +
			Math.random().toString(36).substring(2, 15) +
			Math.random().toString(36).substring(2, 15);
		setApiKey(newKey);
	};

	const handleCopyApiKey = () => {
		navigator.clipboard.writeText(apiKey);
	};

	return (
		<div className="space-y-6">
			{/* General Settings */}
			<div className="rounded-lg border border-border bg-card p-6">
				<div className="mb-6 flex items-center gap-3">
					<div className="rounded-lg bg-blue-100 p-2">
						<GlobeIcon className="h-5 w-5 text-blue-600" />
					</div>
					<div>
						<h3 className="font-mono text-base font-medium">
							General Settings
						</h3>
						<p className="font-mono text-xs text-muted-foreground">
							Configure ndle preferences
						</p>
					</div>
				</div>

				<div className="space-y-6">
					<div>
						<label className="font-mono text-sm font-medium">
							Custom Domain
						</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							Use your own domain for shortened links
						</p>
						<input
							type="text"
							value={customDomain}
							onChange={(e) => setCustomDomain(e.target.value)}
							placeholder="short.yourdomain.com"
							className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
						/>
						<p className="mt-2 font-mono text-xs text-muted-foreground">
							Add a CNAME record pointing to{" "}
							<code className="rounded bg-muted px-1 py-0.5">short.link</code>
						</p>
					</div>

					<div>
						<label className="font-mono text-sm font-medium">
							Default Link Expiration
						</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							Set default expiration time for new links
						</p>
						<select
							value={defaultExpiration}
							onChange={(e) => setDefaultExpiration(e.target.value)}
							className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
						>
							<option value="never">Never expire</option>
							<option value="7">7 days</option>
							<option value="30">30 days</option>
							<option value="90">90 days</option>
							<option value="365">1 year</option>
						</select>
					</div>

					<div>
						<label className="font-mono text-sm font-medium">Timezone</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							Used for analytics and scheduling
						</p>
						<select className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
							<option>UTC (Coordinated Universal Time)</option>
							<option>America/New_York (EST/EDT)</option>
							<option>America/Los_Angeles (PST/PDT)</option>
							<option>Europe/London (GMT/BST)</option>
							<option>Asia/Tokyo (JST)</option>
						</select>
					</div>
				</div>
			</div>

			{/* Self-Healing Settings */}
			<div className="rounded-lg border border-border bg-card p-6">
				<div className="mb-6 flex items-center gap-3">
					<div className="rounded-lg bg-green-100 p-2">
						<ShieldIcon className="h-5 w-5 text-green-600" />
					</div>
					<div>
						<h3 className="font-mono text-base font-medium">
							Self-Healing Settings
						</h3>
						<p className="font-mono text-xs text-muted-foreground">
							Configure automatic link healing behavior
						</p>
					</div>
				</div>

				<div className="space-y-6">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<label className="font-mono text-sm font-medium">
								Enable Auto-Healing
							</label>
							<p className="mt-1 font-mono text-xs text-muted-foreground">
								Automatically fix broken links using semantic search and Wayback
								Machine
							</p>
						</div>
						<button
							onClick={() => setAutoHealing(!autoHealing)}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
								autoHealing ? "bg-green-600" : "bg-gray-300"
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
									autoHealing ? "translate-x-6" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					<div className="flex items-start justify-between">
						<div className="flex-1">
							<label className="font-mono text-sm font-medium">
								Healing Notifications
							</label>
							<p className="mt-1 font-mono text-xs text-muted-foreground">
								Get notified when links are automatically healed
							</p>
						</div>
						<button
							onClick={() => setHealingNotifications(!healingNotifications)}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
								healingNotifications ? "bg-green-600" : "bg-gray-300"
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
									healingNotifications ? "translate-x-6" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					<div>
						<label className="font-mono text-sm font-medium">
							Healing Strategy
						</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							Choose how to handle broken links
						</p>
						<select className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
							<option>Semantic search first, then Wayback Machine</option>
							<option>Wayback Machine only</option>
							<option>Semantic search only</option>
							<option>Manual approval required</option>
						</select>
					</div>

					<div>
						<label className="font-mono text-sm font-medium">
							Check Frequency
						</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							How often to check link health
						</p>
						<select className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
							<option>Every hour</option>
							<option>Every 6 hours</option>
							<option>Daily</option>
							<option>Weekly</option>
						</select>
					</div>
				</div>
			</div>

			{/* AI Settings */}
			<div className="rounded-lg border border-border bg-card p-6">
				<div className="mb-6 flex items-center gap-3">
					<div className="rounded-lg bg-yellow-100 p-2">
						<SparklesIcon className="h-5 w-5 text-yellow-600" />
					</div>
					<div>
						<h3 className="font-mono text-base font-medium">AI Features</h3>
						<p className="font-mono text-xs text-muted-foreground">
							Configure AI-powered features
						</p>
					</div>
				</div>

				<div className="space-y-6">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<label className="font-mono text-sm font-medium">
								Auto-Generate Summaries
							</label>
							<p className="mt-1 font-mono text-xs text-muted-foreground">
								Automatically create AI summaries for new links
							</p>
						</div>
						<button
							onClick={() => setAiSummaries(!aiSummaries)}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
								aiSummaries ? "bg-yellow-600" : "bg-gray-300"
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
									aiSummaries ? "translate-x-6" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					<div className="flex items-start justify-between">
						<div className="flex-1">
							<label className="font-mono text-sm font-medium">
								Enable AI Chat
							</label>
							<p className="mt-1 font-mono text-xs text-muted-foreground">
								Ask questions about your links using AI
							</p>
						</div>
						<button
							onClick={() => setAiChat(!aiChat)}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
								aiChat ? "bg-yellow-600" : "bg-gray-300"
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
									aiChat ? "translate-x-6" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					<div>
						<label className="font-mono text-sm font-medium">
							Memory Retention
						</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							How long to keep AI conversation history
						</p>
						<select className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
							<option>Forever</option>
							<option>1 year</option>
							<option>6 months</option>
							<option>3 months</option>
							<option>1 month</option>
						</select>
					</div>

					<div>
						<label className="font-mono text-sm font-medium">AI Model</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							Choose the AI model for summaries and chat
						</p>
						<select className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20">
							<option>GPT-4 (Most capable)</option>
							<option>GPT-3.5 Turbo (Faster, cheaper)</option>
							<option>Claude 3 Opus (Alternative)</option>
							<option>Claude 3 Sonnet (Balanced)</option>
						</select>
					</div>
				</div>
			</div>

			{/* API Settings */}
			<div className="rounded-lg border border-border bg-card p-6">
				<div className="mb-6 flex items-center gap-3">
					<div className="rounded-lg bg-purple-100 p-2">
						<svg
							className="h-5 w-5 text-purple-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
							/>
						</svg>
					</div>
					<div>
						<h3 className="font-mono text-base font-medium">API Settings</h3>
						<p className="font-mono text-xs text-muted-foreground">
							Manage API access and webhooks
						</p>
					</div>
				</div>

				<div className="space-y-6">
					<div>
						<label className="font-mono text-sm font-medium">API Key</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							Use this key to authenticate API requests
						</p>
						<div className="mt-3 flex gap-2">
							<input
								type="text"
								value={apiKey}
								readOnly
								className="flex-1 rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm"
							/>
							<button
								onClick={handleCopyApiKey}
								className="rounded-md border border-border bg-background px-3 py-2 hover:bg-accent transition-colors"
							>
								<CopyIcon className="h-4 w-4" />
							</button>
							<button
								onClick={handleGenerateApiKey}
								className="rounded-md border border-border bg-background px-3 py-2 hover:bg-accent transition-colors"
							>
								<RefreshIcon className="h-4 w-4" />
							</button>
						</div>
						<p className="mt-2 font-mono text-xs text-muted-foreground">
							Keep your API key secret. Regenerating will invalidate the old
							key.
						</p>
					</div>

					<div>
						<label className="font-mono text-sm font-medium">Webhook URL</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							Receive notifications when links are created, clicked, or healed
						</p>
						<input
							type="text"
							value={webhookUrl}
							onChange={(e) => setWebhookUrl(e.target.value)}
							placeholder="https://your-app.com/webhooks/shortener"
							className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
						/>
					</div>

					<div>
						<label className="font-mono text-sm font-medium">
							Webhook Events
						</label>
						<p className="mt-1 font-mono text-xs text-muted-foreground">
							Choose which events trigger webhooks
						</p>
						<div className="mt-3 space-y-2">
							{[
								"Link created",
								"Link clicked",
								"Link healed",
								"Link expired",
								"Link deleted",
							].map((event) => (
								<label key={event} className="flex items-center gap-2">
									<input type="checkbox" defaultChecked className="rounded" />
									<span className="font-mono text-sm">{event}</span>
								</label>
							))}
						</div>
					</div>

					<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
						<div className="flex gap-3">
							<svg
								className="h-5 w-5 text-blue-600 flex-shrink-0"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<div>
								<h4 className="font-mono text-sm font-medium text-blue-900">
									API Documentation
								</h4>
								<p className="mt-1 font-mono text-xs text-blue-700">
									View the full API documentation at{" "}
									<a href="#" className="underline">
										docs.short.link/api
									</a>
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Danger Zone */}
			<div className="rounded-lg border border-red-200 bg-red-50 p-6">
				<div className="mb-6 flex items-center gap-3">
					<div className="rounded-lg bg-red-100 p-2">
						<AlertCircleIcon className="h-5 w-5 text-red-600" />
					</div>
					<div>
						<h3 className="font-mono text-base font-medium text-red-900">
							Danger Zone
						</h3>
						<p className="font-mono text-xs text-red-700">
							Irreversible and destructive actions
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-4">
						<div>
							<h4 className="font-mono text-sm font-medium text-red-900">
								Delete All Links
							</h4>
							<p className="mt-1 font-mono text-xs text-red-700">
								Permanently delete all shortened links and their data
							</p>
						</div>
						<button className="rounded-md bg-red-600 px-4 py-2 font-mono text-sm text-white transition-colors hover:bg-red-700">
							Delete All
						</button>
					</div>

					<div className="flex items-center justify-between rounded-lg border border-red-200 bg-white p-4">
						<div>
							<h4 className="font-mono text-sm font-medium text-red-900">
								Delete Account
							</h4>
							<p className="mt-1 font-mono text-xs text-red-700">
								Permanently delete your account and all associated data
							</p>
						</div>
						<button className="rounded-md bg-red-600 px-4 py-2 font-mono text-sm text-white transition-colors hover:bg-red-700">
							Delete Account
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
