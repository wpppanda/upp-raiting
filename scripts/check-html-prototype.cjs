/**
 * Checks the standalone HTML build in /html.
 *
 * It loads the committed bundle in jsdom, drives the real application UI, and
 * compares the review actions drawer against the markup produced by the
 * application's own component (src/components/review-actions-drawer.tsx), so the
 * prototype cannot drift from the app.
 *
 * Usage: node scripts/check-html-prototype.cjs   (after `npm run build:html`)
 */
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "html", "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "html", "app.css"), "utf8");
const demoData = fs.readFileSync(path.join(root, "html", "demo-data.js"), "utf8");
const bundle = fs.readFileSync(path.join(root, "html", "app.bundle.js"), "utf8");

let checks = 0;
function check(label, condition) {
  checks += 1;
  if (!condition) throw new Error("FAILED: " + label);
  console.log("PASS: " + label);
}

/* ── 1. The build ships the app's own styles and font ─────────────────── */
check("app.css carries the side-panel styles from globals.css", /\.side-panel\s*{/.test(css) && /\.review-action-row\s*{/.test(css));
check("app.css carries the reputation hub styles", /\.rep-reminder-table\s*{/.test(css) && /\.rep-domain-chip\s*{/.test(css));
check("app.css carries the generated Tailwind utilities used by the drawer", css.includes("text-\\[\\#344054\\]") && css.includes("tracking-\\[\\.09em\\]"));
check("app.css declares the bundled Montserrat", /@font-face\s*{[^}]*font-family:\s*"Montserrat"[^}]*}/.test(css));
check("the font url is rewritten for the standalone folder", css.includes('url("fonts/montserrat-latin-variable.woff2")'));
check("the font file ships with the prototype", fs.existsSync(path.join(root, "html", "fonts", "montserrat-latin-variable.woff2")));
check("index.html loads the app stylesheet and bundle", /href="app\.css"/.test(html) && /src="app\.bundle\.js"/.test(html));
check("index.html uses the layout shell class", /class="antialiased min-h-screen"/.test(html));

/* ── 2. Boot the committed bundle in jsdom ────────────────────────────── */
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error.message));
virtualConsole.on("error", (message) => errors.push(String(message)));
const dom = new JSDOM(html, { url: "http://localhost:4173/", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
const { window } = dom;
window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
window.scrollTo = () => {};
window.print = () => {};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

window.eval(demoData);
check("demo data is provided before the bundle runs", Array.isArray(window.__UPP_DEMO__.reviews) && window.__UPP_DEMO__.reviews.length >= 12);
window.eval(bundle);

const doc = window.document;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const flush = async () => { await sleep(60); };
const click = async (el) => {
  if (!el) throw new Error("Element to click not found");
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
  await flush();
};
const byText = (selector, text) =>
  Array.prototype.slice.call(doc.querySelectorAll(selector)).filter((el) => el.textContent.trim() === text)[0];
const bodyText = () => doc.body.textContent;

(async () => {
  await flush();
  check("the real dashboard renders from the bundle", !!doc.querySelector(".uppointment-shell") && !!doc.querySelector(".reference-app-header"));
  check("the reviews table renders rows", doc.querySelectorAll("table tbody tr").length >= 6);

  /* ── 3. Review actions drawer === the app's component ───────────────── */
  const rowActions = Array.prototype.slice.call(doc.querySelectorAll('button[aria-label^="Open actions for"]'));
  const review = window.__UPP_DEMO__.reviews.filter((candidate) =>
    rowActions.some((button) => button.getAttribute("aria-label") === "Open actions for " + candidate.authorName))[0];
  check("every listed review offers its actions drawer", rowActions.length > 0 && !!review);
  await click(doc.querySelector('button[aria-label="Open actions for ' + review.authorName + '"]'));
  const dialog = doc.querySelector("dialog.side-panel");
  check("the actions drawer is a native dialog.side-panel", !!dialog);
  check("the drawer uses the app's panel chrome", !!dialog.querySelector(".side-panel-header") && !!dialog.querySelector(".side-panel-body") && !!dialog.querySelector(".side-panel-footer"));
  check("the drawer header matches the app copy", /Review actions/.test(dialog.querySelector(".side-panel-header").textContent) && /Business reputation/.test(dialog.querySelector(".side-panel-header").textContent));
  check("the drawer lists the app's action groups", Array.prototype.slice.call(dialog.querySelectorAll(".review-action-group h3")).map((h) => h.textContent.trim()).join(" | ") ===
    "Publication | Moderation | Customer communication | Rating & classification | Tools");

  /* Render the application component itself and compare the markup. */
  const work = path.join(root, ".validation");
  fs.mkdirSync(work, { recursive: true });
  const entry = path.join(work, "drawer-entry.tsx");
  const out = path.join(work, "drawer-bundle.cjs");
  fs.writeFileSync(entry, [
    'export { default as ReviewActionsDrawer } from "@/components/review-actions-drawer";',
    'export { createElement } from "react";',
    'export { renderToStaticMarkup } from "react-dom/server";',
    "",
  ].join("\n"));
  esbuild.buildSync({
    entryPoints: [entry], outfile: out, bundle: true, format: "cjs", platform: "node", jsx: "automatic",
    target: "node20", tsconfig: path.join(root, "tsconfig.json"), absWorkingDir: root,
    external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime"], logLevel: "silent",
  });
  const app = require(out);
  // Both trees render the very same review object, so the comparison is state for state.
  check("the drawer was opened for that review", dialog.textContent.indexOf(review.content) !== -1);
  const ssr = app.renderToStaticMarkup(
    app.createElement(app.ReviewActionsDrawer, {
      review, project: window.__UPP_DEMO__.project, busy: false,
      onClose: () => {}, onAction: async () => ({ ok: true, message: "" }), onLocal: async () => "",
    }),
  );
  const holder = doc.createElement("div");
  holder.innerHTML = ssr;

  const structure = (scope) => Array.prototype.slice.call(scope.querySelectorAll(".review-action-group")).map((group) => ({
    title: group.querySelector("h3").textContent.trim(),
    rows: Array.prototype.slice.call(group.querySelectorAll(".review-action-row")).map((row) => ({
      className: row.getAttribute("class"),
      label: row.children[1].children[0].textContent.trim(),
      hint: row.children[1].children[1].textContent.trim(),
      disabled: row.hasAttribute("disabled"),
    })),
  }));
  const fromApp = JSON.stringify(structure(holder));
  const fromPrototype = JSON.stringify(structure(dialog));
  if (fromPrototype !== fromApp) {
    console.log("APP      :", JSON.stringify(JSON.parse(fromApp).map((g) => [g.title, g.rows.map((r) => r.label + "/" + r.className)])));
    console.log("PROTOTYPE:", JSON.stringify(JSON.parse(fromPrototype).map((g) => [g.title, g.rows.map((r) => r.label + "/" + r.className)])));
  }
  check("the drawer body is identical to the app component markup", fromPrototype === fromApp);
  const photoCount = (scope) => {
    const block = scope.querySelector("[data-review-photos]");
    return block ? block.querySelectorAll("img").length : -1;
  };
  check("the drawer shows the attached photos", photoCount(dialog) === (review.photos ?? []).length && photoCount(dialog) === photoCount(holder));
  const statusLabels = { published: "Published", pending: "Pending moderation", queued: "In queue", rejected: "Rejected", spam: "Spam" };
  check("the drawer shows the review summary block",
    dialog.textContent.indexOf(statusLabels[review.status]) !== -1 &&
    dialog.textContent.indexOf(review.authorName) !== -1 &&
    dialog.querySelector(".review-details-text").textContent.trim() === review.content.trim());

  /* Drive an action through the in-memory API and watch the drawer follow. */
  const rowByLabel = (label) =>
    Array.prototype.slice.call(dialog.querySelectorAll(".review-action-row")).filter((row) => row.textContent.indexOf(label) === 0)[0];
  const stored = () => window.__UPP_DEMO__.reviews.filter((candidate) => candidate.id === review.id)[0];

  await click(rowByLabel("Unpublish review"));
  await flush();
  check("unpublishing reaches the API and returns the review to moderation", stored().status === "pending");
  check("the open drawer re-renders with the new state", !!rowByLabel("Approve review"));

  await click(rowByLabel("Approve review"));
  await flush();
  check("approving publishes it again", stored().status === "published");

  /* ── 4. Regression checks, now running against the real components ──── */
  await click(dialog.querySelector(".panel-close"));
  await sleep(260);
  check("the drawer closes", !doc.querySelector("dialog.side-panel[open]"));

  await click(doc.querySelector('button[title="Business reputation — all settings in one place"]'));
  check("the reputation hub opens", /Widget domains/.test(bodyText()));
  await click(byText(".rep-navigation button", "Reviews"));
  await click(doc.querySelector('[aria-label="Neutral"][role="radio"]'));
  check("no 'No neutral ratings' shortcut", !/No neutral ratings/i.test(bodyText()));
  await click(byText(".rep-navigation button", "Reminders"));
  const headers = Array.prototype.slice.call(doc.querySelectorAll(".rep-reminder-table th")).map((th) => th.textContent.trim());
  check('the reminders table uses a "Time" column', headers[0] === "Time" && headers.indexOf("Number") === -1);

  await click(doc.querySelector('button[title="Widgets and embed code"]'));
  await click(Array.prototype.slice.call(doc.querySelectorAll("button")).filter((b) => /Review form/.test(b.textContent))[0]);
  const nameField = doc.querySelector('input[placeholder="Your name"]');
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(nameField, "Test Customer");
  nameField.dispatchEvent(new window.Event("input", { bubbles: true }));
  await flush();
  const form = nameField.closest("form");
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await flush();
  check("the thank-you screen appears after submitting", !!doc.querySelector("[data-widget-thanks]") && /Thank you for your feedback!/.test(bodyText()));
  check("the positive level offers the Google invitation", /Leave a review on Google/.test(bodyText()));

  /* ── 5. Photos, employee reviews, the install page, and form settings ── */
  await click(doc.querySelector('button[title="All reviews"]'));
  const withPhotos = window.__UPP_DEMO__.reviews.filter((candidate) => (candidate.photos ?? []).length > 0)[0];
  await click(doc.querySelector('button[aria-label="Open actions for ' + withPhotos.authorName + '"]'));
  const photoDialog = doc.querySelector("dialog.side-panel");
  check("a review with attachments shows them in the panel", photoDialog.querySelectorAll("[data-review-photos] img").length === withPhotos.photos.length);
  const employee = window.__UPP_DEMO__.reviews.filter((candidate) => candidate.authorKind === "employee")[0];
  await click(doc.querySelector('button[aria-label="Open actions for ' + employee.authorName + '"]'));
  await flush();
  const employeeDialog = doc.querySelector("dialog.side-panel");
  check("an employee review says who the author is", /Author · employee/.test(employeeDialog.textContent));
  check("an employee review says who added it", ("Added by · " + employee.addedBy).split("").length > 0 && employeeDialog.textContent.indexOf("Added by · " + employee.addedBy) !== -1);
  await click(employeeDialog.querySelector(".panel-close"));
  await sleep(260);

  // Add review: on behalf of a customer, or as the employee who types it in.
  await click(doc.querySelector('button[title="Add review"]'));
  const modal = Array.prototype.slice.call(doc.querySelectorAll("form")).filter((form) => /Who is the author\?/.test(form.textContent))[0];
  check("the add-review form asks who the author is", !!modal);
  check("both author kinds are offered", /Customer/.test(modal.textContent) && /Me \(employee\)/.test(modal.textContent));
  const authorButton = Array.prototype.slice.call(modal.querySelectorAll('button[role="radio"]')).filter((button) => /Me \(employee\)/.test(button.textContent))[0];
  await click(authorButton);
  check("the employee mode renames the author field", /Employee name/.test(modal.textContent) && /Added by/.test(modal.textContent));
  const nameInput = modal.querySelector('input[type="text"][required]');
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(nameInput, "Maria (manager)");
  nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  const customSelect = modal.querySelector("select");
  check("the add-review modal renders the custom select field", !!customSelect);
  customSelect.value = "Breakfast";
  customSelect.dispatchEvent(new window.Event("change", { bubbles: true }));
  await flush();
  modal.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));
  await flush();
  const added = window.__UPP_DEMO__.reviews[0];
  check("the modal collects the custom field answer", (added.customFields ?? []).some((field) => field.value === "Breakfast"));
  check("the employee review is stored with its author kind", added.authorKind === "employee" && added.authorName === "Maria (manager)");
  check("the employee review records who added it", added.addedBy === "Administrator" && added.source === "Added manually");

  // Photos in the review form follow the project setting.
  await click(doc.querySelector('button[title="Widgets and embed code"]'));
  await click(Array.prototype.slice.call(doc.querySelectorAll("button")).filter((button) => /Review form/.test(button.textContent))[0]);
  check("the widget sandbox offers photo attachments", /Add photos/.test(bodyText()) && /compressed automatically/.test(bodyText()));

  // Review form settings + the preview button next to Save changes.
  await click(doc.querySelector('button[title="Business reputation — all settings in one place"]'));
  await click(byText(".rep-navigation button", "Review form"));
  check("the review form page configures photos", /Allow photos in reviews/.test(bodyText()) && /Photos per review/.test(bodyText()) && /Maximum photo size, KB/.test(bodyText()));
  const footerButtons = Array.prototype.slice.call(doc.querySelectorAll(".rep-footer-actions button")).map((button) => button.textContent.trim());
  check("widget preview sits next to Save changes", footerButtons.indexOf("Widget preview") !== -1 && footerButtons[footerButtons.length - 1] === "Save changes");
  const allowPhotos = doc.querySelector('[aria-label="Allow photos in reviews"][role="switch"]');
  await click(allowPhotos);
  check("photos can be turned off", allowPhotos.getAttribute("aria-checked") === "false" && /Photo attachments are disabled/.test(bodyText()));
  await click(allowPhotos);

  await click(Array.prototype.slice.call(doc.querySelectorAll(".rep-footer-actions button")).filter((button) => button.textContent.indexOf("Widget preview") !== -1)[0]);
  await flush();
  const previewDialog = doc.querySelector("dialog.side-panel[open]");
  check("the preview shows the embed code on normal tabs", Array.prototype.slice.call(previewDialog.querySelectorAll("pre")).some((pre) => pre.textContent.indexOf("widget.js") !== -1));
  check("the preview lists the allowed domains", /Allowed domains:/.test(previewDialog.textContent) && /zerno\.coffee, shop\.zerno\.coffee, \*\.zerna\.app/.test(previewDialog.textContent));
  await click(Array.prototype.slice.call(previewDialog.querySelectorAll('[role="tab"]')).filter((tab) => /After submission/.test(tab.textContent))[0]);
  await flush();
  const afterDialog = doc.querySelector("dialog.side-panel[open]");
  check("the after-submission screen hides the embed code", !Array.prototype.slice.call(afterDialog.querySelectorAll("pre")).some((pre) => pre.textContent.indexOf("widget.js") !== -1));
  check("the after-submission screen still lists the allowed domains", /Allowed domains:/.test(afterDialog.textContent));
  await click(afterDialog.querySelector(".panel-close"));
  await sleep(260);

  // Badge page with five variants and its own settings.
  await click(doc.querySelector('button[title="Rating badge"]'));
  check("the badge page lists the five variants", /Number/.test(bodyText()) && /Stars only/.test(bodyText()) && /Banner/.test(bodyText()));
  const bannerCard = Array.prototype.slice.call(doc.querySelectorAll("button")).filter((button) => /A wide strip for footers/.test(button.textContent))[0];
  await click(bannerCard);
  await flush();
  check("choosing a variant saves it as the project default", window.__UPP_DEMO__.project.badgeFormat === "banner");
  check("the badge embed snippet follows the selection", /data-widget="badge" data-format="banner"/.test(bodyText()));

  // Installation guide right after the publication queue.
  await click(doc.querySelector('button[title="Install guide — add the widget to your site"]'));
  check("the install page opens from the sidebar", /Install the widget on your website/.test(bodyText()));
  check("the install page lists the allowed domains", /Allow your domain/.test(bodyText()) && /zerno\.coffee/.test(bodyText()) && /shop\.zerno\.coffee/.test(bodyText()));
  check("the install page shows the embed code", /widget\.js/.test(bodyText()) && /data-project-id="9f1c2a44/.test(bodyText()) && /data-widget="reviews"/.test(bodyText()));
  await click(Array.prototype.slice.call(doc.querySelectorAll('input[name="install-kind"]'))[1]);
  check("choosing a block changes the snippet", /data-widget="form"/.test(bodyText()));
  check("the install page explains failures and the API", /This domain is not connected to the project/.test(bodyText()) && /\/api\/v1\/projects\//.test(bodyText()));
  await click(doc.querySelector('button[title="Widgets and embed code"]'));
  check("the widgets page links to the installation guide", /Installation guide/.test(bodyText()));
  await click(Array.prototype.slice.call(doc.querySelectorAll("button")).filter((button) => button.textContent.trim() === "Installation guide")[0]);
  check("the labeled button opens the install page", /Install the widget on your website/.test(bodyText()));

  check("no runtime errors were thrown", errors.length === 0);
  if (errors.length) console.log(errors);
  console.log("\nOK — " + checks + " checks passed.");
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
