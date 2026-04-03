import type { DictBundle, DictEntry } from "./dict-types";
import { expandLemmaLookupKeys, searchFallbackEntries } from "./dict-search";
import { buildCanonicalHeadwordMap, buildEllipsisHeadwords } from "./meaning-linkify";
import type { LinkifyContext } from "./meaning-linkify";
import { normalizeLemma, normalizeLemmaForLookup } from "./normalize";

export const DICT_JSON_PATH = "data/eo-ko.json";

const DB_NAME = "esperanto-ko-dict";
const DB_VERSION = 2;
const STORE_META = "meta";
const STORE_ENTRIES = "entries";
const META_KEY = "bundle";

export type DictMeta = {
	version: string;
	generatedAt: string;
};

function dictJsonUrl(): string {
	const base = import.meta.env.BASE_URL ?? "/";
	const path = base.endsWith("/") ? `${base}${DICT_JSON_PATH}` : `${base}/${DICT_JSON_PATH}`;
	return path;
}

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onerror = () => reject(req.error);
		req.onsuccess = () => resolve(req.result);
		req.onupgradeneeded = (ev) => {
			const db = req.result;
			if (ev.oldVersion < 2 && db.objectStoreNames.contains(STORE_ENTRIES)) {
				db.deleteObjectStore(STORE_ENTRIES);
			}
			if (!db.objectStoreNames.contains(STORE_META)) {
				db.createObjectStore(STORE_META);
			}
			if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
				const store = db.createObjectStore(STORE_ENTRIES, { autoIncrement: true });
				store.createIndex("wordNormCi", "wordNormCi", { unique: false });
			}
		};
	});
}

type StoredEntry = DictEntry & { wordNormCi: string };

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

async function getMeta(db: IDBDatabase): Promise<DictMeta | undefined> {
	const tx = db.transaction(STORE_META, "readonly");
	const store = tx.objectStore(STORE_META);
	return reqToPromise(store.get(META_KEY) as IDBRequest<DictMeta | undefined>);
}

async function clearEntries(db: IDBDatabase): Promise<void> {
	const tx = db.transaction(STORE_ENTRIES, "readwrite");
	const store = tx.objectStore(STORE_ENTRIES);
	await reqToPromise(store.clear());
	await new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

async function bulkPutEntries(db: IDBDatabase, entries: DictEntry[]): Promise<void> {
	const tx = db.transaction(STORE_ENTRIES, "readwrite");
	const store = tx.objectStore(STORE_ENTRIES);
	for (const e of entries) {
		const wordNormCi = normalizeLemma(e.word).toLowerCase();
		const row: StoredEntry = { ...e, wordNormCi };
		store.add(row);
	}
	await new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

async function setMeta(db: IDBDatabase, meta: DictMeta): Promise<void> {
	const tx = db.transaction(STORE_META, "readwrite");
	const store = tx.objectStore(STORE_META);
	store.put(meta, META_KEY);
	await new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

let initPromise: Promise<void> | undefined;

/** Lazily built from IndexedDB; cleared when dictionary rows are reloaded. */
let linkifyContextCache: LinkifyContext | null = null;

/**
 * Fetch dictionary JSON if needed and persist to IndexedDB. Safe to call multiple times.
 */
export function ensureDictLoaded(): Promise<void> {
	if (!initPromise) initPromise = loadDictInternal();
	return initPromise;
}

async function loadDictInternal(): Promise<void> {
	const res = await fetch(dictJsonUrl());
	if (!res.ok) throw new Error(`Failed to load dictionary: ${res.status} ${res.statusText}`);
	const bundle = (await res.json()) as DictBundle;
	const db = await openDb();
	const meta = await getMeta(db);
	if (meta?.version === bundle.version && meta?.generatedAt === bundle.generatedAt) {
		const count = await countEntries(db);
		if (count > 0) return;
	}
	await clearEntries(db);
	await bulkPutEntries(db, bundle.entries);
	linkifyContextCache = null;
	await setMeta(db, {
		version: bundle.version,
		generatedAt: bundle.generatedAt,
	});
}

async function countEntries(db: IDBDatabase): Promise<number> {
	const tx = db.transaction(STORE_ENTRIES, "readonly");
	const store = tx.objectStore(STORE_ENTRIES);
	return reqToPromise(store.count());
}

async function getAllStoredEntries(db: IDBDatabase): Promise<StoredEntry[]> {
	const tx = db.transaction(STORE_ENTRIES, "readonly");
	const store = tx.objectStore(STORE_ENTRIES);
	return new Promise((resolve, reject) => {
		const all: StoredEntry[] = [];
		const req = store.openCursor();
		req.onerror = () => reject(req.error);
		req.onsuccess = () => {
			const cursor = req.result;
			if (!cursor) {
				resolve(all);
				return;
			}
			all.push(cursor.value as StoredEntry);
			cursor.continue();
		};
	});
}

function entryDedupeKey(e: DictEntry): string {
	return `${e.word}\0${e.broLevel}`;
}

/**
 * Look up dictionary rows: BRO headword keys (inflection + hyphen), ellipsis headwords, then gloss text.
 */
export async function lookupLemma(lemma: string): Promise<DictEntry[]> {
	const queryLower = normalizeLemmaForLookup(lemma);
	if (!queryLower) return [];
	await ensureDictLoaded();
	const db = await openDb();
	const keys = expandLemmaLookupKeys(lemma);
	const tx = db.transaction(STORE_ENTRIES, "readonly");
	const store = tx.objectStore(STORE_ENTRIES);
	const index = store.index("wordNormCi");
	const seen = new Set<string>();
	const out: DictEntry[] = [];

	for (const k of keys) {
		if (!k) continue;
		const rows = await reqToPromise(index.getAll(k) as IDBRequest<StoredEntry[]>);
		for (const r of rows) {
			const { wordNormCi: _n, ...rest } = r;
			const id = entryDedupeKey(rest);
			if (seen.has(id)) continue;
			seen.add(id);
			out.push(rest);
		}
		if (out.length > 0) return out;
	}

	const all = await getAllStoredEntries(db);
	const entries = all.map(({ wordNormCi: _n, ...rest }) => rest);
	return searchFallbackEntries(entries, queryLower);
}

/**
 * Headword map + ellipsis headwords for turning gloss references into `/words/…` links.
 */
export async function getLinkifyContext(): Promise<LinkifyContext> {
	if (linkifyContextCache) return linkifyContextCache;
	await ensureDictLoaded();
	const db = await openDb();
	const all = await getAllStoredEntries(db);
	const entries = all.map(({ wordNormCi: _n, ...rest }) => rest);
	linkifyContextCache = {
		canonicalByNorm: buildCanonicalHeadwordMap(entries),
		ellipsisHeadwords: buildEllipsisHeadwords(entries),
	};
	return linkifyContextCache;
}

export { normalizeLemma };
