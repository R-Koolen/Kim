// Production build: bundles src/app.jsx (+ styles.css) into dist/, copies the
// HTML shell alongside it. README §4B — replaces the in-browser Babel setup.
import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/app.jsx"],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: "dist/app.js",
  loader: { ".jsx": "jsx" },
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  define: { "process.env.NODE_ENV": '"production"' },
});

cpSync("index.html", "dist/index.html");
