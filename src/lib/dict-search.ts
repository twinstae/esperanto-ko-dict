import type { DictEntry } from "./dict-types";
import { normalizeLemma, normalizeLemmaForLookup } from "./normalize";

/** NFC + lowercase for headword keys (matches IndexedDB wordNormCi). */
export function toWordNormCi(word: string): string {
	return normalizeLemma(word).toLowerCase();
}

/**
 * Prefixes that form a shorter surface form; when that shorter form is in the morph set,
 * we skip inflection expansion on the prefixed word (malgranda → grand-a, not malgrand-o).
 */
const PREFIX_STRIP_SKIP_INFLECTION = ["mal", "mis"] as const;

/**
 * Verbal / derivational prefixes (strip to try the bare stem).
 */
const PREFIXES_LONGEST_FIRST = [
	"mal",
	"mis",
	"ne",
	"sen",
	"ek",
	"re",
	"dis",
	"for",
	"fi",
	"bo",
	"ge",
	"pli",
] as const;

/**
 * Longest-match suffix strip (Esperanto). Order: grammatical + compound (eble, ado) before single letters.
 */
const SUFFIXES_LONGEST_FIRST = [
	"ojn",
	"oj",
	// Plural -j (belaj → bela; novaj → nova) — after -oj/-ojn so spionoj still uses -oj
	"j",
	// Accusative -n before any -on parse: paroladon → parolado + n, not parolad + on
	"n",
	"as",
	"is",
	"os",
	"us",
	"u",
	// Compound endings before bare -o / -i (parolado → parol, not parolad- + o)
	"eble",
	"ebla",
	"ado",
	"i",
	"o",
	"a",
	"e",
] as const;

const IĜ = "iĝ";
const IG = "ig";

function pushUnique(out: string[], seen: Set<string>, key: string) {
	if (!key || seen.has(key)) return;
	seen.add(key);
	out.push(key);
}

function isEsperantoLettersOnly(s: string): boolean {
	return /^[a-zĉĝĥĵŝŭ]+$/u.test(s);
}

/** Bare root → BRO hyphen lemmas (verb / noun / adjective). */
function pushBareRootHyphens(stem: string, out: string[], seen: Set<string>) {
	if (stem.length < 2 || stem.length > 14 || !isEsperantoLettersOnly(stem)) return;
	pushUnique(out, seen, toWordNormCi(`${stem}-i`));
	pushUnique(out, seen, toWordNormCi(`${stem}-o`));
	pushUnique(out, seen, toWordNormCi(`${stem}-a`));
}

/**
 * Expand mal-/pli-/re-/… and compound endings (-eble, -ado) until fixpoint.
 */
export function expandMorphologicalVariants(norm: string): Set<string> {
	const set = new Set<string>([norm]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const w of [...set]) {
			for (const p of PREFIXES_LONGEST_FIRST) {
				if (w.length >= p.length + 3 && w.startsWith(p)) {
					const n = w.slice(p.length);
					if (!set.has(n)) {
						set.add(n);
						changed = true;
					}
				}
			}
			for (const s of ["eble", "ebla", "ado"] as const) {
				if (w.length > s.length + 2 && w.endsWith(s)) {
					const n = w.slice(0, -s.length);
					if (!set.has(n)) {
						set.add(n);
						changed = true;
					}
				}
			}
			if (w.length > 5 && w.endsWith("ebl") && !w.endsWith("eble") && !w.endsWith("ebla")) {
				const n = w.slice(0, -3);
				if (!set.has(n)) {
					set.add(n);
					changed = true;
				}
			}
		}
	}
	return set;
}

/**
 * Accusative -n (belan → bela). Skip long …en roots (kompren, skriben) so we do not peel verb stems.
 * Short correlatives (tien, kien) still strip.
 */
function shouldStripFinalAccusativeN(w: string): boolean {
	if (!w.endsWith("n") || w.length < 3) return false;
	if (w.length > 5 && w.endsWith("en")) return false;
	return true;
}

function shouldExpandInflection(w: string, variants: Set<string>): boolean {
	for (const p of PREFIX_STRIP_SKIP_INFLECTION) {
		if (w.length >= p.length + 3 && w.startsWith(p)) {
			const stripped = w.slice(p.length);
			if (variants.has(stripped)) return false;
		}
	}
	return true;
}

function pushStemAfterVerbalSuffix(stem: string, out: string[], seen: Set<string>, variants: Set<string>) {
	pushUnique(out, seen, toWordNormCi(`${stem}-i`));
	if (stem.endsWith(IĜ)) {
		const base = stem.slice(0, -IĜ.length);
		if (base.length >= 2) {
			pushBareRootHyphens(base, out, seen);
		}
	} else if (stem.endsWith(IG) && !stem.endsWith(IĜ)) {
		const base = stem.slice(0, -IG.length);
		if (base.length >= 2) {
			pushBareRootHyphens(base, out, seen);
			for (const mv of expandMorphologicalVariants(base)) {
				if (mv !== base) {
					expandInflectionKeysFromSurface(mv, out, seen, 0, true, variants);
				}
			}
		}
	}
}

function expandInflectionKeysFromSurface(
	w: string,
	out: string[],
	seen: Set<string>,
	depth: number,
	allowBare: boolean,
	variants: Set<string>,
) {
	if (depth > 6) return;

	/** Unhyphenated surface (e.g. tie) and verb roots typed without ending (kompren → kompren-i). */
	pushUnique(out, seen, w);

	for (const suf of SUFFIXES_LONGEST_FIRST) {
		if (w.length <= suf.length || !w.endsWith(suf)) continue;
		const stem = w.slice(0, -suf.length);
		if (stem.length < 1) continue;

		if (suf === "j") {
			expandInflectionKeysFromSurface(stem, out, seen, depth + 1, allowBare, variants);
			return;
		}

		if (suf === "n") {
			if (shouldStripFinalAccusativeN(w)) {
				expandInflectionKeysFromSurface(stem, out, seen, depth + 1, allowBare, variants);
				return;
			}
			continue;
		}

		if (suf === "as" || suf === "is" || suf === "os" || suf === "us" || suf === "u") {
			pushStemAfterVerbalSuffix(stem, out, seen, variants);
			return;
		}

		if (suf === "i") {
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
			pushStemAfterVerbalSuffix(stem, out, seen, variants);
			return;
		}

		if (suf === "ojn" || suf === "oj") {
			pushUnique(out, seen, toWordNormCi(`${stem}-o`));
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
			return;
		}

		if (suf === "o") {
			pushUnique(out, seen, toWordNormCi(`${stem}-o`));
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
			return;
		}

		if (suf === "eble" || suf === "ebla" || suf === "ado") {
			pushBareRootHyphens(stem, out, seen);
			return;
		}

		if (suf === "a") {
			pushUnique(out, seen, toWordNormCi(`${stem}-a`));
			pushUnique(out, seen, toWordNormCi(`${stem}-o`));
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
			return;
		}

		if (suf === "e") {
			pushUnique(out, seen, toWordNormCi(`${stem}-e`));
			pushUnique(out, seen, toWordNormCi(`${stem}-o`));
			pushUnique(out, seen, toWordNormCi(`${stem}-i`));
			return;
		}
	}

	const bareFallback =
		allowBare || (depth === 0 && w.length >= 4 && isEsperantoLettersOnly(w));
	if (bareFallback) {
		pushBareRootHyphens(w, out, seen);
	}
}

/**
 * Headword lookup keys to try in order (first successful IndexedDB match wins).
 *
 * Covers typical Esperanto surface forms, including (among others):
 * plural / case (-oj, -ojn, -j for adjective plural belaj → bela); accusative (-n before -o: saluton, paroladon → parolado + n);
 * mal-/mis- + hyphen reinjection (malnova → malnov-a before nov-a);
 * verbal endings (-as, -is, -os, -us, -u, infinitive -i);
 * accusative -n (belan → bel-a; long …en verb roots skip false -n);
 * compound endings -eble / -ebla / -ado before bare -o; prefixes mal-, mis-, ne-, sen-, ek-, re-, dis-, for-, fi-, bo-, ge-, pli-;
 * iĝ / ig stems (proksimiĝis → proksim-a; plibonigi → bon-a); bare verb stem (kompren → kompren-i);
 * unhyphenated correlatives (tien → tie). Ellipsis headwords and gloss fallback are handled in {@link searchDictionaryEntries}.
 */
function expandLemmaLookupKeysCore(norm: string): string[] {
	const out: string[] = [];
	const seen = new Set<string>();

	pushUnique(out, seen, norm);

	if (norm.includes("-")) {
		return out;
	}

	if (/(ismo|ism)$/u.test(norm)) {
		return out;
	}

	const morphVariants = expandMorphologicalVariants(norm);

	for (const v of morphVariants) {
		if (v !== norm) {
			pushUnique(out, seen, v);
		}
	}

	for (const v of morphVariants) {
		if (!shouldExpandInflection(v, morphVariants)) continue;
		const allowBare = v !== norm;
		expandInflectionKeysFromSurface(v, out, seen, 0, allowBare, morphVariants);
	}

	return out;
}

/** malnova → mal + nov-a; malnovaj → mal + nov-a (via novaj → nova). */
function injectMalMisHyphenPrefixes(norm: string, out: string[], seen: Set<string>) {
	for (const p of ["mal", "mis"] as const) {
		if (norm.length < p.length + 3 || !norm.startsWith(p)) continue;
		const rest = norm.slice(p.length);
		const subKeys = expandLemmaLookupKeysCore(rest);
		for (const k of subKeys) {
			if (k.includes("-")) {
				pushUnique(out, seen, p + k);
			}
		}
	}
}

export function expandLemmaLookupKeys(raw: string): string[] {
	const out: string[] = [];
	const seen = new Set<string>();

	const norm = normalizeLemmaForLookup(raw);
	pushUnique(out, seen, norm);

	if (norm.includes("-")) {
		return out;
	}

	if (/(ismo|ism)$/u.test(norm)) {
		return out;
	}

	const morphVariants = expandMorphologicalVariants(norm);

	for (const v of morphVariants) {
		if (v !== norm) {
			pushUnique(out, seen, v);
		}
	}

	injectMalMisHyphenPrefixes(norm, out, seen);

	for (const v of morphVariants) {
		if (!shouldExpandInflection(v, morphVariants)) continue;
		const allowBare = v !== norm;
		expandInflectionKeysFromSurface(v, out, seen, 0, allowBare, morphVariants);
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
