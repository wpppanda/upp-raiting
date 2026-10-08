/**
 * Smoke test for the standalone HTML prototype in /html.
 * Runs the real html/app.js inside jsdom and exercises the flows the user asked for:
 *   1. no "No neutral ratings" link in Business reputation → Reviews
 *   2. the reminders table uses a "Time" column (not "Number")
 *   3. allowed domains for the widget can be added and removed
 *   4. the standard per-level thank-you screen appears after a submission
 * Usage: node scripts/check-html-prototype.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "html", "index.html"), "utf8");
const script = fs.readFileSync(path.join(root, "html", "app.js"), "utf8");

const errors = [];
const dom = new JSDOM(html, {
  url: "http://localhost:4173/",
  runScripts: "dangerously",
  pretendToBeVisual: true,
  virtualConsole: new (require("jsdom").VirtualConsole)().on("jsdomError", (e) => errors.push(e.message)),
});
const { window } = dom;
window.addEventListener("error", (event) => errors.push(event.message));
window.print = () => {};
window.scrollTo = () => {};
window.eval(script);

const doc = window.document;
const UPP = window.UPP;
const $ = (selector) => doc.querySelector(selector);
const $$ = (selector) => Array.prototype.slice.call(doc.querySelectorAll(selector));
const text = () => $("#main").textContent;
const click = (selector) => {
  const el = typeof selector === "string" ? $(selector) : selector;
  if (!el) throw new Error("Cannot click, element not found: " + selector);
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
};
const clickIfPresent = (selector) => { if ($(selector)) click(selector); };
const byAction = (action, arg) =>
  $$("[data-act]").filter((el) => el.getAttribute("data-act") === action && (arg === undefined || el.getAttribute("data-arg") === arg))[0];
const nav = (view) => click('[data-act="nav"][data-view="' + view + '"]');
const setValue = (el, value) => {
  el.value = value;
  el.dispatchEvent(new window.Event("input", { bubbles: true }));
};
const setSelect = (el, value) => {
  el.value = value;
  el.dispatchEvent(new window.Event("change", { bubbles: true }));
};

/* ── 0. Typography: the prototype must use the same locally hosted font ──── */
const css = fs.readFileSync(path.join(root, "html", "styles.css"), "utf8");
const fontChecks = [
  ["styles.css declares the Montserrat @font-face", /@font-face\s*{[^}]*font-family:\s*"Montserrat"[^}]*}/.test(css)],
  ["the @font-face points at the bundled woff2", /url\("fonts\/montserrat-latin-variable\.woff2"\) format\("woff2"\)/.test(css)],
  ["the prototype ships the font file", fs.existsSync(path.join(root, "html", "fonts", "montserrat-latin-variable.woff2"))],
  ["the Next.js app ships the same font file", fs.existsSync(path.join(root, "public", "fonts", "montserrat-latin-variable.woff2"))],
  ["body uses Montserrat first", /font-family:\s*"Montserrat",/.test(css)],
];
for (const [label, ok] of fontChecks) {
  if (!ok) throw new Error("FAILED: " + label);
  console.log("PASS: " + label);
}
// jsdom does not cascade linked stylesheets, so read the rule the way a browser would apply it.
const bodyRule = /html,\s*body\s*{([^}]*)}/.exec(css);
const declaredFont = bodyRule ? (/font-family:\s*([^;]+);/.exec(bodyRule[1]) || [])[1] : "";
if (!declaredFont || !declaredFont.trim().startsWith('"Montserrat"')) {
  throw new Error("FAILED: html/body font-family is " + (declaredFont || "not declared"));
}
console.log("PASS: html/body font-family is " + declaredFont.trim());
fontChecks.push(["html/body font-family declared", true]);

let checks = fontChecks.length + 1;
function check(label, condition) {
  checks += 1;
  if (!condition) throw new Error("FAILED: " + label);
  console.log("PASS: " + label);
}

/* ── 1. Chrome: header + all sidebar pages ─────────────────────────────── */
check("sidebar renders every page", $$('#sidebar [data-act="nav"]').length >= 13);
nav("reviews");
check("reviews table renders rows", $$("#main table.data tbody tr").length > 5);

/* ── 2. Business reputation → Reviews: no "No neutral ratings" link ────── */
nav("reputation");
check("reputation hub opens on Protection & Settings", $('[data-act="rep-section"][data-arg="protection"]').getAttribute("aria-current") === "page");
click('[data-act="rep-section"][data-arg="reviews"]');
click('[data-act="rep-category"][data-arg="neutral"]');
check("neutral category is selected", $('[data-act="rep-category"][data-arg="neutral"]').getAttribute("aria-checked") === "true");
check("no 'No neutral ratings' control anywhere", !/No neutral ratings/i.test(doc.body.textContent));
check("no 'No negative ratings' control either", !/No negative ratings/i.test(doc.body.textContent));
check("range summary still lists all three levels", /Positive:5 ★/.test(text()) && /Neutral:4 ★/.test(text()) && /Negative:1–3 ★/.test(text()));
click('[data-act="rep-star"][data-arg="5"]');
check("star picker still moves the neutral threshold", UPP.state.rep.draft.neutralThreshold === 5);
check("empty-range warning is shown instead of the removed link", /No ratings are neutral/.test(text()));
click('[data-act="rep-star"][data-arg="4"]');
clickIfPresent('[data-act="rep-discard"]');

/* ── 3. Reminders: "Time" column instead of "Number" ───────────────────── */
click('[data-act="rep-section"][data-arg="reminders"]');
const headers = $$(".rep-reminder-table th").map((th) => th.textContent.trim());
check('first reminders column is "Time"', headers[0] === "Time");
check('no "Number" column header left', headers.indexOf("Number") === -1);
check("reminder rows render", $$(".rep-reminder-table tbody tr").length === 3);
const firstTime = $('.rep-reminder-table input[type="number"]');
check('delay input is labelled "delay time"', /delay time/.test(firstTime.getAttribute("aria-label")));
setValue(firstTime, "6");
check("editing the time updates delayMinutes", UPP.state.rep.draft.reminders[0].delayMinutes === 6 * 1440);
const unitSelect = $('.rep-reminder-table select');
setSelect(unitSelect, "hours");
check("changing the unit converts the delay", UPP.state.rep.draft.reminders[0].delayMinutes === 6 * 60);
click('[data-act="rem-add"]');
check("add reminder appends a row", $$(".rep-reminder-table tbody tr").length === 4);
click('[data-act="rem-delete"][data-arg="' + UPP.state.rep.draft.reminders[3].id + '"]');
check("delete reminder removes the row", $$(".rep-reminder-table tbody tr").length === 3);
click('[data-act="rem-message"]');
check("message editor panel opens", !!$(".panel-head h2") && /Edit reminder message/.test($(".panel-head h2").textContent));
click('[data-act="rem-message-cancel"]');
clickIfPresent('[data-act="rep-discard"]');

/* ── 4. Allowed domains for the widget ─────────────────────────────────── */
click('[data-act="rep-section"][data-arg="protection"]');
check("Widget domains section exists", /Widget domains/.test(text()));
check("primary domain is shown as a chip", /zerno\.coffee/.test($('.rep-domain-chip.is-primary span').textContent));
check("extra domains are listed", $$(".rep-domain-chip").length === 3);
click('[data-act="domain-add"]');
const domainInputs = $$('.rep-domain-chip input');
check("add domain adds an editable chip", domainInputs.length === 3);
setValue(domainInputs[2], "https://Example.Com/landing");
click('[data-act="rep-save"]');
check("saving normalises the new domain", UPP.PROJECT.allowedDomains.join(",") === "shop.zerno.coffee,*.zerna.app,example.com");
check("saved state clears the dirty flag", /All settings are up to date/.test(text()));
click('[data-act="domain-remove"][data-arg="2"]');
click('[data-act="rep-save"]');
check("removing a domain persists", UPP.PROJECT.allowedDomains.length === 2);

/* ── 5. Widgets page: thank-you screen per level after submission ──────── */
nav("widgets");
check("widget type cards render", $$('#main [data-act="widget-type"]').length === 4);
click('[data-act="widget-type"][data-arg="form"]');
check("sandbox form renders", !!$("[data-widget-form]"));
click('[data-act="sandbox-rating"][data-arg="5"]');
setValue($('[data-act="sandbox-field"][data-arg="name"]'), "Test Customer");
setValue($('[data-act="sandbox-field"][data-arg="text"]'), "Great coffee and very friendly staff, thank you!");
$("[data-widget-form]").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
check("thank-you screen replaces the form", !!$("[data-widget-thanks]"));
check("thank-you title is shown", /Thank you for your feedback!/.test($("#main").textContent));
check("positive level invites to Google", /Leave a review on Google/.test($("#main").textContent));
check("submitted review joined the list as positive", UPP.REVIEWS[0].sentiment === "positive" && UPP.REVIEWS[0].authorName === "Test Customer");
click('[data-act="sandbox-reset"]');
check("leave another review brings the form back", !!$("[data-widget-form]"));

click('[data-act="sandbox-rating"][data-arg="1"]');
setValue($('[data-act="sandbox-field"][data-arg="name"]'), "Upset Customer");
setValue($('[data-act="sandbox-field"][data-arg="text"]'), "Waited forty minutes and the coffee was cold.");
$("[data-widget-form]").dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
check("negative level offers support email", /Email customer support/.test($("#main").textContent));
check("negative level offers support chat", /Chat with support/.test($("#main").textContent));
check("negative review is classified as negative", UPP.REVIEWS[0].sentiment === "negative");
click('[data-act="sandbox-reset"]');

/* ── 6. Widget preview drawer with the after-submission tab ────────────── */
click('[data-act="open-preview"]');
check("preview panel opens", /Widget preview/.test($(".panel-head h2").textContent));
check("preview shows the allowed domain list", /Allowed domains:/.test($(".panel-body").textContent));
click('[data-act="preview-kind"][data-arg="after"]');
check("after-submission tab shows the thank-you screen", !!$(".panel-body [data-widget-thanks]"));
click('[data-act="preview-after"][data-arg="positive"]');
check("level switch shows the Google invitation", /Leave a review on Google/.test($(".panel-body").textContent));
click('[data-act="close-panel"]');
check("panel closes", !$(".panel"));

/* ── 7. Review actions drawer ──────────────────────────────────────────── */
nav("moderation");
const pendingId = UPP.REVIEWS.filter((r) => r.status === "pending")[0].id;
click('[data-act="open-actions"][data-arg="' + pendingId + '"]');
check("actions drawer opens", /Review actions/.test($(".panel-head h2").textContent));
click('[data-act="review-action"][data-arg="approve"][data-id="' + pendingId + '"]');
check("approve publishes the review", UPP.REVIEWS.filter((r) => r.id === pendingId)[0].status === "published");

/* ── 8. Every page renders without errors ──────────────────────────────── */
["overview", "queue", "moderation", "clients", "channels", "team", "reviews", "reputation", "messages", "analytics", "widgets", "settings"].forEach((view) => {
  nav(view);
  if ($("#main").textContent.trim().length < 40) throw new Error("FAILED: page " + view + " looks empty");
});
console.log("PASS: all 12 pages render content");
checks += 1;

if (errors.length) console.log("captured errors:", errors);
check("no runtime errors were thrown", errors.length === 0);
console.log("\nOK — " + checks + " checks passed.");
