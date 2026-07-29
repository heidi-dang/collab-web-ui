import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { DEFAULT_RELAY_URL, formatCollabLink, generateRoomId } from "../../lib/link";
import { Plus } from "lucide-react";

export interface ConnectScreenProps {
	defaultName: string;
	error: string | null;
	onConnect(link: string, name: string): void;
}

export function ConnectScreen({ defaultName, error, onConnect }: ConnectScreenProps): ReactNode {
	const [link, setLink] = useState("");
	const [name, setName] = useState(defaultName);
	const [localError, setLocalError] = useState<string | null>(null);

	const submit = (e: FormEvent<HTMLFormElement>): void => {
		e.preventDefault();
		const trimmed = link.trim();
		if (!trimmed) {
			setLocalError("paste a join link or create a new room below");
			return;
		}
		setLocalError(null);
		onConnect(trimmed, name.trim() || "guest");
	};

	const handleCreateNewRoom = () => {
		try {
			const roomId = generateRoomId();
			const keyBytes = new Uint8Array(32);
			crypto.getRandomValues(keyBytes);
			const writeTokenBytes = new Uint8Array(16);
			crypto.getRandomValues(writeTokenBytes);
			const newLink = formatCollabLink(DEFAULT_RELAY_URL, roomId, keyBytes, writeTokenBytes);
			onConnect(newLink, name.trim() || "guest");
		} catch (err) {
			setLocalError("Failed to generate room link: " + (err instanceof Error ? err.message : String(err)));
		}
	};

	const shown = localError ?? error;

	return (
		<div className="sh-connect">
			<form className="sh-connect-card" onSubmit={submit}>
				<div className="sh-connect-head">
					<div className="sh-lockup">
						<span className="sh-lockup-mark" aria-hidden="true" />
						<span className="sh-lockup-pi">π</span> omp collab
					</div>
					<ThemeToggle />
				</div>
				<div className="sh-connect-sub">live agent session, in your browser</div>
				<label className="sh-field">
					<span className="sh-field-label">join link</span>
					<input
						className="sh-input sh-input-mono"
						type="text"
						value={link}
						onChange={e => setLink(e.target.value)}
						placeholder="ws://host:port/r/room.key or paste link"
						spellCheck={false}
						autoComplete="off"
						autoFocus
					/>
					<span className="sh-field-hint">paste a /collab link or create a fresh room</span>
				</label>
				<label className="sh-field">
					<span className="sh-field-label">display name</span>
					<input
						className="sh-input"
						type="text"
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="guest"
						spellCheck={false}
						autoComplete="off"
						maxLength={32}
					/>
				</label>
				{shown && <div className="sh-connect-error">{shown}</div>}
				<div className="flex gap-2 pt-2">
					<button className="sh-btn sh-btn-primary flex-1 justify-center py-2.5" type="submit">
						Connect
					</button>
					<button
						className="sh-btn flex-1 justify-center py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium"
						type="button"
						onClick={handleCreateNewRoom}
					>
						<Plus size={14} className="mr-1.5" />
						Create Room
					</button>
				</div>
			</form>
		</div>
	);
}
