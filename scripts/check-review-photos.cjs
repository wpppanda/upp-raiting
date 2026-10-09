/**
 * Checks the review photo attachments.
 *
 *   1. src/lib/photo-upload.ts  — the rules shared by the widget, the dashboard,
 *      and both review APIs, executed as compiled TypeScript.
 *   2. public/widget.js         — the public widget form and feed, run in jsdom
 *      against a stubbed API.
 *
 * Usage: node scripts/check-review-photos.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
let checks = 0;
function check(label, condition) {
  checks += 1;
  if (!condition) throw new Error("FAILED: " + label);
  console.log("PASS: " + label);
}

/* ── 1. The shared photo rules ──────────────────────────────────────── */
const source = fs.readFileSync(path.join(root, "src", "lib", "photo-upload.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sandboxModule = { exports: {} };
new Function("exports", "require", "module", "process", compiled)(sandboxModule.exports, require, sandboxModule, process);
const { sanitizePhotos, isPhotoValue, photoSizeKb, clampPhotoLimits, MAX_PHOTOS_LIMIT, MAX_PHOTO_SIZE_LIMIT_KB } = sandboxModule.exports;

// A 1x1 PNG; long enough to reason about the decoded size.
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const limits = { allowPhotos: true, maxPhotos: 3, maxPhotoSizeKb: 400 };

check("a data URL image is accepted", isPhotoValue(png) === true);
check("an https photo link is accepted", isPhotoValue("https://cdn.example.com/a.jpg") === true);
check("a plain http link is rejected", isPhotoValue("http://cdn.example.com/a.jpg") === false);
check("a javascript: URL is rejected", isPhotoValue("javascript:alert(1)") === false);
check("inline HTML is rejected", isPhotoValue('<img src="x">') === false);
check("a non-image data URL is rejected", isPhotoValue("data:text/html;base64,PGgxPmhpPC9oMT4=") === false);

check("no photos is valid", JSON.stringify(sanitizePhotos(undefined, limits)) === JSON.stringify({ photos: [], error: null }));
check("an empty list is valid", JSON.stringify(sanitizePhotos([], limits)) === JSON.stringify({ photos: [], error: null }));
check("valid photos pass through in order", JSON.stringify(sanitizePhotos([png, "https://cdn.example.com/b.jpg"], limits).photos) === JSON.stringify([png, "https://cdn.example.com/b.jpg"]));
check("photos are refused when the project disables them", /disabled/.test(sanitizePhotos([png], { ...limits, allowPhotos: false }).error));
check("the photo count is enforced", /up to 2 photos/.test(sanitizePhotos([png, png, png], { ...limits, maxPhotos: 2 }).error));
const bigPhoto = "data:image/jpeg;base64," + "A".repeat(4096); // ≈3 KB decoded
check("the size limit is enforced", sanitizePhotos([bigPhoto], { ...limits, maxPhotoSizeKb: 1 }).error === "Each photo must be smaller than 1 KB.");
check("the same photo passes a larger limit", sanitizePhotos([bigPhoto], { ...limits, maxPhotoSizeKb: 8 }).error === null);
check("a non-list is ignored, nothing is stored", JSON.stringify(sanitizePhotos(png, limits)) === JSON.stringify({ photos: [], error: null }));
check("a mixed list with a bad value is refused entirely", /JPEG, PNG or WebP/.test(sanitizePhotos([png, "javascript:alert(1)"], limits).error));
check("photoSizeKb decodes the base64 payload", photoSizeKb(png) === Math.ceil(((png.length - png.indexOf(",") - 1) * 3) / 4 / 1024));

const clamped = clampPhotoLimits({ allowPhotos: undefined, maxPhotos: 99, maxPhotoSizeKb: 999999 });
check("clampPhotoLimits caps the count", clamped.maxPhotos === MAX_PHOTOS_LIMIT);
check("clampPhotoLimits caps the size", clamped.maxPhotoSizeKb === MAX_PHOTO_SIZE_LIMIT_KB);
check("clampPhotoLimits raises missing values", JSON.stringify(clampPhotoLimits({})) === JSON.stringify({ allowPhotos: true, maxPhotos: 1, maxPhotoSizeKb: 64 }));

/* ── 2. The public widget ───────────────────────────────────────────── */
const widgetSource = fs.readFileSync(path.join(root, "public", "widget.js"), "utf8");
const PROJECT_ID = "9f1c2a44-6b7e-4d0a-9c31-2f6b8e1d5a70";

function payload(form, reviews) {
  return {
    project: { name: "Zerna Coffee", brandColor: "#617a58", ratingScale: "stars", form, display: { city: false, date: true, name: true, text: true, avatar: true } },
    metrics: { total: reviews.length, averageRating: 4.8 },
    reviews,
  };
}

function bootWidget(body) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error.message));
  virtualConsole.on("error", (message) => errors.push(String(message)));
  const dom = new JSDOM(`<!doctype html><html><body>${body}</body></html>`, { url: "https://zerno.coffee/", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  const script = window.document.createElement("script");
  script.src = "https://cdn.zerno.coffee/widget.js";
  script.setAttribute("data-project-id", PROJECT_ID);
  Object.defineProperty(window.document, "currentScript", { value: script, configurable: true });
  window.document.body.appendChild(script);
  window.__posts = [];
  window.fetch = (url, init) => {
    if (init && init.method === "POST") {
      window.__posts.push({ url: String(url), body: JSON.parse(init.body) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, message: "Thank you for your review!", followUp: null }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(window.__payload) });
  };
  return { window, errors };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const formConfig = { allowAnonymousReviews: true, reviewTextRequired: false, minReviewLength: 10, allowPhotos: true, maxPhotos: 2, maxPhotoSizeKb: 300 };

  // Photos enabled: the form offers the field with the project limits.
  const on = bootWidget('<div data-widget="form"></div>');
  on.window.__payload = payload(formConfig, []);
  on.window.eval(widgetSource);
  await sleep(40);
  const onDoc = on.window.document;
  check("the widget form shows the photo field", /Add photos/.test(onDoc.body.textContent));
  check("the photo hint carries the project limits", /Up to 2 photos, 300 KB each/.test(onDoc.body.textContent));
  const fileInput = onDoc.querySelector('input[type="file"]');
  check("the photo field accepts several images", !!fileInput && fileInput.multiple === true && fileInput.accept === "image/*");
  check("the photo input is hidden behind its button", fileInput.style.display === "none" && !!onDoc.querySelector(".ow-photo-pick"));

  // Submitting without photos still posts an (empty) photo list.
  const ratingChoice = Array.prototype.slice.call(onDoc.querySelectorAll(".ow-rating-choice")).filter((b) => /Rating 5/.test(b.getAttribute("aria-label")))[0];
  ratingChoice.dispatchEvent(new on.window.MouseEvent("click", { bubbles: true }));
  const nameField = onDoc.querySelector('input[name="authorName"]');
  Object.getOwnPropertyDescriptor(on.window.HTMLInputElement.prototype, "value").set.call(nameField, "Test Customer");
  nameField.dispatchEvent(new on.window.Event("input", { bubbles: true }));
  onDoc.querySelector("form.ow-form").dispatchEvent(new on.window.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(40);
  check("the widget posts to the project endpoint", on.window.__posts.length === 1 && on.window.__posts[0].url.indexOf("/api/v1/projects/" + PROJECT_ID + "/reviews") !== -1);
  check("the submission carries the photo list", Array.isArray(on.window.__posts[0].body.photos) && on.window.__posts[0].body.photos.length === 0);

  // Photos disabled: no field at all.
  const off = bootWidget('<div data-widget="form"></div>');
  off.window.__payload = payload({ ...formConfig, allowPhotos: false }, []);
  off.window.eval(widgetSource);
  await sleep(40);
  check("the photo field disappears when photos are disabled", !off.window.document.querySelector('input[type="file"]') && !/Add photos/.test(off.window.document.body.textContent));

  // The feed renders attachments and ignores anything that is not an image.
  const feed = bootWidget('<div data-widget="reviews"></div>');
  feed.window.__payload = payload(formConfig, [
    { id: "r1", authorName: "Valeria M.", rating: 5, sentiment: "positive", content: "Lovely place", photos: [png, "javascript:alert(1)", "data:text/html;base64,AAA="], showText: true, hiddenText: false, companyReply: null, publishedAt: new Date().toISOString(), showAvatar: true },
    { id: "r2", authorName: "Artem S.", rating: 5, sentiment: "positive", content: "Great coffee", photos: [], showText: true, hiddenText: false, companyReply: null, publishedAt: new Date().toISOString(), showAvatar: true },
  ]);
  feed.window.eval(widgetSource);
  await sleep(40);
  const feedDoc = feed.window.document;
  const rendered = feedDoc.querySelectorAll("img.ow-photo");
  check("the feed renders only the real photo", rendered.length === 1 && rendered[0].getAttribute("src") === png);
  check("unsafe photo values are not rendered", !/javascript:/.test(feedDoc.body.innerHTML) && feedDoc.querySelectorAll(".ow-photos").length === 1);
  check("the photo has alternative text", /Customer photo 1/.test(rendered[0].getAttribute("alt")));
  check("no widget errors were thrown", on.errors.length === 0 && off.errors.length === 0 && feed.errors.length === 0);

  console.log("\nOK — " + checks + " checks passed.");
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
