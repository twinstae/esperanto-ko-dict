/**
 * Insert newlines into dense BRO-style gloss text for readability.
 * Heuristics: circled numbering, Korean 다. + ～, semicolons, Esperanto ～-compounds.
 */
export function formatMeaningLineBreaks(s: string): string {
	let t = s.trim();
	if (!t) return t;

	// New sense after full stop: circled ②–⑳ (U+2461–U+2473)
	t = t.replace(/\.\s+([\u2461-\u2473])/g, ".\n$1");

	// ～-block after Korean predicate ending "다."
	t = t.replace(/(다)\.\s*(～)/g, "$1.\n$2");

	// Semicolon-separated parallel examples
	t = t.replace(/;\s+/g, ";\n");

	// Esperanto compound + ～ (ek～i, brava ～anto, …) — new line before token
	t = t.replace(
		/([^\n])\s+((?:[a-zĉĝĥĵŝŭ]{2,}|ek|inter|kontraŭ|kun|miks|kok|pro|brava|pacaj|re)～)/giu,
		"$1\n$2",
	);

	t = t.replace(/\n{3,}/g, "\n\n");
	return t.trim();
}
