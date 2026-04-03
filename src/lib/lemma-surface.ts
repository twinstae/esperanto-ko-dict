/**
 * BRO headword (e.g. nov-a, salut-i, kateĥ…) → usual one-word spelling for copy/paste (hyphens removed).
 */
export function lemmaToSurfaceCopy(word: string): string {
	return word.replace(/-/g, "");
}
