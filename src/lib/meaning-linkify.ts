import type { DictEntry } from "./dict-types";
import { expandLemmaLookupKeys, toWordNormCi } from "./dict-search";
import { normalizeLemma } from "./normalize";

/** Characters that may appear inside a BRO-style headword in running text. */
const HEADWORD_CHAR =
	/[a-zA-ZĉĝĥĵŝŭĈĜĤĴŜŬ0-9·\-…]/u;

const MAX_HEADWORD_LEN = 80;

/** Full-width / Japanese wave dash before a letter marks a suffix gloss (～o, ～a) — not a headword. */
function isWaveDashBeforeSuffix(c: string | undefined): boolean {
	if (c === undefined || c.length !== 1) return false;
	return c === "\uFF5E" || c === "\u301C";
}

export function isHeadwordChar(c: string): boolean {
	return c.length === 1 && HEADWORD_CHAR.test(c);
}

function isHeadwordToken(s: string): boolean {
	for (const c of s) {
		if (!isHeadwordChar(c)) return false;
	}
	return s.length > 0;
}

/** First occurrence wins (stable canonical spelling from the dictionary). */
export function buildCanonicalHeadwordMap(entries: DictEntry[]): Map<string, string> {
	const map = new Map<string, string>();
	for (const e of entries) {
		const k = toWordNormCi(e.word);
		if (!map.has(k)) map.set(k, e.word);
	}
	return map;
}

/** Headwords containing an ellipsis (e.g. kateĥ…) — link long -ismo forms to these. */
export function buildEllipsisHeadwords(entries: DictEntry[]): string[] {
	return entries.map((e) => e.word).filter((w) => w.includes("…"));
}

function resolveCanonical(
	slice: string,
	canonicalByNorm: Map<string, string>,
	ellipsisHeadwords: string[],
): string | undefined {
	const exact = normalizeLemma(slice).toLowerCase();
	let canon = canonicalByNorm.get(exact);
	if (canon !== undefined) return canon;
	for (const k of expandLemmaLookupKeys(slice)) {
		canon = canonicalByNorm.get(k);
		if (canon !== undefined) return canon;
	}
	const sl = normalizeLemma(slice).toLowerCase();
	for (const ew of ellipsisHeadwords) {
		const base = ew.replace(/…/gu, "").trim().toLowerCase();
		if (base.length < 2) continue;
		if (sl.startsWith(base)) return ew;
	}
	return undefined;
}

/**
 * Longest headword match at `i` (case-insensitive key), respecting word boundaries.
 */
export function matchHeadwordAt(
	meaning: string,
	i: number,
	canonicalByNorm: Map<string, string>,
	ellipsisHeadwords: string[],
): { length: number; canonical: string } | null {
	if (i >= meaning.length) return null;
	if (i > 0 && isWaveDashBeforeSuffix(meaning[i - 1])) return null;
	if (i > 0 && isHeadwordChar(meaning[i - 1])) return null;

	const maxLen = Math.min(MAX_HEADWORD_LEN, meaning.length - i);
	for (let len = maxLen; len >= 1; len--) {
		const slice = meaning.slice(i, i + len);
		if (!isHeadwordToken(slice)) continue;
		if (i + len < meaning.length && isHeadwordChar(meaning[i + len])) continue;
		const canon = resolveCanonical(slice, canonicalByNorm, ellipsisHeadwords);
		if (canon !== undefined) {
			return { length: len, canonical: canon };
		}
	}
	return null;
}

export type LinkifyContext = {
	canonicalByNorm: Map<string, string>;
	ellipsisHeadwords: string[];
};

export type MeaningSegment =
	| { kind: "text"; text: string }
	| { kind: "link"; text: string; canonical: string };

function appendText(segments: MeaningSegment[], ch: string) {
	const last = segments[segments.length - 1];
	if (last?.kind === "text") {
		last.text += ch;
	} else {
		segments.push({ kind: "text", text: ch });
	}
}

/**
 * Pure: split gloss into plain text runs and dictionary links (same rules as {@link matchHeadwordAt}).
 */
export function linkifyMeaningToSegments(meaning: string, ctx: LinkifyContext): MeaningSegment[] {
	const segments: MeaningSegment[] = [];
	let i = 0;
	while (i < meaning.length) {
		const m = matchHeadwordAt(meaning, i, ctx.canonicalByNorm, ctx.ellipsisHeadwords);
		if (m) {
			segments.push({
				kind: "link",
				text: meaning.slice(i, i + m.length),
				canonical: m.canonical,
			});
			i += m.length;
		} else {
			appendText(segments, meaning[i]);
			i++;
		}
	}
	return segments;
}
