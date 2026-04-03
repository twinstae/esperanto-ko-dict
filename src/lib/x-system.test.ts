import { describe, expect, test } from "bun:test";
import { xSystemToUnicode } from "./x-system";

describe("xSystemToUnicode", () => {
	test("converts hx to ĥ (Katehxismo)", () => {
		expect(xSystemToUnicode("Katehxismo")).toBe("Kateĥismo");
	});

	test("converts lowercase katehxismo", () => {
		expect(xSystemToUnicode("katehxismo")).toBe("kateĥismo");
	});

	test("converts multiple digraphs", () => {
		expect(xSystemToUnicode("sxi estas gxoja")).toBe("ŝi estas ĝoja");
	});

	test("converts aux to aŭ", () => {
		expect(xSystemToUnicode("aux")).toBe("aŭ");
	});

	test("leaves already-Unicode text unchanged", () => {
		expect(xSystemToUnicode("Kateĥismo")).toBe("Kateĥismo");
	});

	test("CX (both uppercase) becomes Ĉ", () => {
		expect(xSystemToUnicode("CX")).toBe("Ĉ");
	});

	test("Cx (capital C, lowercase x) becomes Ĉ", () => {
		expect(xSystemToUnicode("Cx")).toBe("Ĉ");
	});
});
