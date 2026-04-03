// @ts-check
import { defineConfig } from "astro/config";

/**
 * Dev-only: serve the single `/words` CSR shell for any `/words/<lemma>` path
 * (static hosts need a rewrite; see README).
 */
function wordsSpaFallback() {
	return {
		name: "words-spa-fallback",
		/** @param {import('vite').ViteDevServer} server */
		configureServer(server) {
			server.middlewares.use((req, _res, next) => {
				const url = req.url ?? "";
				const pathOnly = url.split("?")[0] ?? "";
				if (
					pathOnly.startsWith("/words/") &&
					pathOnly !== "/words/" &&
					!pathOnly.includes(".")
				) {
					const q = url.includes("?") ? url.slice(url.indexOf("?")) : "";
					req.url = "/words/" + q;
				}
				next();
			});
		},
	};
}

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [wordsSpaFallback()],
	},
});
