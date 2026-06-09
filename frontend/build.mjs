// Production build: bundles src/app.jsx (+ styles.css) into dist/, copies the
// HTML shell alongside it. README §4B — replaces the in-browser Babel setup.
//
// Output filenames are content-hashed (app-<hash>.js / .css). Cloudflare caches
// /app.* for hours regardless of origin headers, so a fixed filename means a
// redeploy keeps serving the stale bundle from the CDN/browser cache. Hashing
// gives every build a unique URL: index.html (always no-cache) points at the
// newest hash, and hashed assets can be cached forever without ever going stale.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

const result = await build({
  entryPoints: ["src/app.jsx"],
  bundle: true,
  minify: true,
  sourcemap: true,
  outdir: "dist",
  entryNames: "[name]-[hash]",
  metafile: true,
  loader: { ".jsx": "jsx" },
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  define: { "process.env.NODE_ENV": '"production"' },
});

// Pull the hashed JS + CSS filenames out of the metafile.
const outputs = Object.keys(result.metafile.outputs);
const jsFile = basename(outputs.find((o) => o.endsWith(".js")));
const cssFile = basename(outputs.find((o) => o.endsWith(".css")));

// Rewrite the index.html template's /app.js & /app.css refs to the hashed names.
let html = readFileSync("index.html", "utf8");
html = html.replace("/app.js", "/" + jsFile).replace("/app.css", "/" + cssFile);
writeFileSync("dist/index.html", html);

cpSync("manifest.webmanifest", "dist/manifest.webmanifest");
cpSync("sw.js", "dist/sw.js");
cpSync("icons", "dist/icons", { recursive: true });

console.log(`built ${jsFile} + ${cssFile}`);
