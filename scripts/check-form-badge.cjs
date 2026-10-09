/**
 * Checks the widget's custom form fields, higher-contrast form styling, and the
 * five rating-badge variants, by running public/widget.js in jsdom against a
 * stubbed API.
 *
 * Usage: node scripts/check-form-badge.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.join(__dirname, "..");
const widgetSource = fs.readFileSync(path.join(root, "public", "widget.js"), "utf8");
const PROJECT_ID = "9f1c2a44-6b7e-4d0a-9c31-2f6b8e1d5a70";

let checks = 0;
function check(label, condition) {
  checks += 1;
  if (!condition) throw new Error("FAILED: " + label);
  console.log("PASS: " + label);
}

check("the form stylesheet uses darker borders", widgetSource.includes("border:1px solid #8f959c"));
check("the form placeholder is darkened for contrast", widgetSource.includes(".ow-field::placeholder{color:#5f6368}"));

function payload(form, reviews, badge) {
  return {
    project: { name: "Zerna Coffee", brandColor: "#617a58", ratingScale: "stars", form, display: { city: false, date: true, name: true, text: true, avatar: true } },
    badge: badge || { format: "full" },
    metrics: { total: reviews.length, averageRating: 4.8 },
    reviews,
  };
}
function boot(body) {
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
  window.__payload = payload({ allowAnonymousReviews: true, reviewTextRequired: false, minReviewLength: 10, allowPhotos: false, customFields: [
    { id: "cf-visit", label: "What did you order?", type: "select", options: ["Coffee", "Breakfast", "Dessert"], required: true },
    { id: "cf-table", label: "Table number", type: "text", options: [], required: false },
  ] }, []);
  window.fetch = (url, init) => {
    if (init && init.method === "POST") {
      window.__posts.push({ url: String(url), body: JSON.parse(init.body) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, message: "Thank you!", followUp: null }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(window.__payload) });
  };
  return { window, errors };
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  // Form renders custom fields and posts the chosen values.
  const form = boot('<div data-widget="form"></div>');
  form.window.eval(widgetSource);
  await sleep(40);
  const doc = form.window.document;
  check("the form shows the select custom field", /What did you order\? \*/.test(doc.body.textContent));
  const select = doc.querySelector("select[name='cf-visit']");
  check("the select lists its options", !!select && select.querySelectorAll("option").length === 4 && /Breakfast/.test(select.textContent));
  check("the text custom field is present", !!doc.querySelector("input[name='cf-table']"));
  check("the required select blocks empty submits", select.required === true);

  // Fill and submit.
  const ratingChoice = Array.prototype.slice.call(doc.querySelectorAll(".ow-rating-choice")).filter((b) => /Rating 5/.test(b.getAttribute("aria-label")))[0];
  ratingChoice.dispatchEvent(new form.window.MouseEvent("click", { bubbles: true }));
  const nameField = doc.querySelector("input[name='authorName']");
  Object.getOwnPropertyDescriptor(form.window.HTMLInputElement.prototype, "value").set.call(nameField, "Test Customer");
  nameField.dispatchEvent(new form.window.Event("input", { bubbles: true }));
  select.value = "Breakfast";
  select.dispatchEvent(new form.window.Event("change", { bubbles: true }));
  const table = doc.querySelector("input[name='cf-table']");
  Object.getOwnPropertyDescriptor(form.window.HTMLInputElement.prototype, "value").set.call(table, "12");
  table.dispatchEvent(new form.window.Event("input", { bubbles: true }));
  doc.querySelector("form.ow-form").dispatchEvent(new form.window.Event("submit", { bubbles: true, cancelable: true }));
  await sleep(40);
  check("the submission posts the custom answers", form.window.__posts[0] && form.window.__posts[0].body.customFields["cf-visit"] === "Breakfast" && form.window.__posts[0].body.customFields["cf-table"] === "12");

  // Badge variants.
  const badges = boot('<div data-widget="badge" data-format="number" id="b-number"></div><div data-widget="badge" data-format="stars" id="b-stars"></div><div data-widget="badge" data-format="full" id="b-full"></div><div data-widget="badge" data-format="stars-only" id="b-stars-only"></div><div data-widget="badge" data-format="banner" id="b-banner"></div>');
  badges.window.__payload.metrics.total = 2;
  badges.window.eval(widgetSource);
  await sleep(40);
  const bdoc = badges.window.document;
  const num = bdoc.querySelector("#b-number .ow-badge");
  check("number badge shows only the score", !!num && /4\.8/.test(num.textContent) && !num.textContent.includes("★") && !/reviews/.test(num.textContent));
  const stars = bdoc.querySelector("#b-stars .ow-badge");
  check("stars badge shows score and stars", !!stars && /4\.8/.test(stars.textContent) && stars.textContent.includes("★") && !/reviews/.test(stars.textContent));
  const full = bdoc.querySelector("#b-full .ow-badge");
  check("full badge adds the review count", !!full && /4\.8/.test(full.textContent) && full.textContent.includes("★") && /2 reviews/.test(full.textContent));
  const starsOnly = bdoc.querySelector("#b-stars-only .ow-badge");
  check("stars-only badge hides the score", !!starsOnly && starsOnly.textContent.includes("★") && !/4\.8/.test(starsOnly.textContent));
  const banner = bdoc.querySelector("#b-banner .ow-badge-banner");
  check("banner badge is the wide variant with count", !!banner && /4\.8/.test(banner.textContent) && /verified reviews/.test(banner.textContent));
  check("the badge falls back to the project default format", (bdoc.querySelectorAll(".ow-badge, .ow-badge-banner").length) === 5);

  // Badge appearance settings: size, theme, shape, caption.
  const styled = boot('<div data-widget="badge" id="b-styled"></div><div data-widget="badge" data-format="banner" id="b-styled-banner"></div>');
  styled.window.__payload.badge = { format: "full", size: "large", theme: "dark", shape: "pill", showCount: true, label: "happy guests" };
  styled.window.__payload.metrics.total = 7;
  styled.window.eval(widgetSource);
  await sleep(40);
  const sdoc = styled.window.document;
  const styledBadge = sdoc.querySelector("#b-styled .ow-badge");
  check("the badge size adds its modifier class", !!styledBadge && styledBadge.classList.contains("ow-badge--large"));
  check("the badge theme adds its modifier class", !!styledBadge && styledBadge.classList.contains("ow-badge--dark"));
  check("the badge shape adds its modifier class", !!styledBadge && styledBadge.classList.contains("ow-badge--pill"));
  check("a custom caption replaces the default word", !!styledBadge && /7 happy guests/.test(styledBadge.textContent));
  const styledBanner = sdoc.querySelector("#b-styled-banner .ow-badge-banner");
  check("the banner keeps its divider with a custom caption", !!styledBanner && !!styledBanner.querySelector(".ow-badge-divider") && /7 happy guests/.test(styledBanner.textContent));
  check("the widget stylesheet defines the dark and brand themes", widgetSource.includes(".ow-badge--dark{") && widgetSource.includes(".ow-badge--brand{"));
  check("the widget stylesheet defines the size modifiers", widgetSource.includes(".ow-badge--small{") && widgetSource.includes(".ow-badge--large{"));

  const plain = boot('<div data-widget="badge" id="b-plain"></div><div data-widget="badge" data-format="banner" id="b-plain-banner"></div>');
  plain.window.__payload.badge = { format: "full", size: "small", theme: "light", shape: "square", showCount: false, label: "" };
  plain.window.__payload.metrics.total = 3;
  plain.window.eval(widgetSource);
  await sleep(40);
  const pdoc = plain.window.document;
  const plainBadge = pdoc.querySelector("#b-plain .ow-badge");
  check("hiding the review count removes the caption", !!plainBadge && !plainBadge.querySelector(".ow-badge-caption"));
  check("the defaults add only the non-default modifiers", !!plainBadge && plainBadge.classList.contains("ow-badge--small") && plainBadge.classList.contains("ow-badge--square") && !plainBadge.classList.contains("ow-badge--light"));
  const plainBanner = pdoc.querySelector("#b-plain-banner .ow-badge-banner");
  check("hiding the review count also cleans the banner", !!plainBanner && !plainBanner.querySelector(".ow-badge-caption") && !plainBanner.querySelector(".ow-badge-divider"));

  // The feed shows public custom answers and hides private ones.
  const feed = boot('<div data-widget="reviews"></div>');
  feed.window.__payload = payload({ allowPhotos: false, customFields: [] }, [
    { id: "r1", authorName: "Valeria M.", rating: 5, sentiment: "positive", content: "Lovely", photos: [], customFields: [{ label: "What did you order?", value: "Coffee" }], showText: true, hiddenText: false, companyReply: null, publishedAt: new Date().toISOString(), showAvatar: true },
  ]);
  feed.window.eval(widgetSource);
  await sleep(40);
  check("the feed shows the public custom answer", /What did you order\?: Coffee/.test(feed.window.document.body.textContent));

  // Standard fields can be hidden from the form.
  const hidden = boot('<div data-widget="form"></div>');
  hidden.window.__payload = payload({ allowAnonymousReviews: false, reviewTextRequired: false, minReviewLength: 10, allowPhotos: false, showEmail: false, showCity: false, showComment: false, customFields: [] }, []);
  hidden.window.eval(widgetSource);
  await sleep(40);
  const hiddenDoc = hidden.window.document;
  check("hiding email removes the email input", !hiddenDoc.querySelector("input[name='authorEmail']"));
  check("hiding city removes the city input", !hiddenDoc.querySelector("input[name='authorCity']"));
  check("hiding the comment removes the textarea", !hiddenDoc.querySelector("textarea[name='content']"));
  check("name and rating stay in the form", !!hiddenDoc.querySelector("input[name='authorName']") && hiddenDoc.querySelectorAll(".ow-rating-choice").length === 5);

  console.log("\nOK — " + checks + " checks passed.");
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
