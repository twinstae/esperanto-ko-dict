import type { MeaningSegment } from "./meaning-linkify";
import { normalizeLemmaForLookup } from "./normalize";

export type DisplaySegment =
	| { kind: "text"; text: string }
	| { kind: "mark"; text: string }
	| { kind: "link"; text: string; canonical: string };

const MIN_HIGHLIGHT_LEN = 2;

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split plain text into text + mark runs (case-insensitive, Unicode-aware).
 */
export function highlightPlainText(text: string, queryNormalized: string): Array<{ mark: boolean; text: string }> {
	if (queryNormalized.length < MIN_HIGHLIGHT_LEN) {
		return [{ mark: false, text }];
	}
	const re = new RegExp(escapeRegExp(queryNormalized), "giu");
	const parts: Array<{ mark: boolean; text: string }> = [];
	let last = 0;
	let m: RegExpExecArray | null;
	const copy = text;
	while ((m = re.exec(copy)) !== null) {
		if (m.index > last) {
			parts.push({ mark: false, text: copy.slice(last, m.index) });
		}
		parts.push({ mark: true, text: m[0] });
		last = m.index + m[0].length;
	}
	if (last < copy.length) {
		parts.push({ mark: false, text: copy.slice(last) });
	}
	return parts.length > 0 ? parts : [{ mark: false, text }];
}

/**
 * Wrap query matches in {@link MeaningSegment}s as {@link DisplaySegment} marks (links unchanged).
 */
export function applyMeaningHighlights(
	segments: MeaningSegment[],
	queryRaw: string | null | undefined,
): DisplaySegment[] {
	const q = queryRaw?.trim();
	if (!q) return segments as DisplaySegment[];

	const queryNorm = normalizeLemmaForLookup(q);
	if (queryNorm.length < MIN_HIGHLIGHT_LEN) return segments as DisplaySegment[];

	const out: DisplaySegment[] = [];
	for (const seg of segments) {
		if (seg.kind === "link") {
			out.push(seg);
			continue;
		}
		for (const p of highlightPlainText(seg.text, queryNorm)) {
			out.push(p.mark ? { kind: "mark", text: p.text } : { kind: "text", text: p.text });
		}
	}
	return out;
}
