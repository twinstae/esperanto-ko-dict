import { describe, expect, test } from "bun:test";
import { normalizeLemma, normalizeLemmaForLookup } from "./normalize";

describe("normalizeLemma", () => {
	test("trims and applies NFC", () => {
		const s = "  a\u0300 "; // a + combining grave
		expect(normalizeLemma(s)).toBe("\u00e0");
	});

	test("preserves Esperanto letters", () => {
		expect(normalizeLemma("ĉapelo")).toBe("ĉapelo");
	});
});

describe("normalizeLemmaForLookup", () => {
	test("applies x-system and lowercases", () => {
		expect(normalizeLemmaForLookup("  Katehxismo  ")).toBe("kateĥismo");
	});

	test("matches Unicode headword case-insensitively", () => {
		expect(normalizeLemmaForLookup("KATEĤISMO")).toBe("kateĥismo");
	});
});
