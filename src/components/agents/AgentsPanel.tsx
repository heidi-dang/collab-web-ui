import type {
	AgentProgress,
	AgentSnapshot,
	SubagentLifecyclePayload,
	SubagentProgressPayload,
} from "@oh-my-pi/pi-wire";
import { Check, Hash, Layers, Pencil, Plus, Server, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSessionManager } from "../../hooks/useSessionManager";
import { PortalModal } from "../common/PortalModal";
import { fmtCost, fmtDuration, fmtTokens, relTime } from "../../lib/format";
import "./agents.css";

/** Re-render tick so running-tool durations and relative times stay live. */
function useNow(intervalMs: number): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(timer);
	}, [intervalMs]);
	return now;
}

/**
 * Best-effort start timestamp for the in-flight tool. The host serializes the
 * full AgentProgress (which carries `currentToolStartMs`); the wire mirror
 * omits it, so read it tolerantly and fall back to the last tool's end time.
 */
function toolStartMs(p: AgentProgress): number | null {
	const start = (p as { currentToolStartMs?: unknown }).currentToolStartMs;
	if (typeof start === "number") return start;
	const lastEnd = p.recentTools[0]?.endMs;
	return typeof lastEnd === "number" ? lastEnd : null;
}

function activityLine(
	agent: AgentSnapshot,
	p: AgentProgress | undefined,
	lc: SubagentLifecyclePayload | undefined,
	now: number,
): string {
	if (p?.currentTool) {
		const start = toolStartMs(p);
		if (start !== null) return `${p.currentTool} · ${fmtDuration(Math.max(0, now - start))}`;
		return p.currentTool;
	}
	if (p?.lastIntent) return p.lastIntent;
	if (lc) return lc.status;
	return agent.status;
}

function AgentRow(props: {
	agent: AgentSnapshot;
	payload: SubagentProgressPayload | undefined;
	lifecycle: SubagentLifecyclePayload | undefined;
	selected: boolean;
	now: number;
	onSelect(id: string | null): void;
}): ReactNode {
	const { agent, payload, lifecycle, selected, now, onSelect } = props;
	const p = payload?.progress;
	return (
		<button
			type="button"
			className={selected ? "ag-row ag-row--selected" : "ag-row"}
			onClick={() => onSelect(selected ? null : agent.id)}
		>
			<span className="ag-row-head">
				<span className={`ag-dot ag-dot--${agent.status}`} />
				<span className="ag-row-name">{agent.displayName}</span>
				<span className="ag-chip">{agent.kind}</span>
			</span>
			<span className="ag-row-activity">{activityLine(agent, p, lifecycle, now)}</span>
			<span className="ag-row-meta">
				{p ? <span>{fmtTokens(p.tokens)} tok</span> : null}
				{p ? <span>{fmtCost(p.cost)}</span> : null}
				<span className="ag-row-meta-when">{relTime(agent.lastActivity)}</span>
			</span>
		</button>
	);
}

export function AgentsPanel(props: {
	agents: readonly AgentSnapshot[];
	progress: ReadonlyMap<string, SubagentProgressPayload>;
	lifecycle: ReadonlyMap<string, SubagentLifecyclePayload>;
	selectedId: string | null;
	onSelect(id: string | null): void;
}): ReactNode {
	const { agents, progress, lifecycle, selectedId, onSelect } = props;
	const now = useNow(1000);
	const { activeHash, sessions, switchSession, addSession, removeSession, renameSession } = useSessionManager();

	const [isAddOpen, setIsAddOpen] = useState(false);
	const [newName, setNewName] = useState("");
	const [newHash, setNewHash] = useState("");
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const editRef = useRef<HTMLInputElement | null>(null);

	const handleAddServer = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newName.trim()) return;
		addSession(newName, newHash || undefined);
		setNewName("");
		setNewHash("");
		setIsAddOpen(false);
	};

	const handleRename = (id: string) => {
		if (editName.trim() && editName.trim() !== sessions.find(s => s.id === id)?.name) {
			renameSession(id, editName.trim());
		}
		setEditingId(null);
	};

	const startRename = (id: string, currentName: string) => {
		setEditingId(id);
		setEditName(currentName);
		// Focus the input on next render
		setTimeout(() => editRef.current?.focus(), 0);
	};

	const handleConfirmDelete = () => {
		if (confirmDeleteId) {
			removeSession(confirmDeleteId);
			setConfirmDeleteId(null);
		}
	};

	const sorted = useMemo(() => {
		const mains: AgentSnapshot[] = [];
		const subs: AgentSnapshot[] = [];
		for (const agent of agents) (agent.kind === "main" ? mains : subs).push(agent);
		subs.sort((a, b) => {
			const ar = a.status === "running" ? 0 : 1;
			const br = b.status === "running" ? 0 : 1;
			if (ar !== br) return ar - br;
			return b.lastActivity - a.lastActivity;
		});
		return { mains, subs };
	}, [agents]);

	return (
		<div className="ag-panel">
			{/* Workspaces & VPS Servers Section */}
			<div className="ag-section">
				<div className="ag-section-header">
					<div className="ag-section-title">
						<Server size={13} className="ag-section-icon" />
						<span>Workspaces & Servers</span>
					</div>
					<button
						type="button"
						className="ag-add-btn"
						onClick={() => setIsAddOpen((open) => !open)}
						title="Add Workspace / VPS Server"
					>
						<Plus size={13} />
						<span>Add Server</span>
					</button>
				</div>

				{/* Add Server Portal Modal */}
				<PortalModal
					isOpen={isAddOpen}
					onClose={() => setIsAddOpen(false)}
					title="Add Workspace / Server"
				>
					<form className="ag-add-form space-y-4" onSubmit={handleAddServer}>
						<div className="ag-add-field">
							<label className="ag-add-label">Server / Workspace Name</label>
							<input
								type="text"
								required
								placeholder="e.g. Production VPS"
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								className="ag-add-input"
							/>
						</div>
						<div className="ag-add-field">
							<label className="ag-add-label">Custom Room Hash (Optional)</label>
							<input
								type="text"
								placeholder="e.g. #vps-prod-1"
								value={newHash}
								onChange={(e) => setNewHash(e.target.value)}
								className="ag-add-input"
							/>
						</div>
						<div className="ag-add-actions flex items-center justify-end gap-2 pt-2">
							<button
								type="button"
								className="ag-btn-secondary"
								onClick={() => setIsAddOpen(false)}
							>
								Cancel
							</button>
							<button type="submit" className="ag-btn-primary">
								<Check size={12} /> Save Server
							</button>
						</div>
					</form>
				</PortalModal>

				<div className="ag-workspace-list">
					{sessions.map((session) => {
						const isActive = session.hash === activeHash;
						const isEditing = editingId === session.id;
						return (
							<div
								key={session.id}
								className={`ag-ws-card ${isActive ? "ag-ws-card--active" : ""}`}
								onClick={() => {
									if (isEditing) return;
									switchSession(session.hash);
								}}
							>
								<div className="ag-ws-info">
									{isEditing ? (
										<input
											ref={editRef}
											className="ag-ws-edit-input"
											type="text"
											value={editName}
											onChange={(e) => setEditName(e.target.value)}
											onBlur={() => handleRename(session.id)}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleRename(session.id);
												if (e.key === "Escape") setEditingId(null);
											}}
											onClick={(e) => e.stopPropagation()}
											maxLength={48}
										/>
									) : (
										<span className="ag-ws-name">
											<Hash size={12} className={isActive ? "text-indigo" : "text-faint"} />
											{session.name}
										</span>
									)}
								</div>
								<div className="ag-ws-actions">
									{isActive ? (
										<span className="ag-chip ag-chip--running">Connected</span>
									) : (
										sessions.length > 1 && (
											<>
												<button
													type="button"
													className="ag-ws-rename"
													onClick={(e) => {
														e.stopPropagation();
														startRename(session.id, session.name);
													}}
													title="Rename Server"
												>
													<Pencil size={10} />
												</button>
												<button
													type="button"
													className="ag-ws-delete"
													onClick={(e) => {
														e.stopPropagation();
														setConfirmDeleteId(session.id);
													}}
													title="Remove Server"
												>
													<Trash2 size={12} />
												</button>
											</>
										)
									)}
								</div>
							</div>
						);
					})}
				</div>

				{/* Confirm Delete Modal */}
				<PortalModal
					isOpen={confirmDeleteId !== null}
					onClose={() => setConfirmDeleteId(null)}
					title="Remove Server"
				>
					<p className="ag-confirm-text">
						Are you sure you want to remove{" "}
						<strong>{sessions.find((s) => s.id === confirmDeleteId)?.name ?? "this server"}</strong>?
						<br />
						This action cannot be undone.
					</p>
					<div className="ag-add-actions flex items-center justify-end gap-2 pt-4">
						<button
							type="button"
							className="ag-btn-secondary"
							onClick={() => setConfirmDeleteId(null)}
						>
							Cancel
						</button>
						<button
							type="button"
							className="ag-btn-danger"
							onClick={handleConfirmDelete}
						>
							<Trash2 size={12} /> Remove
						</button>
					</div>
				</PortalModal>
			</div>

			<div className="ag-divider" />

			{/* Agents Section */}
			<div className="ag-section">
				<div className="ag-section-header">
					<div className="ag-section-title">
						<Layers size={13} className="ag-section-icon" />
						<span>Agents & Subagents</span>
					</div>
				</div>

				{sorted.mains.map((agent) => (
					<AgentRow
						key={agent.id}
						agent={agent}
						payload={progress.get(agent.id)}
						lifecycle={lifecycle.get(agent.id)}
						selected={selectedId === agent.id}
						now={now}
						onSelect={onSelect}
					/>
				))}
				{sorted.subs.map((agent) => (
					<AgentRow
						key={agent.id}
						agent={agent}
						payload={progress.get(agent.id)}
						lifecycle={lifecycle.get(agent.id)}
						selected={selectedId === agent.id}
						now={now}
						onSelect={onSelect}
					/>
				))}
				{sorted.subs.length === 0 ? <div className="ag-empty">no subagents</div> : null}
			</div>
		</div>
	);
}

