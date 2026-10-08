/**
 * Renders the real React components (src/app/dashboard.tsx, src/components/reputation-hub.tsx,
 * src/components/widget-drawer.tsx) inside jsdom and exercises the four changes:
 *   1. the "No neutral ratings" shortcut is gone
 *   2. the reminders table shows a "Time" column
 *   3. the widget has an editable list of allowed domains (saved through /api/project)
 *   4. the standard per-level thank-you screen appears after a submission
 * Usage: node scripts/check-reputation-ui.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const work = path.join(root, ".validation");
fs.mkdirSync(work, { recursive: true });
const entry = path.join(work, "entry.tsx");
const bundle = path.join(work, "bundle.cjs");

fs.writeFileSync(
  entry,
  [
    'export { default as Dashboard } from "@/app/dashboard";',
    'export { default as ReputationHub } from "@/components/reputation-hub";',
    'export { default as WidgetDrawer } from "@/components/widget-drawer";',
    'export { createElement } from "react";',
    'export { createRoot } from "react-dom/client";',
    'export { renderToStaticMarkup } from "react-dom/server";',
    "",
  ].join("\n"),
);

esbuild.buildSync({
  entryPoints: [entry],
  outfile: bundle,
  bundle: true,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  target: "node20",
  tsconfig: path.join(root, "tsconfig.json"),
  absWorkingDir: root,
  external: ["react", "react-dom", "react-dom/client", "react-dom/server", "react/jsx-runtime"],
  logLevel: "silent",
});

/* ── jsdom environment ─────────────────────────────────────────────────── */
const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
  url: "http://localhost:3000/",
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.Event = dom.window.Event;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.getComputedStyle = dom.window.getComputedStyle;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;
global.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no <dialog> implementation; SidePanel opens the panel with showModal().
dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
global.HTMLDialogElement = dom.window.HTMLDialogElement;

const requests = [];
global.fetch = async (url, init) => {
  requests.push({ url: String(url), body: init && init.body ? JSON.parse(init.body) : null });
  return { ok: true, status: 200, json: async () => ({ project: PROJECT }) };
};

const ui = require(bundle);
const { act } = require("react");

/* ── Demo data ─────────────────────────────────────────────────────────── */
const notify = (value) => ({ email: { enabled: true, value }, whatsapp: { enabled: false, value: "" }, sms: { enabled: false, value: "" } });
const PROJECT = {
  id: "9f1c2a44-6b7e-4d0a-9c31-2f6b8e1d5a70",
  name: "Zerna Coffee",
  domain: "zerno.coffee",
  allowedDomains: ["shop.zerno.coffee", "*.zerna.app"],
  brandColor: "#617a58",
  timezone: "Europe/Moscow",
  ratingScale: "stars",
  positiveThreshold: 5,
  neutralThreshold: 4,
  positiveDelayMinutes: 120,
  smartQueueEnabled: true,
  positivePublishMode: "delayed",
  neutralPublishMode: "manual",
  negativePublishMode: "manual",
  neutralDelayMinutes: 360,
  negativeDelayMinutes: 0,
  positiveNotifyChannels: notify("hello@zerno.coffee"),
  neutralNotifyChannels: notify("hello@zerno.coffee"),
  negativeNotifyChannels: notify("owner@zerno.coffee"),
  positiveNotify: false,
  neutralNotify: true,
  negativeNotify: true,
  positiveAutoReplyEnabled: true,
  neutralAutoReplyEnabled: false,
  negativeAutoReplyEnabled: false,
  positiveAutoReplyTemplate: "Thank you for your great review!",
  neutralAutoReplyTemplate: "Thank you for your feedback!",
  negativeAutoReplyTemplate: "We are sorry about your experience.",
  replySlaHours: 24,
  replyRequiredNegative: true,
  replySignature: "Support team",
  reminders: [{ id: "rem-3d", delayMinutes: 4320, channel: "email", target: "", message: "Hello {name}! Leave a review here: {link}", enabled: true }],
  invitePositiveToExternal: true,
  googleReviewUrl: "https://g.page/r/zerna/review",
  allowAnonymousReviews: true,
  reviewTextRequired: false,
  publicShowCity: false,
  publicShowDate: true,
  publicShowName: true,
  publicShowText: true,
  publicShowAvatar: true,
  neutralSupportContact: true,
  neutralSupportChat: true,
  negativeSupportContact: true,
  negativeSupportChat: true,
  supportEmail: "support@zerno.coffee",
  supportChatUrl: "https://wa.me/15550102030",
  supportOfferText: "Please contact our support team — we will make it right.",
  neutralBoostPositive: true,
  negativeLookbackEnabled: true,
  negativeLookbackCount: 3,
  stopWords: "",
  minReviewLength: 10,
  maxReviewsPerIp: 3,
  minIntervalMinutes: 15,
  maxPerHour: 10,
  maxPerDay: 50,
  maxNegativeShare: 20,
  randomizeOrder: false,
  primeTimeBoost: true,
  hideNegativeText: false,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};
const mkReview = (id, name, rating, sentiment, status) => ({
  id, projectId: PROJECT.id, authorName: name, authorEmail: name.toLowerCase().replace(/\W/g, "") + "@example.com",
  authorCity: "New York", isAnonymous: false, rating, sentiment, content: "Great coffee and friendly staff.",
  source: "Website widget", status, createdAt: new Date("2026-09-01T10:00:00Z"), scheduledAt: null,
  publishedAt: status === "published" ? new Date("2026-09-01T10:00:00Z") : null,
  companyReply: null, replyAt: null, hiddenText: false, pinned: false,
});
const DATA = {
  project: PROJECT,
  reviews: [mkReview("rev-1", "Valeria M.", 5, "positive", "published"), mkReview("rev-2", "Ivan K.", 1, "negative", "pending")],
  metrics: { total: 2, published: 1, pending: 1, queued: 0, averageRating: 5, positiveShare: 100 },
  ratingDistribution: [{ rating: 5, count: 1 }],
  weekly: [{ date: "2026-09-01", label: "Sep 1", count: 1, average: 5 }],
};

/* ── Helpers ───────────────────────────────────────────────────────────── */
const doc = dom.window.document;
let checks = 0;
function check(label, condition) {
  checks += 1;
  if (!condition) throw new Error("FAILED: " + label);
  console.log("PASS: " + label);
}
const rootEl = () => doc.getElementById("root");
const mount = async (element) => {
  rootEl().innerHTML = "";
  const container = doc.createElement("div");
  rootEl().appendChild(container);
  const reactRoot = ui.createRoot(container);
  await act(async () => { reactRoot.render(element); });
  return { container, reactRoot };
};
const click = async (el) => {
  if (!el) throw new Error("Element to click not found");
  await act(async () => { el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true })); });
};
const setValue = async (el, value) => {
  const proto = el instanceof dom.window.HTMLTextAreaElement ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  await act(async () => { el.dispatchEvent(new dom.window.Event("input", { bubbles: true })); });
};
const byText = (container, selector, text) =>
  Array.prototype.slice.call(container.querySelectorAll(selector)).filter((el) => el.textContent.trim() === text)[0];
const bodyText = (container) => container.textContent;

(async () => {
  /* ── Reputation hub ─────────────────────────────────────────────────── */
  const noop = () => {};
  const hub = await mount(
    ui.createElement(ui.ReputationHub, { project: PROJECT, onSaved: noop, onToast: noop, onPreview: noop }),
  );
  check("Protection & Settings is the default section", /Widget domains/.test(bodyText(hub.container)));
  check("the allow-list shows the primary domain", /zerno\.coffee/.test(bodyText(hub.container)));
  const initialDomains = Array.prototype.slice
    .call(hub.container.querySelectorAll(".rep-domain-chip input"))
    .map((input) => input.value);
  check("the allow-list shows the extra domains", JSON.stringify(initialDomains) === JSON.stringify(["shop.zerno.coffee", "*.zerna.app"]));

  await click(byText(hub.container, ".rep-navigation button", "Reviews"));
  await click(hub.container.querySelector('[aria-label="Neutral"][role="radio"]'));
  check("neutral category can be selected", hub.container.querySelector('[aria-label="Neutral"][role="radio"]').getAttribute("aria-checked") === "true");
  check("no 'No neutral ratings' shortcut is rendered", !/No neutral ratings/i.test(bodyText(hub.container)));
  check("no 'No negative ratings' shortcut either", !/No negative ratings/i.test(bodyText(hub.container)));
  check("the range summary still lists the three levels", /Positive:5 ★/.test(bodyText(hub.container)) && /Neutral:4 ★/.test(bodyText(hub.container)));

  await click(byText(hub.container, ".rep-navigation button", "Reminders"));
  const headers = Array.prototype.slice.call(hub.container.querySelectorAll(".rep-reminder-table th")).map((th) => th.textContent.trim());
  check('the first reminders column is "Time"', headers[0] === "Time");
  check('no "Number" column is left', headers.indexOf("Number") === -1);
  check("the reminder note talks about the time", /The time and unit set the delay/.test(bodyText(hub.container)));
  check('the delay input is labelled "delay time"', /delay time/.test(hub.container.querySelector('.rep-table-input[type="number"]').getAttribute("aria-label")));

  await click(byText(hub.container, ".rep-navigation button", "Protection & Settings"));
  await click(byText(hub.container, ".rep-link", "+ Add domain"));
  const domainInputs = hub.container.querySelectorAll('.rep-domain-chip input');
  check("a new domain row can be added", domainInputs.length === 3);
  await setValue(domainInputs[2], "  HTTPS://Example.com/landing  ");
  await click(hub.container.querySelector('.rep-button.primary'));
  const saved = requests.filter((r) => r.url === "/api/project").pop();
  check("saving sends the normalised allow-list to /api/project", JSON.stringify(saved.body.allowedDomains) === JSON.stringify(["shop.zerno.coffee", "*.zerna.app", "example.com"]));

  /* ── Dashboard → Widgets & Embed SDK ────────────────────────────────── */
  requests.length = 0;
  global.fetch = async (url, init) => {
    const target = String(url);
    requests.push({ url: target, body: init && init.body ? JSON.parse(init.body) : null });
    const payload = target.startsWith("/api/dashboard")
      ? DATA
      : target.startsWith("/api/reviews")
        ? { review: { id: "rev-9", status: "published" }, followUp: { sentiment: "positive", support: null, google: { url: PROJECT.googleReviewUrl } } }
        : { project: PROJECT };
    return { ok: true, status: target.startsWith("/api/reviews") ? 201 : 200, json: async () => payload };
  };
  const dash = await mount(ui.createElement(ui.Dashboard, { initialData: DATA }));
  await click(dash.container.querySelector('[title="Widgets and embed code"]'));
  check("the widgets page renders the embed snippet", /widget\.js/.test(bodyText(dash.container)));
  check("the widgets page lists the allowed domains", /Allowed domains for the widget/.test(bodyText(dash.container)) && /shop\.zerno\.coffee/.test(bodyText(dash.container)));
  check("the widgets page marks the primary domain", /primary/.test(bodyText(dash.container)));
  await click(Array.prototype.slice.call(dash.container.querySelectorAll("button")).filter((b) => /Review form/.test(b.textContent))[0]);
  const nameField = dash.container.querySelector('input[placeholder="Your name"]');
  await setValue(nameField, "Test Customer");
  const form = nameField.closest("form");
  await act(async () => { form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })); });
  check("the thank-you screen replaces the sandbox form", !!dash.container.querySelector("[data-widget-thanks]"));
  check("the thank-you screen shows the standard title", /Thank you for your feedback!/.test(bodyText(dash.container)));
  check("the positive level offers the Google invitation", /Leave a review on Google/.test(bodyText(dash.container)));
  check("the sandbox posted the review", requests.some((r) => r.url === "/api/reviews"));
  await click(Array.prototype.slice.call(dash.container.querySelectorAll("button")).filter((b) => /Leave another review/.test(b.textContent))[0]);
  check("the form can be opened again", !!dash.container.querySelector('input[placeholder="Your name"]'));
  // Let the pending refreshData() promise settle before the next mount.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  await act(async () => { dash.reactRoot.unmount(); });

  /* ── Widget preview drawer ──────────────────────────────────────────── */
  const drawer = await mount(
    ui.createElement(ui.WidgetDrawer, {
      open: true, onClose: noop, data: DATA, kind: "after", onKind: noop, onToast: noop, projectOverride: null,
    }),
  );
  check("the after-submission preview shows the thank-you screen", /Thank you for your feedback!/.test(bodyText(drawer.container)));
  check("the drawer lists every allowed domain", /Allowed domains:/.test(bodyText(drawer.container)) && /zerno\.coffee, shop\.zerno\.coffee, \*\.zerna\.app/.test(bodyText(drawer.container)));

  await act(async () => { drawer.reactRoot.unmount(); });
  console.log("\nOK — " + checks + " checks passed.");
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
