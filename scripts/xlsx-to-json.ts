#!/usr/bin/env bun
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDictBundle, parseEoHanFromBuffer } from "../src/lib/xlsx-eo-han";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const defaultInput = resolve(repoRoot, "dict.xlsx");
const defaultOutput = resolve(repoRoot, "public/data/eo-ko.json");

const inputPath = process.argv[2] ? resolve(process.argv[2]) : defaultInput;
const outputPath = process.argv[3] ? resolve(process.argv[3]) : defaultOutput;

const buf = await readFile(inputPath);
const entries = parseEoHanFromBuffer(buf);

const bundle = buildDictBundle(entries, "1", new Date().toISOString());

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(bundle, null, 0), "utf8");

console.log(`Wrote ${entries.length} entries to ${outputPath}`);
