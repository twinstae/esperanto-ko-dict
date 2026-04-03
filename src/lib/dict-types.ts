export type DictEntry = {
	word: string;
	broLevel: string;
	meaning: string;
};

export type DictBundle = {
	version: string;
	generatedAt: string;
	entries: DictEntry[];
};
