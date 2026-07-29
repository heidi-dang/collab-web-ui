import { useState, useEffect, useRef } from "react";

export interface UseMarkdownWorkerResult {
	html: string;
	loading: boolean;
}

export const useMarkdownWorker = (text: string): UseMarkdownWorkerResult => {
	const [html, setHtml] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(true);
	const workerRef = useRef<Worker | null>(null);
	const lastProcessedTextRef = useRef<string>("");

	useEffect(() => {
		// Initialize dedicated web worker for off-thread markdown parsing & highlighting
		workerRef.current = new Worker(new URL("../workers/markdown.worker.ts", import.meta.url), {
			type: "module",
		});

		return () => {
			workerRef.current?.terminate();
			workerRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!workerRef.current) return;
		if (text === lastProcessedTextRef.current && html) {
			setLoading(false);
			return;
		}

		setLoading(true);
		const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

		const handleMessage = (e: MessageEvent) => {
			if (e.data && e.data.id === id) {
				setHtml(e.data.html);
				setLoading(false);
				lastProcessedTextRef.current = text;
			}
		};

		workerRef.current.addEventListener("message", handleMessage);
		workerRef.current.postMessage({ id, text });

		return () => {
			workerRef.current?.removeEventListener("message", handleMessage);
		};
	}, [text]);

	return { html, loading };
};
