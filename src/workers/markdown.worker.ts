import { Marked } from "marked";
import DOMPurify from "dompurify";
import { createHighlighter, type Highlighter } from "shiki";

let highlighter: Highlighter | null = null;
let initPromise: Promise<void> | null = null;

const initShiki = async () => {
	try {
		highlighter = await createHighlighter({
			themes: ["vsc-dark-plus"],
			langs: ["javascript", "typescript", "bash", "python", "json", "html", "css"],
		});
	} catch (err) {
		console.warn("markdown.worker: Shiki initialization warning:", err);
	}
};

const getInitPromise = () => {
	if (!initPromise) {
		initPromise = initShiki();
	}
	return initPromise;
};

const marked = new Marked({
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

self.onmessage = async (e: MessageEvent<MarkdownWorkerRequest>) => {
	const { id, text } = e.data;
	try {
		await getInitPromise();

		// Configure marked with custom code renderer if Shiki is available
		if (highlighter) {
			marked.use({
				renderer: {
					code({ text: codeText, lang }) {
						const validLang = lang && highlighter?.getLoadedLanguages().includes(lang as any) ? lang : "text";
						try {
							return highlighter?.codeToHtml(codeText, { lang: validLang, theme: "vsc-dark-plus" }) || `<pre><code>${codeText}</code></pre>`;
						} catch {
							return `<pre><code>${codeText}</code></pre>`;
						}
					},
				},
			});
		}

		const rawHtml = marked.parse(text, { async: false }) as string;
		const cleanHtml = DOMPurify.sanitize(rawHtml, {
			ADD_ATTR: ["target", "rel", "class", "style"],
			ADD_TAGS: ["style"],
		});

		self.postMessage({ id, html: cleanHtml } as MarkdownWorkerResponse);
	} catch (err) {
		self.postMessage({
			id,
			html: text,
			error: err instanceof Error ? err.message : String(err),
		} as MarkdownWorkerResponse);
	}
};
