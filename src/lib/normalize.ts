import { xSystemToUnicode } from "./x-system";

/** Normalize cell text for storage / lookup (trim + NFC). */
export function normalizeLemma(s: string): string {
	return s.trim().normalize("NFC");
}

/**
 * Normalize user query: x-system → Unicode, trim, NFC, lowercase for dictionary matching.
 */
export function normalizeLemmaForLookup(s: string): string {
	return normalizeLemma(xSystemToUnicode(s)).toLowerCase();
}
