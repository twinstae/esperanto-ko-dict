import type { DictEntry } from "./dict-types";
import { normalizeLemma, normalizeLemmaForLookup } from "./normalize";

/** NFC + lowercase for headword keys (matches IndexedDB wordNormCi). */
export function toWordNormCi(word: string): string {
	return normalizeLemma(word).toLowerCase();
}

/**
 * Longest-match suffix strip (Esperanto), then BRO-style hyphen lemmas (e.g. am-i, katekol-o).
 * Order matters: try longer endings before shorter (e.g. -on before -n).
 */
const SUFFIXES_LONGEST_FIRST = [
	"ojn",
	"on",
	"oj",
	"as",
	"is",
	"os",
	"us",
	"o",
	"a",
	"e",
	"i",
	"u",
] as const;

function pushUnique(out: string[], seen: Set<string>, key: string) {
	if (!key || seen.has(key)) return;
	seen.add(key);
	out.push(key);
}

/**
 * Headword lookup keys to try in order (first successful IndexedDB match wins).
 */
export function expandLemmaLookupKeys(raw: string): string[] {
	const out: string[] = [];
	const seen = new Set<string>();

	const norm = normalizeLemmaForLookup(raw);
	pushUnique(out, seen, norm);

	// BRO headword already has hyphen (e.g. katekol-o) — only exact match
	if (norm.includes("-")) {
		return out;
	}

	const w = norm;
	// Do not treat final -o as a noun ending in names like Kateĥismo (…ismo); use gloss search instead.
	if (/(ismo|ism)$/u.test(w)) {
		return out;
	}
	for (const suf of SUFFIXES_LONGEST_FIRST) {
		if (w.length <= suf.length || !w.endsWith(suf)) continue;
		const stem = w.slice(0, -suf.length);
		if (stem.length < 1) continue;

		if (suf === "as" || suf === "is" || suf === "os" || suf === "us" || suf === "u") {
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
		} else if (suf === "on" || suf === "ojn" || suf === "oj") {
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
		} else if (suf === "i") {
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
		} else if (suf === "o") {
			pushUnique(out, seen, toWordNormCi(`${stem}-o`));
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
		} else if (suf === "a" || suf === "e") {
			pushUnique(out, seen, toWordNormCi(`${stem}-o`));
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
		}
		break;
	}

	return out;
}

/** Headwords like kateĥ… (ellipsis) match longer typed queries. */
export function ellipsisHeadwordMatch(headword: string, queryLower: string): boolean {
	const w = headword.toLowerCase();
	if (!w.includes("…")) return false;
	const base = w.replace(/…/gu, "").trim();
	if (base.length < 1) return false;
	return queryLower.startsWith(base) || base.startsWith(queryLower);
}

export function meaningContainsQuery(meaning: string, queryLower: string): boolean {
	return meaning.toLowerCase().includes(queryLower);
}

function entryKey(e: DictEntry): string {
	return `${e.word}\0${e.broLevel}`;
}

/** Headword index lookup only (BRO hyphen + inflection expansion). */
export function searchByHeadwordKeys(entries: DictEntry[], raw: string): DictEntry[] {
	const keys = expandLemmaLookupKeys(raw);
	const seen = new Set<string>();
	const out: DictEntry[] = [];

	for (const k of keys) {
		let hit = false;
		for (const e of entries) {
			if (toWordNormCi(e.word) !== k) continue;
			const id = entryKey(e);
			if (seen.has(id)) continue;
			seen.add(id);
			out.push(e);
			hit = true;
		}
		if (hit) return out;
	}

	return [];
}

/**
 * Ellipsis headwords (e.g. kateĥ…) plus substring search in definitions (e.g. Kateĥismo in gloss).
 */
export function searchFallbackEntries(entries: DictEntry[], queryLower: string): DictEntry[] {
	const seen = new Set<string>();
	const out: DictEntry[] = [];

	for (const e of entries) {
		if (!ellipsisHeadwordMatch(e.word, queryLower)) continue;
		const id = entryKey(e);
		if (seen.has(id)) continue;
		seen.add(id);
		out.push(e);
	}

	for (const e of entries) {
		if (!meaningContainsQuery(e.meaning, queryLower)) continue;
		const id = entryKey(e);
		if (seen.has(id)) continue;
		seen.add(id);
		out.push(e);
	}

	return out;
}

/**
 * Pure search over in-memory entries (used by tests and mirrors browser lookup).
 */
export function searchDictionaryEntries(entries: DictEntry[], raw: string): DictEntry[] {
	const queryLower = normalizeLemmaForLookup(raw);
	if (!queryLower) return [];

	const head = searchByHeadwordKeys(entries, raw);
	if (head.length > 0) return head;

	return searchFallbackEntries(entries, queryLower);
}
