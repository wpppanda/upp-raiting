/**
 * Unit check for the widget domain allow-list (src/lib/widget-domains.ts).
 * The TypeScript source is transpiled with the project's own compiler and the
 * real exported functions are executed — no re-implementation.
 * Usage: node scripts/check-widget-domains.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const file = path.join(__dirname, "..", "src", "lib", "widget-domains.ts");
const source = fs.readFileSync(file, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const sandboxModule = { exports: {} };
new Function("exports", "require", "module", "process", compiled)(sandboxModule.exports, require, sandboxModule, process);
const { originAllowed, parseAllowedDomains, MAX_ALLOWED_DOMAINS } = sandboxModule.exports;

let checks = 0;
function check(label, actual, expected) {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) throw new Error(`FAILED: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  console.log(`PASS: ${label}`);
}

const project = { domain: "zerno.coffee", allowedDomains: ["shop.zerno.coffee", "*.zerna.app"] };

check("primary domain is allowed", originAllowed(project, "https://zerno.coffee"), true);
check("www of the primary domain is allowed", originAllowed(project, "https://www.zerno.coffee"), true);
check("an extra allowed domain is allowed", originAllowed(project, "https://shop.zerno.coffee"), true);
check("a wildcard entry allows sub-domains", originAllowed(project, "https://demo.zerna.app"), true);
check("a wildcard entry allows the root domain", originAllowed(project, "https://zerna.app"), true);
check("an unknown domain is rejected", originAllowed(project, "https://evil.example"), false);
check("a look-alike domain is rejected", originAllowed(project, "https://zerno.coffee.evil.example"), false);
check("a wildcard cannot be bypassed by a prefix", originAllowed(project, "https://notzerna.app"), false);
check("a missing Origin header is allowed (same-origin / server calls)", originAllowed(project, null), true);
check("a malformed Origin is rejected", originAllowed(project, "not a url"), false);
check("projects without an allow-list fall back to the primary domain", originAllowed({ domain: "zerno.coffee" }, "https://zerno.coffee"), true);
check("a null allow-list falls back to the primary domain", originAllowed({ domain: "zerno.coffee", allowedDomains: null }, "https://other.coffee"), false);

check("parseAllowedDomains trims, lowercases and drops protocol/path", parseAllowedDomains(["  HTTPS://Example.com/landing  ", "*.OK.app", ""]), ["example.com", "*.ok.app"]);
check("parseAllowedDomains accepts a comma separated string", parseAllowedDomains("a.example, b.example"), ["a.example", "b.example"]);
check("parseAllowedDomains removes duplicates", parseAllowedDomains(["a.example", "A.example"]), ["a.example"]);
check("parseAllowedDomains accepts an empty list", parseAllowedDomains([]), []);
check("parseAllowedDomains rejects an invalid entry", typeof parseAllowedDomains(["not a domain!"]), "string");
check("parseAllowedDomains rejects a bare hostname", typeof parseAllowedDomains(["localhost"]), "string");
check("parseAllowedDomains rejects non-lists", typeof parseAllowedDomains(42), "string");
check(
  "parseAllowedDomains enforces the limit",
  typeof parseAllowedDomains(Array.from({ length: MAX_ALLOWED_DOMAINS + 1 }, (_, i) => `d${i}.example`)),
  "string",
);
check("the documented limit is 20", MAX_ALLOWED_DOMAINS, 20);

if (process.env.NODE_ENV === "production") {
  check("localhost is rejected in production", originAllowed(project, "http://localhost:3000"), false);
} else {
  check("localhost is allowed outside production (local widget testing)", originAllowed(project, "http://localhost:3000"), true);
}

console.log(`\nOK — ${checks} checks passed.`);
