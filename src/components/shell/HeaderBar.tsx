import { BarChart3, Coins, Cpu, LogOut, PanelRight, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { GuestSnapshot } from "../../lib/client";
import { fmtCost, fmtPercent, fmtTokens, shortenPath } from "../../lib/format";
import { ThemeToggle } from "./ThemeToggle";

export interface HeaderBarProps {
	snapshot: GuestSnapshot;
	subCount: number;
	railOpen: boolean;
	onToggleRail(): void;
	onLeave(): void;
	onOpenAnalytics?(): void;
}

export function HeaderBar({
	snapshot,
	subCount,
	railOpen,
	onToggleRail,
	onLeave,
	onOpenAnalytics,
}: HeaderBarProps): ReactNode {
	const { header, state, phase, readOnly, entries, stream, progress } = snapshot;
	const title = header?.title ?? state?.sessionName ?? "session";
	const usage = state?.contextUsage;

	let pct: number | null = null;
	if (usage) {
		pct =
			usage.percent ??
			(usage.tokens != null && usage.contextWindow !== null && usage.contextWindow > 0
				? (usage.tokens / usage.contextWindow) * 100
				: null);
	}

	// Real-time aggregate tokens and cost across entries, active stream, and subagents
	const metrics = useMemo(() => {
		let totalTokens = 0;
		let totalCost = 0;

		// 1. Session entries
		for (const entry of entries) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				const u = entry.message.usage;
				if (u) {
					const tok =
						u.totalTokens ?? ((u.input ?? 0) + (u.output ?? 0) + (u.cacheRead ?? 0) + (u.cacheWrite ?? 0));
					totalTokens += tok;
					if (u.cost?.total) totalCost += u.cost.total;
				}
			}
		}

		// 2. In-flight streaming message
		if (stream?.usage) {
			const u = stream.usage;
			const tok = u.totalTokens ?? ((u.input ?? 0) + (u.output ?? 0) + (u.cacheRead ?? 0) + (u.cacheWrite ?? 0));
			totalTokens += tok;
			if (u.cost?.total) totalCost += u.cost.total;
		}

		// 3. Subagent progress
		for (const p of progress.values()) {
			if (p.progress) {
				totalTokens += p.progress.tokens ?? 0;
				totalCost += p.progress.cost ?? 0;
			}
		}

		return { totalTokens, totalCost };
	}, [entries, stream, progress]);

	return (
		<header className="sh-header">
			<div className="sh-header-left">
				<span className="sh-title" title={title}>
					{title}
				</span>
				{state?.cwd && (
					<span className="sh-cwd" title={state.cwd}>
						{shortenPath(state.cwd)}
					</span>
				)}
			</div>
			<div className="sh-header-right">
				{readOnly && (
					<span className="sh-chip" title="you joined with a read-only link — watching only">
						read-only
					</span>
				)}
				{state?.model && (
					<span className="sh-chip sh-chip-meta" title={`Model: ${state.model.name}`}>
						<Cpu size={11} className="sh-chip-icon" />
						{state.model.name}
					</span>
				)}
				{/* Real-time Token Usage & Cost display - Click to open Analytics Drawer */}
				<button
					type="button"
					className="sh-chip sh-chip-usage sh-chip-interactive"
					onClick={onOpenAnalytics}
					title={`Real-time token count: ${metrics.totalTokens.toLocaleString()} tokens · Click for detailed Analytics`}
				>
					<Zap size={11} className="sh-chip-icon sh-chip-icon-zap" />
					<span>{fmtTokens(metrics.totalTokens)}</span>
				</button>
				<button
					type="button"
					className="sh-chip sh-chip-cost sh-chip-interactive"
					onClick={onOpenAnalytics}
					title={`Real-time estimated cost: $${metrics.totalCost.toFixed(4)} USD · Click for detailed Analytics`}
				>
					<Coins size={11} className="sh-chip-icon sh-chip-icon-cost" />
					<span>{fmtCost(metrics.totalCost)}</span>
				</button>

				{pct != null && (
					<span
						className={pct > 80 ? "sh-gauge sh-gauge-warn" : "sh-gauge"}
						title={`context window · ${usage?.tokens != null ? `${usage.tokens.toLocaleString()} / ${usage.contextWindow?.toLocaleString() ?? "?"}` : ""} (${fmtPercent(pct)})`}
					>
						<span className="sh-gauge-track">
							<span className="sh-gauge-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
						</span>
						<span className="sh-gauge-pct">{fmtPercent(pct)}</span>
					</span>
				)}
				{state && state.participants.length > 0 && (
					<span className="sh-avatars">
						{state.participants.map((p, i) => (
							<span
								key={`${p.name}:${i}`}
								className={p.role === "host" ? "sh-avatar sh-avatar-host" : "sh-avatar"}
								title={`${p.name} · ${p.role}${p.readOnly ? " · view-only" : ""}`}
							>
								{(p.name[0] ?? "?").toUpperCase()}
							</span>
						))}
					</span>
				)}
				<ThemeToggle />
				{onOpenAnalytics && (
					<button
						type="button"
						className="sh-btn sh-btn-icon"
						onClick={onOpenAnalytics}
						title="Token Analytics & Cost Breakdown"
					>
						<BarChart3 size={14} />
					</button>
				)}
				<button
					type="button"
					className={railOpen ? "sh-btn sh-btn-icon sh-btn-on" : "sh-btn sh-btn-icon"}
					onClick={onToggleRail}
					title={railOpen ? "hide agents" : "show agents"}
				>
					<PanelRight size={14} />
					{subCount > 0 && <span className="sh-badge">{subCount}</span>}
				</button>
				<button type="button" className="sh-btn sh-btn-icon" onClick={onLeave} title="leave session">
					<LogOut size={14} />
				</button>
			</div>
		</header>
	);
}
