/**
 * Extract the lemma segment from `/[base]/words/<lemma>` (first path segment after `words/`).
 * Returns null for `/words`, `/words/`, or invalid paths.
 */
export function parseLemmaFromPath(pathname: string, baseUrl: string): string | null {
	const base = (baseUrl || "/").replace(/\/$/, "");
	const wordsExact = `${base}/words`;
	const wordsPrefix = `${base}/words/`;
	if (pathname === wordsExact || pathname === `${wordsExact}/`) {
		return null;
	}
	if (!pathname.startsWith(wordsPrefix)) return null;
	const rest = pathname.slice(wordsPrefix.length);
	const seg = rest.split("/")[0];
	if (!seg) return null;
	try {
		return decodeURIComponent(seg);
	} catch {
		return seg;
	}
}

export function wordsPageHref(lemma: string, baseUrl: string): string {
	const base = (baseUrl || "/").replace(/\/$/, "");
	const enc = encodeURIComponent(lemma);
	return `${base}/words/${enc}`;
}
