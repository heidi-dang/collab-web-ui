import { Marked } from "marked";

const md = new Marked({
	gfm: true,
	breaks: true,
});

export interface MarkdownWorkerRequest {
	id: string;
	text: string;
}

export interface MarkdownWorkerResponse {
	id: string;
	html: string;
	error?: string;
}

self.onmessage = (e: MessageEvent<MarkdownWorkerRequest>) => {
	const { id, text } = e.data;
	try {
		const html = md.parse(text, { async: false }) as string;
		self.postMessage({ id, html } as MarkdownWorkerResponse);
	} catch (err) {
		self.postMessage({
			id,
			html: text,
			error: err instanceof Error ? err.message : String(err),
		} as MarkdownWorkerResponse);
	}
};
