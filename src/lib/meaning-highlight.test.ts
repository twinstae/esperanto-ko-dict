import { describe, expect, test } from "bun:test";
import type { MeaningSegment } from "./meaning-linkify";
import { applyMeaningHighlights, highlightPlainText } from "./meaning-highlight";

describe("highlightPlainText", () => {
	test("wraps case-insensitive matches", () => {
		const parts = highlightPlainText("Kateĥismo and kateĥismo", "kateĥismo");
		const marks = parts.filter((p) => p.mark).map((p) => p.text);
		expect(marks.length).toBeGreaterThanOrEqual(1);
	});

	test("short query returns single text chunk", () => {
		const parts = highlightPlainText("abc", "a");
		expect(parts).toEqual([{ mark: false, text: "abc" }]);
	});
});

describe("applyMeaningHighlights", () => {
	const segs: MeaningSegment[] = [
		{ kind: "text", text: "See lukti and " },
		{ kind: "link", text: "lukti", canonical: "lukt-i" },
		{ kind: "text", text: " here." },
	];

	test("no query passes through (as display segments)", () => {
		const out = applyMeaningHighlights(segs, null);
		expect(out).toHaveLength(3);
		expect(out[1]).toEqual({ kind: "link", text: "lukti", canonical: "lukt-i" });
	});

	test("marks only in text segments, not inside links", () => {
		const out = applyMeaningHighlights(segs, "lukti");
		const kinds = out.map((s) => s.kind);
		expect(kinds).toContain("mark");
		expect(kinds).toContain("link");
		const link = out.find((s) => s.kind === "link");
		expect(link?.kind === "link" && link.text).toBe("lukti");
	});
});
