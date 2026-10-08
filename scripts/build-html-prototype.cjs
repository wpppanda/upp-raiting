/**
 * Builds the standalone HTML version in /html from the real application source.
 *
 *   html/app.css        ← src/app/globals.css compiled with Tailwind + reputation.css
 *   html/app.bundle.js  ← html/entry.tsx (which mounts src/app/dashboard.tsx)
 *
 * The prototype therefore reuses the application's own markup and styles instead
 * of re-implementing them. Committed so /html can be opened without a build step.
 *
 * Usage:
 *   node scripts/build-html-prototype.cjs           write html/app.css + html/app.bundle.js
 *   node scripts/build-html-prototype.cjs --check   fail when the committed files are stale
 */
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");

const root = path.join(__dirname, "..");
const checkOnly = process.argv.includes("--check");
const outputs = { css: path.join(root, "html", "app.css"), js: path.join(root, "html", "app.bundle.js") };

async function buildCss() {
  const source = path.join(root, "src", "app", "globals.css");
  const result = await postcss([tailwind]).process(fs.readFileSync(source, "utf8"), { from: source });
  // The app is served from the domain root; the prototype loads the font next to itself.
  return result.css.replace(/url\("\/fonts\//g, 'url("fonts/').replace(/url\('\/fonts\//g, "url('fonts/");
}

function buildJs() {
  return esbuild.buildSync({
    entryPoints: [path.join(root, "html", "entry.tsx")],
    outfile: outputs.js,
    bundle: true,
    minify: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    tsconfig: path.join(root, "tsconfig.json"),
    absWorkingDir: root,
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "silent",
    write: !checkOnly,
  });
}

(async () => {
  const css = await buildCss();
  const jsResult = buildJs();
  const js = jsResult.outputFiles ? jsResult.outputFiles[0].text : fs.readFileSync(outputs.js, "utf8");

  if (checkOnly) {
    const stale = [];
    if (!fs.existsSync(outputs.css) || fs.readFileSync(outputs.css, "utf8") !== css) stale.push("html/app.css");
    if (!fs.existsSync(outputs.js) || fs.readFileSync(outputs.js, "utf8") !== js) stale.push("html/app.bundle.js");
    if (stale.length) {
      console.error("FAILED: the HTML build is out of date — run `npm run build:html` and commit: " + stale.join(", "));
      process.exit(1);
    }
    console.log("PASS: html/app.css and html/app.bundle.js match the application source");
    return;
  }

  fs.writeFileSync(outputs.css, css);
  fs.writeFileSync(outputs.js, js);
  const kb = (value) => (Buffer.byteLength(value) / 1024).toFixed(1) + " KB";
  console.log("html/app.css       " + kb(css));
  console.log("html/app.bundle.js " + kb(js));
  console.log("Built from src/app/dashboard.tsx and its components.");
})().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
