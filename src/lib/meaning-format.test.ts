import { describe, expect, test } from "bun:test";
import { formatMeaningLineBreaks } from "./meaning-format";

describe("formatMeaningLineBreaks", () => {
	test("inserts newline before circled ② after a period", () => {
		const raw =
			"[자] ①첫번째. ☞ a, b, c. ②두번째 시작";
		const out = formatMeaningLineBreaks(raw);
		expect(out).toContain(".\n②");
	});

	test("inserts newline before ～ after 다.", () => {
		const raw = "…하다, 싸우다. ～o ①하위";
		const out = formatMeaningLineBreaks(raw);
		expect(out).toContain("다.\n～");
	});

	test("breaks semicolon-separated clauses when space follows semicolon", () => {
		const raw = "a; b; c";
		expect(formatMeaningLineBreaks(raw)).toContain(";\n");
	});

	test("puts esperanto ～ compounds on new lines", () => {
		const raw = "x ek～i y inter～i";
		const out = formatMeaningLineBreaks(raw);
		expect(out).toContain("\nek～");
		expect(out).toContain("\ninter～");
	});

	test("empty string stays empty", () => {
		expect(formatMeaningLineBreaks("   ")).toBe("");
	});
});
