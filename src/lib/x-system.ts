/**
 * Esperanto “x-system” (ASCII fallback) → Unicode letters.
 * cx→ĉ, gx→ĝ, hx→ĥ, jx→ĵ, sx→ŝ, ux→ŭ (case: Cx→Ĉ, CX→Ĉ, etc.).
 */
const PAIR_TO_LETTER: Record<string, string> = {
	cx: "ĉ",
	gx: "ĝ",
	hx: "ĥ",
	jx: "ĵ",
	sx: "ŝ",
	ux: "ŭ",
};

function mapPairToLetter(pair: string): string | undefined {
	return PAIR_TO_LETTER[pair.toLowerCase()];
}

function applyCasing(rep: string, pair: string): string {
	const [a, b] = pair;
	if (a === a.toUpperCase() && b === b.toUpperCase()) {
		return rep.toUpperCase();
	}
	if (a === a.toUpperCase() && b === b.toLowerCase()) {
		return rep.toUpperCase();
	}
	return rep;
}

export function xSystemToUnicode(s: string): string {
	let out = "";
	for (let i = 0; i < s.length; i++) {
		const pair = s.slice(i, i + 2);
		if (pair.length < 2) {
			out += s[i];
			break;
		}
		const rep = mapPairToLetter(pair);
		if (rep !== undefined) {
			out += applyCasing(rep, pair);
			i++;
		} else {
			out += s[i];
		}
	}
	return out;
}
