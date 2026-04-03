import { applyMeaningHighlights } from "./meaning-highlight";
import { formatMeaningLineBreaks } from "./meaning-format";
import { linkifyMeaningToSegments, type LinkifyContext } from "./meaning-linkify";
import { wordsPageHref } from "./words-route";

/**
 * Client-only: formatted gloss + links + optional &lt;mark&gt; for the current query.
 */
export function renderMeaningToFragment(
	meaning: string,
	ctx: LinkifyContext,
	baseUrl: string,
	highlightQuery: string | null | undefined,
): DocumentFragment {
	const formatted = formatMeaningLineBreaks(meaning);
	const linked = linkifyMeaningToSegments(formatted, ctx);
	const display = applyMeaningHighlights(linked, highlightQuery ?? null);

	const frag = document.createDocumentFragment();
	for (const seg of display) {
		if (seg.kind === "mark") {
			const mark = document.createElement("mark");
			mark.className = "meaning-hit";
			mark.textContent = seg.text;
			frag.appendChild(mark);
		} else if (seg.kind === "link") {
			const a = document.createElement("a");
			a.href = wordsPageHref(seg.canonical, baseUrl);
			a.className = "meaning-link";
			a.textContent = seg.text;
			frag.appendChild(a);
		} else {
			frag.appendChild(document.createTextNode(seg.text));
		}
	}
	return frag;
}
