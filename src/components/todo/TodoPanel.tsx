import type { AssistantMessage, SessionEntry, ToolResultMessage } from "@oh-my-pi/pi-wire";
import { CheckCircle2, Circle, CircleDashed, ListTodo, X, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { GuestSnapshot } from "../../lib/client";
import "./todo-panel.css";

/* ------------------------------------------------------------------ */
/*  Data model                                                         */
/* ------------------------------------------------------------------ */

type TaskStatus = "pending" | "in_progress" | "completed" | "abandoned";

interface TaskItem {
	content: string;
	status: TaskStatus;
}

interface PhaseGroup {
	name: string;
	tasks: TaskItem[];
}

interface TodoState {
	phases: PhaseGroup[];
	/** All tasks flattened for quick progress computation. */
	total: number;
	completed: number;
}

const STATUS_ICONS: Record<TaskStatus, ReactNode> = {
	pending: <Circle size={14} className="tp-icon-pending" />,
	in_progress: <CircleDashed size={14} className="tp-icon-in-progress" />,
	completed: <CheckCircle2 size={14} className="tp-icon-completed" />,
	abandoned: <XCircle size={14} className="tp-icon-abandoned" />,
};

/* ------------------------------------------------------------------ */
/*  Derive latest todo state from entries                              */
/* ------------------------------------------------------------------ */

function extractTodoState(entries: readonly SessionEntry[]): TodoState | null {
	// Walk backwards to find the latest complete todo tool result with phases.
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "message") continue;
		const msg = entry.message;
		if (msg.role !== "toolResult") continue;
		const tr = msg as ToolResultMessage;
		if (tr.toolName !== "todo") continue;
		const details = tr.details;
		if (!details || typeof details !== "object" || Array.isArray(details)) continue;
		const rawPhases = (details as Record<string, unknown>).phases;
		if (!Array.isArray(rawPhases) || rawPhases.length === 0) continue;

		const phases: PhaseGroup[] = [];
		let total = 0;
		let completed = 0;

		for (const raw of rawPhases) {
			if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
			const p = raw as Record<string, unknown>;
			const name = typeof p.name === "string" ? p.name : "";
			const rawTasks = p.tasks;
			const tasks: TaskItem[] = [];
			if (Array.isArray(rawTasks)) {
				for (const t of rawTasks) {
					if (!t || typeof t !== "object" || Array.isArray(t)) continue;
					const task = t as Record<string, unknown>;
					const content = typeof task.content === "string" ? task.content : "";
					const rawStatus = task.status;
					const status: TaskStatus =
						rawStatus === "completed"
							? "completed"
							: rawStatus === "in_progress"
								? "in_progress"
								: rawStatus === "abandoned"
									? "abandoned"
									: "pending";
					tasks.push({ content, status });
					total++;
					if (status === "completed") completed++;
				}
			}
			phases.push({ name, tasks });
		}

		if (phases.length > 0) return { phases, total, completed };
	}

	return null;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TaskRow({ task }: { task: TaskItem }): ReactNode {
	return (
		<div className={`tp-task tp-task--${task.status}`}>
			<span className="tp-task-icon">{STATUS_ICONS[task.status]}</span>
			<span className="tp-task-label">{task.content}</span>
		</div>
	);
}

function PhaseSection({ phase, index }: { phase: PhaseGroup; index: number }): ReactNode {
	const done = phase.tasks.filter(t => t.status === "completed").length;
	return (
		<div className="tp-phase">
			<div className="tp-phase-header">
				<span className="tp-phase-num">{index + 1}.</span>
				<span className="tp-phase-name">{phase.name || `Phase ${index + 1}`}</span>
				{phase.tasks.length > 0 && (
					<span className="tp-phase-count">
						{done}/{phase.tasks.length}
					</span>
				)}
			</div>
			<div className="tp-phase-tasks">
				{phase.tasks.map((task, ti) => (
					<TaskRow key={`${index}-${ti}`} task={task} />
				))}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState(): ReactNode {
	return (
		<div className="tp-empty">
			<ListTodo size={32} className="tp-empty-icon" />
			<p className="tp-empty-title">No active task list</p>
			<p className="tp-empty-desc">
				The agent hasn&rsquo;t created a task plan yet.
				<br />
				Use the <code>todo</code> tool to start tracking work.
			</p>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

export interface TodoPanelProps {
	snapshot: GuestSnapshot;
	onClose(): void;
}

export function TodoPanel({ snapshot, onClose }: TodoPanelProps): ReactNode {
	const todo = useMemo(() => extractTodoState(snapshot.entries), [snapshot.entries]);

	const progressPct = todo && todo.total > 0 ? Math.round((todo.completed / todo.total) * 100) : 0;

	return (
		<div className="tp-overlay">
			<aside className="tp-panel">
				{/* Header */}
				<div className="tp-header">
					<div className="tp-header-left">
						<ListTodo size={18} className="tp-header-icon" />
						<div>
							<h3 className="tp-header-title">Task List</h3>
							{todo && (
								<p className="tp-header-sub">
									{todo.completed}/{todo.total} tasks &middot; {progressPct}%
								</p>
							)}
						</div>
					</div>
					<button type="button" className="tp-close-btn" onClick={onClose} title="Close task list">
						<X size={16} />
					</button>
				</div>

				{/* Progress bar */}
				{todo && todo.total > 0 && (
					<div className="tp-progress-wrap">
						<div className="tp-progress-track">
							<div
								className={`tp-progress-fill ${progressPct >= 100 ? "tp-progress-done" : ""}`}
								style={{ width: `${progressPct}%` }}
							/>
						</div>
						<span className="tp-progress-label">{progressPct}%</span>
					</div>
				)}

				{/* Task list or empty state */}
				<div className="tp-body">
					{todo ? (
						todo.phases.map((phase, i) => <PhaseSection key={`phase-${i}`} phase={phase} index={i} />)
					) : (
						<EmptyState />
					)}
				</div>
			</aside>
		</div>
	);
}