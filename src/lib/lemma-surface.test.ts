import { describe, expect, test } from "bun:test";
import { lemmaToSurfaceCopy } from "./lemma-surface";

describe("lemmaToSurfaceCopy", () => {
	test("removes hyphens (nov-a → nova)", () => {
		expect(lemmaToSurfaceCopy("nov-a")).toBe("nova");
	});

	test("infinitive and nouns", () => {
		expect(lemmaToSurfaceCopy("salut-i")).toBe("saluti");
		expect(lemmaToSurfaceCopy("katekol-o")).toBe("katekolo");
	});

	test("ellipsis headword", () => {
		expect(lemmaToSurfaceCopy("kateĥ…")).toBe("kateĥ…");
	});
});
