import type { AssistantMessage, SessionEntry } from "@oh-my-pi/pi-wire";
import {
	AlertTriangle,
	BarChart3,
	CheckCircle2,
	Coins,
	Cpu,
	Database,
	Layers,
	PieChart,
	Sliders,
	Sparkles,
	TrendingUp,
	X,
	Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { GuestSnapshot } from "../../lib/client";
import { fmtCost, fmtPercent, fmtTokens, relTime } from "../../lib/format";
import "./analytics.css";

const BUDGET_KEY = "omp.collab.budget";

export interface BudgetConfig {
	enabled: boolean;
	tokenLimit: number; // e.g. 100000
	costLimit: number; // e.g. 0.50
}

const DEFAULT_BUDGET: BudgetConfig = {
	enabled: true,
	tokenLimit: 150000,
	costLimit: 0.5,
};

export function loadBudgetConfig(): BudgetConfig {
	try {
		const raw = localStorage.getItem(BUDGET_KEY);
		if (raw) return { ...DEFAULT_BUDGET, ...JSON.parse(raw) };
	} catch {
		// ignore
	}
	return DEFAULT_BUDGET;
}

export function saveBudgetConfig(config: BudgetConfig): void {
	try {
		localStorage.setItem(BUDGET_KEY, JSON.stringify(config));
	} catch {
		// ignore
	}
}

export interface AnalyticsDrawerProps {
	snapshot: GuestSnapshot;
	onClose(): void;
}

interface TurnDetail {
	id: string;
	timestamp: number;
	model: string;
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
	totalTokens: number;
	cost: number;
	textPreview: string;
}

export function AnalyticsDrawer({ snapshot, onClose }: AnalyticsDrawerProps): ReactNode {
	const { entries, stream, progress, state } = snapshot;

	const [budget, setBudget] = useState<BudgetConfig>(loadBudgetConfig);
	const [activeTab, setActiveTab] = useState<"overview" | "turns" | "agents" | "budget">("overview");

	const updateBudget = (patch: Partial<BudgetConfig>) => {
		setBudget(prev => {
			const next = { ...prev, ...patch };
			saveBudgetConfig(next);
			return next;
		});
	};

	// Detailed Metrics Calculation
	const analytics = useMemo(() => {
		let totalInput = 0;
		let totalOutput = 0;
		let totalCacheRead = 0;
		let totalCacheWrite = 0;
		let totalTokens = 0;
		let totalCost = 0;

		const turns: TurnDetail[] = [];

		// Process Session Entries
		entries.forEach((entry, idx) => {
			if (entry.type === "message" && entry.message.role === "assistant") {
				const msg = entry.message as AssistantMessage;
				const u = msg.usage;

				const inp = u?.input ?? 0;
				const out = u?.output ?? 0;
				const cr = u?.cacheRead ?? 0;
				const cw = u?.cacheWrite ?? 0;
				const tok = u?.totalTokens ?? inp + out + cr + cw;
				const cst = u?.cost?.total ?? 0;

				totalInput += inp;
				totalOutput += out;
				totalCacheRead += cr;
				totalCacheWrite += cw;
				totalTokens += tok;
				totalCost += cst;

				let textPreview = "";
				if (typeof msg.content === "string") {
					textPreview = msg.content;
				} else if (Array.isArray(msg.content)) {
					const firstText = msg.content.find(b => typeof b === "object" && "text" in b);
					textPreview = (firstText as { text?: string })?.text ?? "Assistant response";
				}

				let turnTs = Date.now();
				if ("timestamp" in entry) {
					const rawTs = (entry as unknown as { timestamp?: unknown }).timestamp;
					if (typeof rawTs === "number") turnTs = rawTs;
					else if (typeof rawTs === "string") {
						const parsed = Date.parse(rawTs);
						if (!Number.isNaN(parsed)) turnTs = parsed;
					}
				}

				turns.push({
					id: `entry-${idx}`,
					timestamp: turnTs,
					model: msg.model ?? state?.model?.name ?? "Agent Model",
					input: inp,
					output: out,
					cacheRead: cr,
					cacheWrite: cw,
					totalTokens: tok,
					cost: cst,
					textPreview: textPreview.slice(0, 80) + (textPreview.length > 80 ? "…" : ""),
				});
			}
		});

		// Process Streaming Ghost Message
		if (stream?.usage) {
			const u = stream.usage;
			const inp = u.input ?? 0;
			const out = u.output ?? 0;
			const cr = u.cacheRead ?? 0;
			const cw = u.cacheWrite ?? 0;
			const tok = u.totalTokens ?? inp + out + cr + cw;
			const cst = u.cost?.total ?? 0;

			totalInput += inp;
			totalOutput += out;
			totalCacheRead += cr;
			totalCacheWrite += cw;
			totalTokens += tok;
			totalCost += cst;
		}

		// Process Subagents
		const agentStats: Array<{ id: string; name: string; tokens: number; cost: number; kind: string }> = [];

		// Host Agent
		agentStats.push({
			id: "host",
			name: "Host Agent",
			tokens: totalTokens,
			cost: totalCost,
			kind: "host",
		});

		for (const [id, p] of progress.entries()) {
			if (p.progress) {
				const tok = p.progress.tokens ?? 0;
				const cst = p.progress.cost ?? 0;

				totalTokens += tok;
				totalCost += cst;

				const agMeta = snapshot.agents.find(a => a.id === id);
				agentStats.push({
					id,
					name: agMeta?.displayName ?? `Subagent ${id.slice(0, 6)}`,
					tokens: tok,
					cost: cst,
					kind: "sub",
				});
			}
		}

		// Cache Hit Efficiency
		const cacheDenominator = totalCacheRead + totalInput;
		const cacheHitRatio = cacheDenominator > 0 ? (totalCacheRead / cacheDenominator) * 100 : 0;

		return {
			totalInput,
			totalOutput,
			totalCacheRead,
			totalCacheWrite,
			totalTokens,
			totalCost,
			cacheHitRatio,
			turns,
			agentStats,
		};
	}, [entries, stream, progress, state, snapshot.agents]);

	// Context Window Stats
	const contextUsage = state?.contextUsage;
	const contextWindow = contextUsage?.contextWindow ?? 200000;
	const contextTokens = contextUsage?.tokens ?? analytics.totalTokens;
	const contextPct = (contextTokens / contextWindow) * 100;

	// Budget Progress
	const tokenPct = budget.enabled && budget.tokenLimit > 0 ? (analytics.totalTokens / budget.tokenLimit) * 100 : 0;
	const costPct = budget.enabled && budget.costLimit > 0 ? (analytics.totalCost / budget.costLimit) * 100 : 0;
	const maxBudgetPct = Math.max(tokenPct, costPct);
	const isWarning = budget.enabled && maxBudgetPct >= 80 && maxBudgetPct < 100;
	const isExceeded = budget.enabled && maxBudgetPct >= 100;

	return (
		<div className="an-drawer-overlay">
			<aside className="an-drawer">
				{/* Drawer Header */}
				<div className="an-header">
					<div className="an-header-title">
						<div className="an-header-icon">
							<BarChart3 size={18} />
						</div>
						<div>
							<h3>Token Analytics & Cost</h3>
							<p className="an-header-sub">Real-time model consumption and budget management</p>
						</div>
					</div>
					<button type="button" className="an-close-btn" onClick={onClose} title="Close analytics">
						<X size={16} />
					</button>
				</div>

				{/* Budget Alert Banner if approaching or exceeding threshold */}
				{budget.enabled && (isWarning || isExceeded) && (
					<div className={`an-alert-banner ${isExceeded ? "an-alert-danger" : "an-alert-warning"}`}>
						<AlertTriangle size={16} className="an-alert-icon" />
						<div className="an-alert-text">
							<strong>{isExceeded ? "Budget Threshold Exceeded!" : "Budget Warning (80%+ Used)"}</strong>
							<span>
								{analytics.totalTokens.toLocaleString()} / {budget.tokenLimit.toLocaleString()} tokens (
								{tokenPct.toFixed(0)}%), {fmtCost(analytics.totalCost)} / {fmtCost(budget.costLimit)} (
								{costPct.toFixed(0)}%)
							</span>
						</div>
					</div>
				)}

				{/* Key Metric Cards Grid */}
				<div className="an-metrics-grid">
					<div className="an-card">
						<div className="an-card-header">
							<span className="an-card-label">Total Tokens</span>
							<Zap size={14} className="an-icon-zap" />
						</div>
						<div className="an-card-val">{fmtTokens(analytics.totalTokens)}</div>
						<div className="an-card-sub">{analytics.totalTokens.toLocaleString()} tokens</div>
					</div>

					<div className="an-card">
						<div className="an-card-header">
							<span className="an-card-label">Estimated Cost</span>
							<Coins size={14} className="an-icon-cost" />
						</div>
						<div className="an-card-val">{fmtCost(analytics.totalCost)}</div>
						<div className="an-card-sub">
							Avg {fmtCost((analytics.totalCost / (analytics.totalTokens || 1)) * 1000)} / 1k tok
						</div>
					</div>

					<div className="an-card">
						<div className="an-card-header">
							<span className="an-card-label">Context Window</span>
							<Cpu size={14} className="an-icon-cpu" />
						</div>
						<div className="an-card-val">{fmtPercent(contextPct)}</div>
						<div className="an-card-sub">
							{fmtTokens(contextTokens)} / {fmtTokens(contextWindow)}
						</div>
					</div>

					<div className="an-card">
						<div className="an-card-header">
							<span className="an-card-label">Cache Hit Ratio</span>
							<Database size={14} className="an-icon-db" />
						</div>
						<div className="an-card-val">{analytics.cacheHitRatio.toFixed(1)}%</div>
						<div className="an-card-sub">{fmtTokens(analytics.totalCacheRead)} read tokens</div>
					</div>
				</div>

				{/* Navigation Tabs */}
				<div className="an-tabs">
					<button
						type="button"
						className={`an-tab ${activeTab === "overview" ? "an-tab-active" : ""}`}
						onClick={() => setActiveTab("overview")}
					>
						<PieChart size={13} />
						Overview
					</button>
					<button
						type="button"
						className={`an-tab ${activeTab === "turns" ? "an-tab-active" : ""}`}
						onClick={() => setActiveTab("turns")}
					>
						<Layers size={13} />
						Turns ({analytics.turns.length})
					</button>
					<button
						type="button"
						className={`an-tab ${activeTab === "agents" ? "an-tab-active" : ""}`}
						onClick={() => setActiveTab("agents")}
					>
						<Sparkles size={13} />
						Agents ({analytics.agentStats.length})
					</button>
					<button
						type="button"
						className={`an-tab ${activeTab === "budget" ? "an-tab-active" : ""}`}
						onClick={() => setActiveTab("budget")}
					>
						<Sliders size={13} />
						Budget Limits
						{budget.enabled && (isWarning || isExceeded) && <span className="an-tab-badge" />}
					</button>
				</div>

				{/* TAB CONTENTS */}
				<div className="an-body">
					{/* OVERVIEW TAB */}
					{activeTab === "overview" && (
						<div className="an-section">
							<h4 className="an-section-title">
								<TrendingUp size={14} /> Token Type Distribution
							</h4>

							{/* Visual Multi-segment Bar */}
							<div className="an-distribution-bar">
								<div
									className="an-bar-seg an-seg-input"
									style={{
										width: `${(analytics.totalInput / (analytics.totalTokens || 1)) * 100}%`,
									}}
									title={`Prompt Input: ${analytics.totalInput.toLocaleString()}`}
								/>
								<div
									className="an-bar-seg an-seg-output"
									style={{
										width: `${(analytics.totalOutput / (analytics.totalTokens || 1)) * 100}%`,
									}}
									title={`Completion Output: ${analytics.totalOutput.toLocaleString()}`}
								/>
								<div
									className="an-bar-seg an-seg-cacheread"
									style={{
										width: `${(analytics.totalCacheRead / (analytics.totalTokens || 1)) * 100}%`,
									}}
									title={`Cache Read: ${analytics.totalCacheRead.toLocaleString()}`}
								/>
								<div
									className="an-bar-seg an-seg-cachewrite"
									style={{
										width: `${(analytics.totalCacheWrite / (analytics.totalTokens || 1)) * 100}%`,
									}}
									title={`Cache Write: ${analytics.totalCacheWrite.toLocaleString()}`}
								/>
							</div>

							{/* Distribution Legend Table */}
							<div className="an-legend-table">
								<div className="an-legend-row">
									<div className="an-legend-label">
										<span className="an-dot an-dot-input" />
										<span>Prompt Input Tokens</span>
									</div>
									<div className="an-legend-val">
										<span>{analytics.totalInput.toLocaleString()}</span>
										<span className="an-legend-pct">
											(
											{(
												(analytics.totalInput / (analytics.totalTokens || 1)) *
												100
											).toFixed(1)}
											%)
										</span>
									</div>
								</div>

								<div className="an-legend-row">
									<div className="an-legend-label">
										<span className="an-dot an-dot-output" />
										<span>Completion Output Tokens</span>
									</div>
									<div className="an-legend-val">
										<span>{analytics.totalOutput.toLocaleString()}</span>
										<span className="an-legend-pct">
											(
											{(
												(analytics.totalOutput / (analytics.totalTokens || 1)) *
												100
											).toFixed(1)}
											%)
										</span>
									</div>
								</div>

								<div className="an-legend-row">
									<div className="an-legend-label">
										<span className="an-dot an-dot-cacheread" />
										<span>Cache Read Tokens (Saved)</span>
									</div>
									<div className="an-legend-val">
										<span>{analytics.totalCacheRead.toLocaleString()}</span>
										<span className="an-legend-pct">
											(
											{(
												(analytics.totalCacheRead / (analytics.totalTokens || 1)) *
												100
											).toFixed(1)}
											%)
										</span>
									</div>
								</div>

								<div className="an-legend-row">
									<div className="an-legend-label">
										<span className="an-dot an-dot-cachewrite" />
										<span>Cache Creation / Write Tokens</span>
									</div>
									<div className="an-legend-val">
										<span>{analytics.totalCacheWrite.toLocaleString()}</span>
										<span className="an-legend-pct">
											(
											{(
												(analytics.totalCacheWrite / (analytics.totalTokens || 1)) *
												100
											).toFixed(1)}
											%)
										</span>
									</div>
								</div>
							</div>

							{/* Model Information */}
							<div className="an-model-info">
								<div className="an-model-header">
									<Cpu size={14} />
									<span>Active Session Model</span>
								</div>
								<div className="an-model-body">
									<div className="an-model-name">{state?.model?.name ?? "Default Model"}</div>
									<div className="an-model-desc">
										Tokens and cost estimates are aggregated in real-time across all session turns,
										streaming responses, and active subagent worker threads.
									</div>
								</div>
							</div>
						</div>
					)}

					{/* TURNS TAB */}
					{activeTab === "turns" && (
						<div className="an-section">
							<h4 className="an-section-title">Message Turns ({analytics.turns.length})</h4>
							{analytics.turns.length === 0 ? (
								<div className="an-empty">No assistant turns recorded yet.</div>
							) : (
								<div className="an-turns-list">
									{analytics.turns.map((turn, i) => (
										<div key={turn.id} className="an-turn-card">
											<div className="an-turn-top">
												<span className="an-turn-idx">Turn #{i + 1}</span>
												<span className="an-turn-time">{relTime(turn.timestamp)}</span>
												<span className="an-turn-cost">{fmtCost(turn.cost)}</span>
											</div>
											<div className="an-turn-preview">{turn.textPreview || "(Tool execution)"}</div>
											<div className="an-turn-pills">
												<span className="an-turn-pill">In: {turn.input.toLocaleString()}</span>
												<span className="an-turn-pill">Out: {turn.output.toLocaleString()}</span>
												{turn.cacheRead > 0 && (
													<span className="an-turn-pill an-pill-cache">
														Cache: {turn.cacheRead.toLocaleString()}
													</span>
												)}
												<span className="an-turn-pill an-pill-tot">
													Tot: {turn.totalTokens.toLocaleString()}
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					)}

					{/* AGENTS TAB */}
					{activeTab === "agents" && (
						<div className="an-section">
							<h4 className="an-section-title">Agent & Subagent Consumption</h4>
							<div className="an-agent-list">
								{analytics.agentStats.map(ag => (
									<div key={ag.id} className="an-agent-card">
										<div className="an-agent-row">
											<div className="an-agent-info">
												<span className={`an-agent-tag an-tag-${ag.kind}`}>
													{ag.kind === "host" ? "Host" : "Subagent"}
												</span>
												<span className="an-agent-name">{ag.name}</span>
											</div>
											<div className="an-agent-metrics">
												<span className="an-agent-tok">{fmtTokens(ag.tokens)}</span>
												<span className="an-agent-cst">{fmtCost(ag.cost)}</span>
											</div>
										</div>
										<div className="an-agent-bar-bg">
											<div
												className="an-agent-bar-fill"
												style={{
													width: `${(ag.tokens / (analytics.totalTokens || 1)) * 100}%`,
												}}
											/>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* BUDGET CONFIG TAB */}
					{activeTab === "budget" && (
						<div className="an-section">
							<h4 className="an-section-title">
								<Sliders size={14} /> Session Budget & Alerts
							</h4>

							<div className="an-budget-toggle">
								<label className="an-toggle-label">
									<input
										type="checkbox"
										checked={budget.enabled}
										onChange={e => updateBudget({ enabled: e.target.checked })}
									/>
									<span>Enable Budget Tracking & Alerts</span>
								</label>
							</div>

							{budget.enabled && (
								<div className="an-budget-fields">
									<div className="an-field">
										<label>Token Budget Limit</label>
										<div className="an-field-input">
											<input
												type="number"
												step="10000"
												min="5000"
												value={budget.tokenLimit}
												onChange={e =>
													updateBudget({ tokenLimit: Math.max(1000, Number(e.target.value)) })
												}
											/>
											<span className="an-input-unit">tokens</span>
										</div>
										<div className="an-preset-chips">
											{[50000, 100000, 250000, 500000, 1000000].map(val => (
												<button
													key={val}
													type="button"
													className={`an-preset-chip ${budget.tokenLimit === val ? "active" : ""}`}
													onClick={() => updateBudget({ tokenLimit: val })}
												>
													{fmtTokens(val)}
												</button>
											))}
										</div>
									</div>

									<div className="an-field">
										<label>Cost Budget Limit (USD)</label>
										<div className="an-field-input">
											<input
												type="number"
												step="0.05"
												min="0.01"
												value={budget.costLimit}
												onChange={e =>
													updateBudget({ costLimit: Math.max(0.01, Number(e.target.value)) })
												}
											/>
											<span className="an-input-unit">USD</span>
										</div>
										<div className="an-preset-chips">
											{[0.1, 0.25, 0.5, 1.0, 2.5, 5.0].map(val => (
												<button
													key={val}
													type="button"
													className={`an-preset-chip ${budget.costLimit === val ? "active" : ""}`}
													onClick={() => updateBudget({ costLimit: val })}
												>
													${val.toFixed(2)}
												</button>
											))}
										</div>
									</div>

									{/* Progress Gauges */}
									<div className="an-budget-gauges">
										<div className="an-gauge-item">
											<div className="an-gauge-header">
												<span>Token Limit Progress</span>
												<span>
													{analytics.totalTokens.toLocaleString()} /{" "}
													{budget.tokenLimit.toLocaleString()} ({tokenPct.toFixed(1)}%)
												</span>
											</div>
											<div className="an-gauge-bar">
												<div
													className={`an-gauge-fill ${tokenPct >= 100 ? "exceeded" : tokenPct >= 80 ? "warn" : ""}`}
													style={{ width: `${Math.min(100, tokenPct)}%` }}
												/>
											</div>
										</div>

										<div className="an-gauge-item">
											<div className="an-gauge-header">
												<span>Cost Limit Progress</span>
												<span>
													{fmtCost(analytics.totalCost)} / {fmtCost(budget.costLimit)} (
													{costPct.toFixed(1)}%)
												</span>
											</div>
											<div className="an-gauge-bar">
												<div
													className={`an-gauge-fill ${costPct >= 100 ? "exceeded" : costPct >= 80 ? "warn" : ""}`}
													style={{ width: `${Math.min(100, costPct)}%` }}
												/>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</aside>
		</div>
	);
}
