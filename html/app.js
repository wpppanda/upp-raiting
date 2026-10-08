/* ==========================================================================
   up. — Business reputation · standalone HTML prototype (no build step)
   Mirrors src/app/dashboard.tsx + src/components/reputation-hub.tsx +
   src/components/widget-drawer.tsx + public/widget.js.
   ========================================================================== */
(function () {
  "use strict";

  /* ── Demo project (mirrors the defaults in src/db/schema.ts) ───────────── */
  var PROJECT = {
    id: "9f1c2a44-6b7e-4d0a-9c31-2f6b8e1d5a70",
    name: "Zerna Coffee",
    domain: "zerno.coffee",
    allowedDomains: ["shop.zerno.coffee", "*.zerna.app"],
    brandColor: "#617a58",
    timezone: "Europe/Moscow",
    ratingScale: "stars",
    googleReviewUrl: "https://g.page/r/zerna-coffee/review",
    invitePositiveToExternal: true,

    positiveThreshold: 5,
    neutralThreshold: 4,
    positivePublishMode: "delayed",
    neutralPublishMode: "manual",
    negativePublishMode: "manual",
    positiveDelayMinutes: 120,
    neutralDelayMinutes: 360,
    negativeDelayMinutes: 0,

    positiveNotify: false,
    neutralNotify: true,
    negativeNotify: true,
    positiveNotifyChannels: { email: { enabled: true, value: "hello@zerno.coffee" }, whatsapp: { enabled: false, value: "" }, sms: { enabled: false, value: "" } },
    neutralNotifyChannels: { email: { enabled: true, value: "hello@zerno.coffee" }, whatsapp: { enabled: true, value: "+1 555 010 2030" }, sms: { enabled: false, value: "" } },
    negativeNotifyChannels: { email: { enabled: true, value: "owner@zerno.coffee" }, whatsapp: { enabled: false, value: "" }, sms: { enabled: true, value: "+1 555 010 2030" } },

    positiveAutoReplyEnabled: true,
    neutralAutoReplyEnabled: false,
    negativeAutoReplyEnabled: false,
    positiveAutoReplyTemplate: "Thank you for your great review! We look forward to welcoming you back.",
    neutralAutoReplyTemplate: "Thank you for your feedback! Please let us know how we can improve.",
    negativeAutoReplyTemplate: "We are sorry about your experience. Please contact our support team so we can make it right.",
    replyRequiredNegative: true,
    replySlaHours: 24,
    replySignature: "Zerna Coffee support team",

    reminders: [
      { id: "rem-3d", delayMinutes: 4320, channel: "email", target: "", message: "Hello {name}! We would love to hear about your experience. Leave a review here: {link}", enabled: true },
      { id: "rem-7d", delayMinutes: 10080, channel: "whatsapp", target: "+1 555 010 2030", message: "Hello {name}, your table is waiting — and so is your review: {link}", enabled: true },
      { id: "rem-14d", delayMinutes: 20160, channel: "sms", target: "", message: "Hi {name}! One minute for a review? {link}", enabled: false }
    ],

    allowAnonymousReviews: true,
    reviewTextRequired: false,
    minReviewLength: 10,
    publicShowAvatar: true,
    publicShowName: true,
    publicShowCity: false,
    publicShowDate: true,
    publicShowText: true,

    neutralSupportContact: true,
    neutralSupportChat: false,
    negativeSupportContact: true,
    negativeSupportChat: true,
    supportEmail: "support@zerno.coffee",
    supportChatUrl: "https://wa.me/15550102030",
    supportOfferText: "We are sorry about this experience. Please contact our support team — we will make it right.",

    neutralBoostPositive: true,
    negativeLookbackEnabled: true,
    negativeLookbackCount: 3,
    stopWords: "spam, scam",
    maxReviewsPerIp: 3,

    smartQueueEnabled: true,
    minIntervalMinutes: 15,
    maxPerHour: 10,
    maxPerDay: 50,
    maxNegativeShare: 20,
    randomizeOrder: false,
    primeTimeBoost: true,
    hideNegativeText: false
  };

  /* ── Demo reviews (mirrors src/lib/dashboard-data.ts) ──────────────────── */
  function hoursAgo(h) { return new Date(Date.now() - h * 3600 * 1000).toISOString(); }
  var seq = 0;
  function review(name, email, city, rating, content, status, h, extra) {
    seq += 1;
    return Object.assign({
      id: "rev-" + String(seq).padStart(3, "0"),
      authorName: name, authorEmail: email, authorCity: city,
      isAnonymous: false, rating: rating, sentiment: sentimentOf(rating, PROJECT),
      content: content, source: "Website widget", status: status,
      createdAt: hoursAgo(h), scheduledAt: null, publishedAt: status === "published" ? hoursAgo(h) : null,
      companyReply: null, replyAt: null, hiddenText: false, pinned: false
    }, extra || {});
  }
  var REVIEWS = [
    review("Valeria M.", "valeria@example.com", "New York", 5, "Such a cozy spot — the matcha and the pour-over are love. I will definitely come back!", "published", 0.6, { companyReply: "Valeria, thank you for the warm words! We look forward to seeing you again ☕", replyAt: hoursAgo(0.4), pinned: true }),
    review("Artem S.", "artem@example.com", "Chicago", 5, "The best cappuccino in the city. The barista helped me pick a bean, and now I come here first.", "published", 4, { companyReply: "Artem, glad we helped you find your taste. See you soon!" }),
    review("Anna K.", "anna@example.com", "Boston", 4, "Delicious and atmospheric, but we waited a bit long for the order. Otherwise everything was great.", "published", 26, { companyReply: "Anna, thanks for the feedback — we have already discussed serving speed with the team." }),
    review("Maria R.", "maria@example.com", "Seattle", 5, "Zerna has become my new Sunday tradition. Thank you for the cozy atmosphere and great coffee!", "published", 50),
    review("Pavel T.", "pavel@example.com", "Austin", 3, "The dessert was not very fresh. I hope you will fix this. The coffee itself was excellent.", "published", 73, { companyReply: "Pavel, we are sorry about this experience. Please reach out — we want to make it right." }),
    review("Polina D.", "polina@example.com", "Portland", 5, "Very attentive service and an incredibly delicious raf. Beautiful and calm inside.", "published", 101, { isAnonymous: true }),
    review("Sergey V.", "sergey@example.com", "Denver", 5, "Great place, beautiful interior, and excellent coffee. I stopped by on a whim — I will come back on purpose.", "queued", 0.4, { scheduledAt: hoursAgo(-2) }),
    review("Kristina L.", "kristina@example.com", "San Diego", 5, "Very pleasant staff. I stopped by for a minute and stayed for a whole hour.", "queued", 1, { scheduledAt: hoursAgo(-1.5) }),
    review("Ivan K.", "ivan@example.com", "Miami", 1, "I waited almost forty minutes for my order and the coffee went cold. I am very disappointed with the service.", "pending", 1.2),
    review("Marina B.", "marina@example.com", "Los Angeles", 3, "Everything was fine, but the tables were full and I had to wait at the entrance.", "pending", 2.4),
    review("Roman F.", "roman@example.com", "Dallas", 2, "I expected more from breakfast: the dishes were served cold and the waiter did not notice.", "pending", 3.1),
    review("Olga N.", "olga@example.com", "Philadelphia", 4, "Good coffee, but I would like more sugar-free syrup options.", "pending", 5.5),
    review("Spam Bot", "spam@example.com", "Nowhere", 5, "Cheap watches and casino bonus — visit my site now!", "spam", 9)
  ];

  /* ── Helpers ───────────────────────────────────────────────────────────── */
  function esc(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function sentimentOf(rating, project) {
    return rating >= project.positiveThreshold ? "positive" : rating >= project.neutralThreshold ? "neutral" : "negative";
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function stars(value) {
    var n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
    return '<span class="stars">' + "★".repeat(n) + '<span class="off">' + "★".repeat(5 - n) + "</span></span>";
  }
  function date(value) {
    if (!value) return "";
    try { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)); }
    catch (e) { return ""; }
  }
  function initials(name) {
    return String(name || "A").split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join("") || "A";
  }
  function rangeText(low, high) { return low > high ? "None" : low === high ? low + " ★" : low + "–" + high + " ★"; }
  function rangeOf(kind, project) {
    if (kind === "positive") return [project.positiveThreshold, 5];
    if (kind === "neutral") return [project.neutralThreshold, project.positiveThreshold - 1];
    return [1, project.neutralThreshold - 1];
  }
  function classify(rating, project) { return sentimentOf(rating, project); }
  var UNITS = [
    { id: "minutes", label: "Minutes", multiplier: 1 },
    { id: "hours", label: "Hours", multiplier: 60 },
    { id: "days", label: "Calendar days", multiplier: 1440 },
    { id: "weeks", label: "Weeks", multiplier: 10080 }
  ];
  function inferUnit(minutes) {
    if (minutes > 0 && minutes % 10080 === 0) return "weeks";
    if (minutes > 0 && minutes % 1440 === 0) return "days";
    if (minutes > 0 && minutes % 60 === 0) return "hours";
    return "minutes";
  }
  function multiplier(unit) {
    var found = UNITS.filter(function (u) { return u.id === unit; })[0];
    return found ? found.multiplier : 1;
  }
  var CHANNELS = [
    { key: "email", label: "Email", type: "email", placeholder: "admin@company.com", noun: "address" },
    { key: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "+1 555 000 0000", noun: "number" },
    { key: "sms", label: "SMS", type: "tel", placeholder: "+1 555 000 0000", noun: "number" }
  ];
  var COLORS = {
    positive: { label: "Positive", dot: "#2bb67c" },
    neutral: { label: "Neutral", dot: "#e7a63b" },
    negative: { label: "Negative", dot: "#dd7065" }
  };
  /** Mirrors buildFollowUp() in src/lib/follow-up.ts. */
  function followUpFor(sentiment, project) {
    if (sentiment === "positive") {
      var url = String(project.googleReviewUrl || "").trim();
      return { sentiment: sentiment, support: null, google: project.invitePositiveToExternal && url ? { url: url } : null };
    }
    var contact = sentiment === "neutral" ? project.neutralSupportContact : project.negativeSupportContact;
    var chat = sentiment === "neutral" ? project.neutralSupportChat : project.negativeSupportChat;
    var hasContact = contact && String(project.supportEmail || "").trim().length > 0;
    var hasChat = chat && String(project.supportChatUrl || "").trim().length > 0;
    return {
      sentiment: sentiment,
      support: hasContact || hasChat
        ? { contact: hasContact, chat: hasChat, email: String(project.supportEmail).trim(), chatUrl: String(project.supportChatUrl).trim(), text: project.supportOfferText }
        : null,
      google: null
    };
  }
  function publishedReviews() { return REVIEWS.filter(function (r) { return r.status === "published"; }); }
  function metrics() {
    var pub = publishedReviews();
    var total = pub.length;
    var avg = total ? pub.reduce(function (sum, r) { return sum + r.rating; }, 0) / total : 0;
    return {
      total: REVIEWS.length,
      published: total,
      pending: REVIEWS.filter(function (r) { return r.status === "pending"; }).length,
      queued: REVIEWS.filter(function (r) { return r.status === "queued"; }).length,
      spam: REVIEWS.filter(function (r) { return r.status === "spam" || r.status === "rejected"; }).length,
      averageRating: Math.round(avg * 10) / 10,
      positiveShare: total ? Math.round(pub.filter(function (r) { return r.sentiment === "positive"; }).length / total * 100) : 0
    };
  }
  function toast(message) {
    var box = document.getElementById("toasts");
    var node = document.createElement("div");
    node.className = "toast";
    node.textContent = message;
    box.appendChild(node);
    window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 2600);
  }

  /* ── Icons ─────────────────────────────────────────────────────────────── */
  var PATHS = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />',
    people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />',
    dollar: '<rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /><circle cx="12" cy="14" r="2" />',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />',
    document: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />',
    split: '<rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />',
    gear: '<circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />',
    star: '<path d="M12 2l2.9 6.26 6.6.56-5 4.36 1.5 6.45L12 16.9 5.99 19.63l1.5-6.45-5-4.36 6.6-.56L12 2z" />'
  };
  function icon(name, size, filled) {
    return '<svg width="' + (size || 20) + '" height="' + (size || 20) + '" viewBox="0 0 24 24" fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + PATHS[name] + "</svg>";
  }
  var GOOGLE_G = '<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">' +
    '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
    '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
    '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
    '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

  /* ── App state ─────────────────────────────────────────────────────────── */
  var NAV = [
    { view: "overview", icon: "home", title: "Overview" },
    { view: "queue", icon: "calendar", title: "Publication queue" },
    { view: "moderation", icon: "bell", title: "Moderation" },
    { view: "clients", icon: "user", title: "Review authors" },
    { view: "channels", icon: "pin", title: "Domains and channels" },
    { view: "team", icon: "people", title: "Team" },
    { view: "reviews", icon: "dollar", title: "All reviews" },
    { view: "reputation", icon: "star", title: "Business reputation — all settings in one place", special: true },
    { view: "messages", icon: "mail", title: "Invitations and reminders" },
    { view: "analytics", icon: "document", title: "Analytics and reports" },
    { view: "widgets", icon: "split", title: "Widgets and embed code" },
    { view: "settings", icon: "chat", title: "Feedback and QR code" }
  ];
  var S = {
    view: "reviews",
    sidebar: true,
    topTab: "out",
    filter: "all",
    search: "",
    stats: false,
    selected: {},
    rep: { section: "protection", category: "positive", draft: clone(PROJECT), units: {}, messageId: null, messageDraft: "" },
    widgetType: "reviews",
    sandbox: { rating: 5, name: "", email: "", city: "", text: "", anonymous: false },
    sandboxThanks: null,
    preview: { open: false, kind: "reviews", after: "negative", thanks: null },
    actions: { open: false, id: null, reply: "" },
    composer: { open: false, rating: 5, name: "", email: "", text: "" },
    settingsTab: "qrcode",
    analyticsTab: "usage"
  };
  PROJECT.reminders.forEach(function (r) { S.rep.units[r.id] = inferUnit(r.delayMinutes); });

  function repDirty() { return JSON.stringify(S.rep.draft) !== JSON.stringify(PROJECT); }
  function saveReputation() {
    PROJECT = clone(S.rep.draft);
    PROJECT.allowedDomains = (PROJECT.allowedDomains || []).map(function (d) {
      return String(d || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+.*$/, "");
    }).filter(function (d, i, all) { return d && all.indexOf(d) === i; });
    S.rep.draft = clone(PROJECT);
    window.UPP.PROJECT = PROJECT;
    REVIEWS.forEach(function (r) { r.sentiment = sentimentOf(r.rating, PROJECT); });
    toast("Reputation settings saved.");
    render();
  }
  function discardReputation() {
    S.rep.draft = clone(PROJECT);
    S.rep.units = {};
    PROJECT.reminders.forEach(function (r) { S.rep.units[r.id] = inferUnit(r.delayMinutes); });
    render();
  }
  window.UPP = { PROJECT: PROJECT, REVIEWS: REVIEWS, state: S };

  /* ── Small render helpers ──────────────────────────────────────────────── */
  function help(label, text) {
    return '<span class="rep-help-wrap" data-help><button type="button" class="rep-help" aria-label="Help: ' + esc(label) + '" aria-expanded="false" data-act="help">?</button>' +
      '<span class="rep-tooltip" role="tooltip">' + esc(text) + "</span></span>";
  }
  function repSection(title, description, body, action) {
    return '<section class="rep-section"><div class="rep-section-header"><div><div class="rep-section-title"><h3>' + esc(title) + "</h3>" +
      (description ? help(title, description) : "") + '</div>' +
      (description ? '<p class="rep-section-description">' + esc(description) + "</p>" : "") + "</div>" + (action || "") + "</div>" + body + "</section>";
  }
  function row(label, control, opts) {
    opts = opts || {};
    return '<div class="rep-row ' + (opts.className || "") + '"><div class="rep-label"><label>' + esc(label) + "</label>" +
      (opts.help ? help(label, opts.help) : "") +
      (opts.description ? '<span class="rep-label-description">' + esc(opts.description) + "</span>" : "") +
      '</div><div class="rep-control">' + control + (opts.hint ? '<p class="rep-hint' + (opts.warn ? " rep-warning" : "") + '">' + esc(opts.hint) + "</p>" : "") + "</div></div>";
  }
  function sw(label, checked, act, arg, disabled) {
    return '<button type="button" class="rep-switch" role="switch" aria-checked="' + (checked ? "true" : "false") + '" aria-label="' + esc(label) + '"' +
      (disabled ? " disabled" : "") + ' data-act="' + act + '"' + (arg ? ' data-arg="' + esc(arg) + '"' : "") +
      '><span class="rep-switch-track"></span><span class="rep-switch-thumb"></span></button>';
  }
  function switchRow(label, checked, act, arg, helpText) {
    return row(label, sw(label, checked, act, arg), { className: "rep-switch-row", help: helpText });
  }
  function numberField(value, act, arg, opts) {
    opts = opts || {};
    return '<input class="rep-input ' + (opts.short ? "short" : "") + '" type="number" value="' + esc(value) + '"' +
      (opts.min !== undefined ? ' min="' + opts.min + '"' : "") + (opts.max !== undefined ? ' max="' + opts.max + '"' : "") +
      ' data-act="' + act + '"' + (arg ? ' data-arg="' + esc(arg) + '"' : "") + ' />';
  }
  function textField(value, act, arg, opts) {
    opts = opts || {};
    return '<input class="rep-input" type="' + (opts.type || "text") + '" value="' + esc(value) + '" placeholder="' + esc(opts.placeholder || "") + '"' +
      ' data-act="' + act + '"' + (arg ? ' data-arg="' + esc(arg) + '"' : "") + ' />';
  }
  function areaField(value, act, arg, opts) {
    opts = opts || {};
    return '<textarea class="rep-textarea" rows="' + (opts.rows || 3) + '" placeholder="' + esc(opts.placeholder || "") + '"' +
      ' data-act="' + act + '"' + (arg ? ' data-arg="' + esc(arg) + '"' : "") + ">" + esc(value) + "</textarea>";
  }
  function selectField(value, options, act, arg, className) {
    return '<select class="rep-select ' + (className || "") + '" data-act="' + act + '"' + (arg ? ' data-arg="' + esc(arg) + '"' : "") + ">" +
      options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") +
      "</select>";
  }
  function statusBadge(r) {
    if (r.status === "pending") return '<span class="badge pending">Pending</span>';
    if (r.status === "queued") return '<span class="badge queued">Queued</span>';
    if (r.status === "rejected") return '<span class="badge rejected">Rejected</span>';
    if (r.status === "spam") return '<span class="badge spam">Spam</span>';
    return '<span class="badge ' + r.sentiment + '">' + COLORS[r.sentiment].label + "</span>";
  }
  function scopedReviews() {
    return REVIEWS.filter(function (r) { return S.topTab === "out" ? r.status === "published" : r.status !== "published"; });
  }
  function filteredReviews() {
    var q = S.search.trim().toLowerCase();
    return scopedReviews().filter(function (r) {
      var matches = !q || r.authorName.toLowerCase().indexOf(q) >= 0 || r.content.toLowerCase().indexOf(q) >= 0 ||
        (r.authorEmail || "").toLowerCase().indexOf(q) >= 0 || r.id.toLowerCase().indexOf(q) >= 0;
      if (!matches) return false;
      if (S.filter === "all") return true;
      if (S.filter === "pending") return r.status === "pending";
      if (S.filter === "queued") return r.status === "queued";
      if (S.filter === "positive") return r.sentiment === "positive";
      if (S.filter === "neutral") return r.sentiment === "neutral";
      if (S.filter === "negative") return r.sentiment === "negative";
      if (S.filter === "spam") return r.status === "spam" || r.status === "rejected";
      return true;
    });
  }
  function tabCounts() {
    var list = scopedReviews();
    function count(fn) { return list.filter(fn).length; }
    return {
      all: list.length,
      pending: count(function (r) { return r.status === "pending"; }),
      queued: count(function (r) { return r.status === "queued"; }),
      positive: count(function (r) { return r.sentiment === "positive"; }),
      neutral: count(function (r) { return r.sentiment === "neutral"; }),
      negative: count(function (r) { return r.sentiment === "negative"; }),
      spam: count(function (r) { return r.status === "spam" || r.status === "rejected"; })
    };
  }

  /* ── Sidebar ───────────────────────────────────────────────────────────── */
  function renderSidebar() {
    var el = document.getElementById("sidebar");
    el.className = "app-reference-navigation" + (S.sidebar ? "" : " collapsed");
    el.innerHTML = NAV.map(function (item) {
      return '<button type="button" class="nav-item ' + (item.special ? "reputation " : "") + (S.view === item.view ? "active" : "") + '"' +
        ' data-act="nav" data-view="' + item.view + '" title="' + esc(item.title) + '" aria-label="' + esc(item.title) + '">' +
        icon(item.icon, 20, item.special && S.view === item.view) +
        (item.special ? '<span class="badge">new</span>' : "") + "</button>";
    }).join("") + '<div class="nav-spacer"></div>' +
      '<button type="button" class="nav-item ' + (S.view === "reputation" ? "active" : "") + '" data-act="nav" data-view="reputation" title="Business reputation settings" aria-label="Business reputation settings">' + icon("gear") + "</button>";
    document.getElementById("pending-badge").textContent = String(metrics().pending);
    document.getElementById("header-company").textContent = PROJECT.name;
  }

  /* ── View: Overview ────────────────────────────────────────────────────── */
  function viewOverview() {
    var m = metrics();
    var dist = [5, 4, 3, 2, 1].map(function (value) {
      return { rating: value, count: publishedReviews().filter(function (r) { return r.rating === value; }).length };
    });
    var max = Math.max(1, dist.reduce(function (a, b) { return Math.max(a, b.count); }, 0));
    var week = [12, 18, 9, 22, 17, 26, 21];
    var weekMax = Math.max.apply(null, week);
    return '<h1 class="page-title">Overview</h1><p class="page-sub">How ' + esc(PROJECT.name) + " is seen by customers right now.</p>" +
      '<div class="grid cols-4">' +
      '<div class="kpi"><div class="value">' + m.averageRating.toFixed(1) + '</div><div class="caption">Average rating · ' + m.published + " published</div></div>" +
      '<div class="kpi"><div class="value">' + m.positiveShare + '%</div><div class="caption">Share of positive reviews</div></div>' +
      '<div class="kpi"><div class="value">' + m.pending + '</div><div class="caption">Awaiting moderation</div></div>' +
      '<div class="kpi"><div class="value">' + m.queued + '</div><div class="caption">In the publication queue</div></div>' +
      "</div>" +
      '<div class="card" style="margin-top:20px"><h2>Rating distribution</h2><p class="sub">Published reviews by star rating.</p>' +
      dist.map(function (d) {
        return '<div class="bar-row" style="margin-top:8px"><span>' + d.rating + " ★</span>" +
          '<span class="bar"><i style="width:' + Math.round(d.count / max * 100) + '%"></i></span><span>' + d.count + "</span></div>";
      }).join("") + "</div>" +
      '<div class="card"><h2>Reviews per day</h2><p class="sub">Last 7 days.</p><div class="spark">' +
      week.map(function (v) { return '<div style="height:' + Math.round(v / weekMax * 100) + '%" title="' + v + ' reviews"></div>'; }).join("") +
      '</div></div>' +
      '<div class="card"><div class="between"><h2>Latest reviews</h2><button class="btn ghost-blue" data-act="nav" data-view="reviews">Open all reviews</button></div>' +
      '<div class="stack" style="margin-top:14px">' +
      REVIEWS.slice(0, 4).map(function (r) {
        return '<div class="review-card"><div class="who"><strong style="font-size:12px">' + esc(r.isAnonymous && PROJECT.publicShowName ? "Anonymous" : r.authorName) + "</strong>" + stars(r.rating) + "</div>" +
          '<p class="text">' + esc(r.content) + "</p>" +
          '<p class="meta">' + esc(date(r.createdAt)) + " · " + statusBadge(r) + "</p></div>";
      }).join("") + "</div></div>";
  }

  /* ── View: Reviews table ───────────────────────────────────────────────── */
  function statsPanel() {
    var m = metrics();
    var bySentiment = ["positive", "neutral", "negative"].map(function (kind) {
      return { kind: kind, count: publishedReviews().filter(function (r) { return r.sentiment === kind; }).length };
    });
    return '<div class="card"><h2>Statistics</h2><p class="sub">Aggregated from published reviews.</p>' +
      '<div class="grid cols-4">' +
      '<div class="kpi"><div class="value">' + m.averageRating.toFixed(1) + "</div><div class=\"caption\">Average rating</div></div>" +
      bySentiment.map(function (item) {
        return '<div class="kpi"><div class="value">' + item.count + '</div><div class="caption">' + COLORS[item.kind].label + " reviews</div></div>";
      }).join("") +
      "</div></div>";
  }
  function viewReviews() {
    var counts = tabCounts();
    var rows = filteredReviews();
    var tabs = [["all", "All"], ["pending", "Pending"], ["queued", "Queued"], ["positive", "Positive"], ["neutral", "Neutral"], ["negative", "Negative"], ["spam", "Spam"]];
    var allSelected = rows.length > 0 && rows.every(function (r) { return S.selected[r.id]; });
    return '<div class="between" style="margin-bottom:8px">' +
      '<div class="row">' +
      '<button class="pill ' + (S.topTab === "out" ? "active" : "") + '" data-act="toptab" data-arg="out">Published<span class="count">' + REVIEWS.filter(function (r) { return r.status === "published"; }).length + "</span></button>" +
      '<button class="pill ' + (S.topTab === "in" ? "active" : "") + '" data-act="toptab" data-arg="in">Incoming<span class="count">' + REVIEWS.filter(function (r) { return r.status !== "published"; }).length + "</span></button>" +
      '<button class="btn" data-act="filters">Filters<span class="badge info">' + (S.filter === "all" ? 0 : 1) + "</span></button>" +
      "</div>" +
      '<div class="row">' +
      '<button class="btn ' + (S.stats ? "dark" : "") + '" data-act="toggle-stats">' + (S.stats ? "Hide statistics" : "Show statistics") + "</button>" +
      '<button class="btn primary square" data-act="open-composer" title="Add review">+</button>' +
      "</div></div>" +
      '<p class="page-sub">' + (S.topTab === "out" ? "Published — reviews currently visible on your website." : "Incoming — reviews awaiting moderation, queued, rejected, or marked as spam.") + "</p>" +
      (S.stats ? statsPanel() : "") +
      '<div class="card"><div class="tabs">' +
      tabs.map(function (t) {
        return '<button class="tab ' + (S.filter === t[0] ? "active" : "") + '" data-act="filter" data-arg="' + t[0] + '">' + t[1] + '<span class="count">' + counts[t[0]] + "</span></button>";
      }).join("") + "</div>" +
      '<div class="between" style="padding:12px 8px 0">' +
      '<input class="field" style="max-width:260px" type="search" placeholder="Search author, text, ID…" value="' + esc(S.search) + '" data-act="search" aria-label="Search reviews" />' +
      '<div class="row"><button class="btn small" data-act="export-csv">Export CSV</button><button class="btn small" data-act="print">Print</button></div>' +
      "</div>" +
      '<div style="overflow-x:auto;margin-top:8px"><table class="data"><thead><tr>' +
      '<th style="width:40px"><input type="checkbox" data-act="select-all" ' + (allSelected ? "checked" : "") + ' aria-label="Select all" /></th>' +
      "<th>Author</th><th style=\"min-width:280px\">Review</th><th>Date</th><th>Status</th><th>Rating</th><th style=\"text-align:right\">Actions</th>" +
      "</tr></thead><tbody>" +
      (rows.length === 0
        ? '<tr><td colspan="7" class="empty">No reviews match your filters.</td></tr>'
        : rows.map(function (r) {
          return '<tr class="' + (S.selected[r.id] ? "selected" : "") + '">' +
            '<td><input type="checkbox" data-act="select-row" data-arg="' + r.id + '" ' + (S.selected[r.id] ? "checked" : "") + ' aria-label="Select ' + esc(r.authorName) + '" /></td>' +
            "<td><div style=\"font-weight:600\">" + esc(r.authorName) + "</div><div class=\"tiny muted\">" + esc(r.authorEmail || "") + (r.authorCity ? " · " + esc(r.authorCity) : "") + "</div>" +
            (r.isAnonymous ? '<span class="badge spam" style="margin-top:4px">Publicly anonymous</span>' : "") + "</td>" +
            "<td><p style=\"font-size:13px;max-width:420px\">" + esc(r.hiddenText ? "Text hidden by the moderator" : r.content) + "</p>" +
            (r.companyReply ? '<p class="tiny muted" style="margin-top:4px"><strong>Reply:</strong> ' + esc(r.companyReply) + "</p>" : "") + "</td>" +
            "<td class=\"muted\" style=\"white-space:nowrap\">" + esc(date(r.createdAt)) + "</td>" +
            "<td>" + statusBadge(r) + (r.pinned ? ' <span class="badge info">Pinned</span>' : "") + "</td>" +
            "<td>" + stars(r.rating) + ' <span class="tiny muted">(' + r.rating + "/5)</span></td>" +
            '<td style="text-align:right"><button class="btn small" data-act="open-actions" data-arg="' + r.id + '">Actions</button></td>' +
            "</tr>";
        }).join("")) +
      "</tbody></table></div></div>";
  }

  /* ── View: Queue ───────────────────────────────────────────────────────── */
  function viewQueue() {
    var queued = REVIEWS.filter(function (r) { return r.status === "queued"; });
    return '<div class="between"><div><h1 class="page-title">Publication queue</h1>' +
      '<p class="page-sub">Manage queued reviews and publish them according to your smart queue rules.</p></div>' +
      '<div class="row"><span class="tiny" style="font-weight:600">Smart queue:</span>' +
      '<button class="btn ' + (PROJECT.smartQueueEnabled ? "primary" : "") + '" data-act="toggle-smart-queue">' + (PROJECT.smartQueueEnabled ? "✓ Enabled" : "Disabled") + "</button></div></div>" +
      '<div class="card"><h2>Queued reviews</h2><p class="sub">Ordered by their scheduled publication time.</p>' +
      (queued.length === 0 ? '<div class="empty">There are no reviews waiting in the queue.</div>'
        : '<div class="stack">' + queued.map(function (r) {
          return '<div class="between" style="padding:12px 0;border-bottom:1px solid #f1f5f9"><div>' +
            '<div class="row"><strong style="font-size:12px">' + esc(r.authorName) + "</strong>" + stars(r.rating) + '<span class="badge queued">Queued</span></div>' +
            '<p class="tiny muted" style="margin-top:4px;max-width:640px">' + esc(r.content) + "</p>" +
            '<p class="tiny muted">Scheduled: ' + esc(r.scheduledAt ? date(r.scheduledAt) : "as soon as the delay ends") + "</p></div>" +
            '<button class="btn primary small" data-act="review-action" data-arg="publish" data-id="' + r.id + '">Publish now</button></div>';
        }).join("") + "</div>") +
      "</div>" +
      '<div class="card"><h2>Queue rules</h2><p class="sub">These limits are configured in Business reputation → Queue.</p>' +
      '<div class="chips">' +
      '<span class="chip">Minimum interval: ' + PROJECT.minIntervalMinutes + " min</span>" +
      '<span class="chip">Max per hour: ' + PROJECT.maxPerHour + "</span>" +
      '<span class="chip">Max per day: ' + PROJECT.maxPerDay + "</span>" +
      '<span class="chip">Daily negative limit: ' + PROJECT.maxNegativeShare + "%</span>" +
      '<span class="chip ' + (PROJECT.neutralBoostPositive ? "on" : "") + '">Neutral → boost positive</span>' +
      '<span class="chip ' + (PROJECT.negativeLookbackEnabled ? "on" : "") + '">Negative lookback: ' + PROJECT.negativeLookbackCount + "</span>" +
      "</div>" +
      '<div class="row" style="margin-top:16px"><button class="btn ghost-blue" data-act="nav" data-view="reputation">Open queue settings →</button></div></div>';
  }

  /* ── View: Moderation ──────────────────────────────────────────────────── */
  function viewModeration() {
    var pending = REVIEWS.filter(function (r) { return r.status === "pending"; });
    return '<h1 class="page-title">Moderation</h1><p class="page-sub">Review feedback that needs approval before it appears on your website.</p>' +
      (pending.length === 0
        ? '<div class="card center" style="padding:48px"><div style="font-size:24px">🎉</div><h2 style="margin-top:8px">All reviews have been checked!</h2><p class="sub" style="margin:6px 0 0">New reviews awaiting moderation will appear here.</p></div>'
        : pending.map(function (r) {
          return '<div class="card"><div class="between"><div class="row"><strong>' + esc(r.authorName) + "</strong>" + stars(r.rating) +
            '<span class="badge ' + r.sentiment + '">' + r.sentiment.toUpperCase() + "</span></div>" +
            '<span class="tiny muted">' + esc(new Date(r.createdAt).toLocaleString("en-US")) + "</span></div>" +
            '<p style="margin:12px 0;padding:12px;border:1px solid #f1f5f9;border-radius:10px;background:#f8fafc;font-size:13px">' + esc(r.content) + "</p>" +
            '<div class="between"><button class="btn small ghost-blue" data-act="open-actions" data-arg="' + r.id + '">Reply to the customer</button>' +
            '<div class="row">' +
            '<button class="btn small" data-act="review-action" data-arg="reject" data-id="' + r.id + '">Reject</button>' +
            '<button class="btn small" data-act="review-action" data-arg="spam" data-id="' + r.id + '">Spam</button>' +
            '<button class="btn small primary" data-act="review-action" data-arg="approve" data-id="' + r.id + '">Approve</button>' +
            "</div></div></div>";
        }).join(""));
  }

  /* ── View: Business reputation hub ─────────────────────────────────────── */
  var REP_MENU = [
    { id: "protection", label: "Protection & Settings" },
    { id: "reviews", label: "Reviews" },
    { id: "reminders", label: "Reminders" },
    { id: "queue", label: "Queue" }
  ];
  var REP_COPY = {
    protection: { title: "Protection & Settings", description: "Control the widget domains, public widget fields, form privacy, Google reviews, and spam filters." },
    reviews: { title: "Reviews", description: "Choose how customer reviews are classified, published, and answered." },
    reminders: { title: "Reminders", description: "Set up automatic review invitations after a customer visit or order." },
    queue: { title: "Publication queue", description: "Control publication limits and priority rules for queued reviews." }
  };
  var MODE_HINTS = {
    instant: "Publish immediately after submission.",
    delayed: "Publish automatically when the delay ends.",
    manual: "A moderator approves the review before it is published."
  };

  function domainList(draft) {
    var domains = draft.allowedDomains || [];
    return row("Allowed domains for the widget",
      '<div class="rep-domain-list">' +
      '<div class="rep-domain-chip is-primary"><span>' + esc(draft.domain || "—") + "</span><em>primary</em></div>" +
      domains.map(function (d, i) {
        return '<div class="rep-domain-chip"><input type="text" spellcheck="false" placeholder="example.com" value="' + esc(d) +
          '" aria-label="Allowed widget domain ' + (i + 1) + '" data-act="domain-edit" data-arg="' + i + '" />' +
          '<button type="button" class="rep-domain-remove" aria-label="Remove domain ' + (i + 1) + '" data-act="domain-remove" data-arg="' + i + '">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>';
      }).join("") + "</div>" +
      '<button type="button" class="rep-link" style="margin-top:9px" data-act="domain-add"' + (domains.length >= 20 ? " disabled" : "") + ">+ Add domain</button>" +
      (domains.length >= 20 ? '<p class="rep-hint">You can allow up to 20 extra domains.</p>' : ""),
      {
        help: "The widget and its API answer requests only from the primary domain and from the domains listed here. Add *.example.com to allow every sub-domain.",
        hint: "Requests from any other domain are rejected with an error, so the widget cannot be copied to a third-party site."
      });
  }

  function repProtectionFull() {
    var d = S.rep.draft;
    return repSection("Widget domains", "The widget only loads on the primary domain and on the extra domains you allow here.", domainList(d)) +
      repSection("Google reviews", "Configure the link used by the Google review invitation for positive customers.",
        row("Google review link", textField(d.googleReviewUrl, "rep-set", "googleReviewUrl", { placeholder: "https://g.page/r/…/review" }),
          { hint: d.googleReviewUrl.trim() ? "Copy it from Google Business Profile → Ask for reviews." : "Required: add the Google review link to display the Google invitation to customers.", warn: !d.googleReviewUrl.trim() })) +
      repSection("Customer support contacts", "Shared contact details for both neutral and negative review follow-ups.",
        row("Support email", textField(d.supportEmail, "rep-set", "supportEmail", { type: "email", placeholder: "support@company.com" }),
          { help: "Enter the email address used by the Email customer support button.", hint: "The email button stays hidden until an address is provided." }) +
        row("Support chat URL", textField(d.supportChatUrl, "rep-set", "supportChatUrl", { type: "url", placeholder: "https://wa.me/15550000000" }),
          { help: "Enter the URL for the existing customer support chat, for example WhatsApp or Intercom.", hint: "The chat button stays hidden until a valid link is provided." })) +
      repSection("Review form settings", "Control what customers can submit through your widget.",
        switchRow("Allow anonymous reviews", d.allowAnonymousReviews, "rep-toggle", "allowAnonymousReviews", "The company keeps the submitted details in the admin panel, while the public review is shown as Anonymous.") +
        switchRow("Require written review text", d.reviewTextRequired, "rep-toggle", "reviewTextRequired", "When off, customers can submit only a star rating. Any non-empty comment still follows the minimum length below.") +
        row("Minimum review length", numberField(d.minReviewLength, "rep-num", "minReviewLength", { short: true, min: 0, max: 2000 }),
          { hint: d.reviewTextRequired ? "Required comments must meet this length." : "Optional comments must meet this length when provided." })) +
      repSection("Public review card", "Choose what website visitors can see in each review.",
        switchRow("Show avatar", d.publicShowAvatar, "rep-toggle", "publicShowAvatar") +
        switchRow("Show name", d.publicShowName, "rep-toggle", "publicShowName", "Anonymous reviews always show Anonymous instead of the submitted name.") +
        switchRow("Show city", d.publicShowCity, "rep-toggle", "publicShowCity") +
        switchRow("Show publication date", d.publicShowDate, "rep-toggle", "publicShowDate") +
        switchRow("Show review text", d.publicShowText, "rep-toggle", "publicShowText", "When off, visitors see the rating only.")) +
      repSection("Spam filters", "Review matching feedback before it appears on your website.",
        row("Daily reviews per IP address", numberField(d.maxReviewsPerIp, "rep-num", "maxReviewsPerIp", { short: true, min: 1, max: 100 }),
          { help: "Set the number of reviews a single IP address can submit in a 24-hour period." }) +
        row("Blocked words", areaField(d.stopWords, "rep-set", "stopWords", { placeholder: "blocked word, another phrase, …" }),
          { hint: "Comma-separated. Reviews containing these words are sent to moderation." }));
  }

  function repReviews() {
    var d = S.rep.draft;
    var kind = S.rep.category;
    var modeKey = kind + "PublishMode";
    var delayKey = kind + "DelayMinutes";
    var notifyKey = kind + "Notify";
    var autoKey = kind + "AutoReplyEnabled";
    var tplKey = kind + "AutoReplyTemplate";
    var mode = ["instant", "manual"].indexOf(d[modeKey]) >= 0 ? d[modeKey] : "delayed";
    var hasNone = kind === "neutral" ? d.neutralThreshold >= d.positiveThreshold : kind === "negative" ? d.neutralThreshold <= 1 : false;

    var categories = '<div class="rep-row"><div class="rep-label"><label>Review category</label>' + help("Review category", "Each category has independent publication, notification, and response rules.") + "</div>" +
      '<div class="rep-control"><div class="rep-choice-grid" role="radiogroup" aria-label="Review category">' +
      ["positive", "neutral", "negative"].map(function (k) {
        var range = rangeOf(k, d);
        return '<button type="button" class="rep-choice" role="radio" aria-label="' + COLORS[k].label + '" aria-checked="' + (k === kind) + '" data-act="rep-category" data-arg="' + k + '">' +
          '<span class="rep-choice-radio">' + (k === kind ? "<i></i>" : "") + "</span>" +
          '<svg class="rep-choice-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 9h.01M16 9h.01" stroke-width="2.7"/>' +
          (k === "positive" ? '<path d="M7.5 13.5c1.2 2.1 2.7 3 4.5 3s3.3-.9 4.5-3"/>' : k === "neutral" ? '<path d="M8 15h8"/>' : '<path d="M7.5 16c1.2-1.8 2.7-2.7 4.5-2.7s3.3.9 4.5 2.7"/>') + "</svg>" +
          '<span class="rep-choice-label">' + COLORS[k].label + '</span><span class="rep-choice-range">' + rangeText(range[0], range[1]) + "</span></button>";
      }).join("") + "</div></div></div>";

    var starsRow = row(COLORS[kind].label + " ratings",
      '<div class="rep-star-picker" role="group" aria-label="' + COLORS[kind].label + ' rating range">' +
      [1, 2, 3, 4, 5].map(function (rating) {
        var current = classify(rating, d);
        var own = current === kind;
        var disabled = kind !== "positive" && rating >= d.positiveThreshold;
        return '<button type="button" class="rep-star-option" aria-pressed="' + own + '"' + (disabled ? " disabled" : "") +
          ' aria-label="' + rating + (rating === 1 ? " star" : " stars") + ", currently " + current + '" data-act="rep-star" data-arg="' + rating + '"' +
          (own ? ' style="background:' + (kind === "positive" ? "#f0faf5" : kind === "neutral" ? "#fffaf0" : "#fdf4f2") + ";border-color:" + (kind === "positive" ? "#c9e9d7" : kind === "neutral" ? "#efe0bc" : "#efd1ca") + ";color:" + (kind === "positive" ? "#33976b" : kind === "neutral" ? "#b08737" : "#bd6257") + '"' : "") +
          "><span>" + rating + "</span><b>★</b></button>";
      }).join("") + "</div>" +
      '<div class="rep-range-summary">' + ["positive", "neutral", "negative"].map(function (c) {
        var r = rangeOf(c, d);
        return '<span><i style="background:' + COLORS[c].dot + '"></i><strong>' + COLORS[c].label + ":</strong>" + rangeText(r[0], r[1]) + "</span>";
      }).join("") + "</div>" +
      (hasNone ? '<p class="rep-hint rep-warning">No ratings are ' + kind + ". Select a star above to assign a range.</p>" : ""),
      { help: kind === "negative" ? "Choose the highest rating that should count as negative." : "Choose the lowest rating that should count as " + kind + "." });

    var channels = row("Notification channel",
      CHANNELS.map(function (c) {
        var item = d[kind + "NotifyChannels"][c.key];
        return '<div class="rep-channel-row"><label for="rep-notify-' + c.key + '">' + c.label + "</label>" +
          '<input id="rep-notify-' + c.key + '" class="rep-input" type="' + c.type + '" value="' + esc(item.value) + '" placeholder="' + c.placeholder + '"' +
          (item.enabled ? "" : " disabled") + ' aria-label="' + c.label + " " + c.noun + '" data-act="rep-channel" data-arg="' + c.key + '" />' +
          sw("Enable " + c.label + " notifications", item.enabled, "rep-channel-toggle", c.key) + "</div>";
      }).join("") +
      (!CHANNELS.some(function (c) { return d[kind + "NotifyChannels"][c.key].enabled && String(d[kind + "NotifyChannels"][c.key].value).trim(); })
        ? '<p class="rep-hint">Enable a channel and enter the recipient address or number.</p>' : ""),
      { help: "Enter a separate destination for each channel you enable." });

    var supportContactKey = kind === "neutral" ? "neutralSupportContact" : "negativeSupportContact";
    var supportChatKey = kind === "neutral" ? "neutralSupportChat" : "negativeSupportChat";
    var after = kind === "positive"
      ? repSection("Google review invitation", "Invite happy customers to share their experience on Google.",
        switchRow("Show the Leave a review on Google button", d.invitePositiveToExternal, "rep-toggle", "invitePositiveToExternal") +
        (!d.googleReviewUrl.trim() ? '<p class="rep-warning" style="margin-top:12px;font-size:11px">Google review link is missing. Add it in Protection &amp; Settings before this invitation is shown to customers.</p>' : ""))
      : repSection("Support after submission", "Let customers contact your support team after sharing their review.",
        switchRow("Offer to email customer support", d[supportContactKey], "rep-toggle", supportContactKey) +
        switchRow("Offer to chat with customer support", d[supportChatKey], "rep-toggle", supportChatKey, "Link to your existing support chat.") +
        row("Support contacts",
          '<button type="button" class="rep-link" data-act="rep-goto" data-arg="protection">Configure support email and chat URL in Protection &amp; Settings →</button>' +
          (((d[supportContactKey] && !d.supportEmail.trim()) || (d[supportChatKey] && !d.supportChatUrl.trim()))
            ? '<p class="rep-hint rep-warning">Add the contact details in Protection &amp; Settings to show the enabled support button to customers.</p>' : ""),
          { help: "One shared support email and chat URL are used for both neutral and negative reviews." }) +
        (d[supportContactKey] && d[supportChatKey]
          ? row("Support message", areaField(d.supportOfferText, "rep-set", "supportOfferText"),
            { help: "Shown after a neutral or negative review when both email and chat support options are enabled." })
          : ""));

    return '<section class="rep-section" aria-label="Review classification">' + categories + starsRow + "</section>" +
      repSection("Publication", "Set when " + kind + " reviews appear on your website.",
        row("Publication mode", selectField(mode, [["instant", "Instantly"], ["delayed", "With a delay"], ["manual", "Manual approval"]], "rep-set", modeKey, "medium"),
          { hint: MODE_HINTS[mode] }) +
        (mode === "delayed"
          ? row("Delay, minutes", numberField(d[delayKey], "rep-num", delayKey, { short: true, min: 0, max: 10080 }),
            { help: "The review will wait for this many minutes before publication.", hint: "0 = no delay. Maximum: 10,080 minutes." })
          : "")) +
      repSection("Notifications", "Choose how to receive new review alerts.",
        switchRow("Notify the administrator", d[notifyKey], "rep-toggle", notifyKey, "Notify for new reviews in this category.") +
        (d[notifyKey] ? channels : "")) +
      repSection("Company response", "Configure responses to " + kind + " customer feedback.",
        switchRow("Automatic company reply", d[autoKey], "rep-toggle", autoKey, "Use the response template for this category.") +
        (d[autoKey] ? row("Automatic reply template", areaField(d[tplKey], "rep-set", tplKey), { hint: "Personalization variable: {name}" }) : "") +
        (kind === "negative"
          ? switchRow("Require a reply", d.replyRequiredNegative, "rep-toggle", "replyRequiredNegative", "Set a response requirement for negative feedback.") +
            row("Response target, hours", numberField(d.replySlaHours, "rep-num", "replySlaHours", { short: true, min: 1, max: 720 })) +
            row("Reply signature", textField(d.replySignature, "rep-set", "replySignature"))
          : "")) + after;
  }

  function repReminders() {
    var d = S.rep.draft;
    var body = '<div class="rep-reminder-table-wrap"><table class="rep-reminder-table" aria-label="Reminder schedule"><thead><tr>' +
      "<th scope=\"col\">Time</th><th scope=\"col\">Unit</th><th scope=\"col\">Channel</th><th scope=\"col\">Recipient</th>" +
      '<th scope="col">Message</th><th scope="col" style="text-align:center">Active</th><th scope="col"><span class="sr-only">Delete</span></th>' +
      "</tr></thead><tbody>" +
      (d.reminders.length === 0
        ? '<tr><td colspan="7"><p class="rep-empty">No reminders yet. Add your first review invitation.</p></td></tr>'
        : d.reminders.map(function (r, index) {
          var unit = S.rep.units[r.id] || inferUnit(r.delayMinutes);
          var amount = Math.round(r.delayMinutes / multiplier(unit));
          return '<tr class="' + (r.enabled === false ? "is-disabled" : "") + '" data-reminder-id="' + r.id + '">' +
            '<td><input class="rep-table-input" type="number" min="0" value="' + amount + '" aria-label="Reminder ' + (index + 1) + ' delay time" data-act="rem-time" data-arg="' + r.id + '" /></td>' +
            "<td>" + '<select class="rep-table-select" aria-label="Reminder ' + (index + 1) + ' delay unit" data-act="rem-unit" data-arg="' + r.id + '">' +
            UNITS.map(function (u) { return '<option value="' + u.id + '"' + (u.id === unit ? " selected" : "") + ">" + u.label + "</option>"; }).join("") + "</select></td>" +
            "<td>" + '<select class="rep-table-select" aria-label="Reminder ' + (index + 1) + ' channel" data-act="rem-channel" data-arg="' + r.id + '">' +
            CHANNELS.map(function (c) { return '<option value="' + c.key + '"' + (c.key === r.channel ? " selected" : "") + ">" + c.label + "</option>"; }).join("") + "</select></td>" +
            '<td><input class="rep-table-input recipient" value="' + esc(r.target) + '" placeholder="' + (r.channel === "email" ? "customer@email.com" : "+1 555 000 0000") + '" aria-label="Reminder ' + (index + 1) + ' recipient" data-act="rem-target" data-arg="' + r.id + '" /></td>' +
            '<td><button type="button" class="rep-link" data-act="rem-message" data-arg="' + r.id + '" aria-label="Edit reminder ' + (index + 1) + ' message" title="' + esc(r.message) + '">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/></svg>Edit</button></td>' +
            '<td class="toggle-cell">' + sw("Reminder " + (index + 1) + " active", r.enabled !== false, "rem-toggle", r.id) + "</td>" +
            '<td><button type="button" class="rep-table-delete" aria-label="Delete reminder ' + (index + 1) + '" data-act="rem-delete" data-arg="' + r.id + '">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></svg></button></td>' +
            "</tr>";
        }).join("")) +
      "</tbody></table></div>" +
      '<p class="rep-settings-note">The time and unit set the delay after a customer visit or order. Changes apply when you save.</p>';
    return repSection("Reminder schedule", "Choose when reminders are sent automatically.", body,
      '<button type="button" class="rep-button" data-act="rem-add"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>Add reminder</button>');
  }

  function repQueue() {
    var d = S.rep.draft;
    return repSection("Publication limits", "Set the pace for reviews in the publication queue.",
      switchRow("Enable the smart queue", d.smartQueueEnabled, "rep-toggle", "smartQueueEnabled", "Apply the priority rules below to queued reviews.") +
      row("Minimum interval, minutes", numberField(d.minIntervalMinutes, "rep-num", "minIntervalMinutes", { short: true, min: 0, max: 1440 })) +
      row("Maximum per hour", numberField(d.maxPerHour, "rep-num", "maxPerHour", { short: true, min: 1, max: 500 })) +
      row("Maximum per day", numberField(d.maxPerDay, "rep-num", "maxPerDay", { short: true, min: 1, max: 2000 })) +
      row("Daily negative review limit, %", numberField(d.maxNegativeShare, "rep-num", "maxNegativeShare", { short: true, min: 0, max: 100 }))) +
      repSection("Positive review priority", "Release the next positive review without waiting for its delay to end.",
        switchRow("After a neutral review → publish the next positive review now", d.neutralBoostPositive, "rep-toggle", "neutralBoostPositive") +
        switchRow("Recent negative review → publish the next positive review now", d.negativeLookbackEnabled, "rep-toggle", "negativeLookbackEnabled") +
        row("Number of recent reviews to check",
          '<div class="rep-rule-buttons">' + [1, 2, 3, 4, 5].map(function (v) {
            return '<button type="button" aria-pressed="' + (v === d.negativeLookbackCount) + '"' + (d.negativeLookbackEnabled ? "" : " disabled") + ' data-act="rep-lookback" data-arg="' + v + '">' + v + "</button>";
          }).join("") + "</div>",
          { help: "If any of the last selected number of published reviews is negative, release the next queued positive review.", hint: "Check the last 1–5 published reviews." }) +
        (!d.smartQueueEnabled ? '<p class="rep-hint rep-warning">Enable the smart queue to activate these priority rules.</p>' : ""));
  }

  function viewReputation() {
    var copy = REP_COPY[S.rep.section];
    var body = S.rep.section === "protection" ? repProtectionFull()
      : S.rep.section === "reviews" ? repReviews()
        : S.rep.section === "reminders" ? repReminders()
          : repQueue();
    return '<div class="reputation-ref"><div class="rep-top"><h1>Business reputation</h1>' +
      '<div class="row"><button type="button" class="rep-button" data-act="open-preview">Widget preview</button></div></div>' +
      '<div class="rep-layout"><nav class="rep-navigation" aria-label="Business reputation sections">' +
      REP_MENU.map(function (item) {
        return '<button type="button" data-act="rep-section" data-arg="' + item.id + '"' + (S.rep.section === item.id ? ' aria-current="page"' : "") + ">" + item.label + "</button>";
      }).join("") + "</nav>" +
      '<div class="rep-sheet"><header class="rep-sheet-header"><h2>' + copy.title + "</h2><p>" + copy.description + "</p></header>" + body +
      '<div class="rep-footer"><span>' + (repDirty() ? "You have unsaved changes" : "All settings are up to date") + "</span>" +
      '<div class="rep-footer-actions">' +
      (repDirty() ? '<button type="button" class="rep-button quiet" data-act="rep-discard">Discard changes</button>' : "") +
      '<button type="button" class="rep-button primary" data-act="rep-save"' + (repDirty() ? "" : " disabled") + ">Save changes</button>" +
      "</div></div></div></div></div>";
  }

  /* ── Thank-you screen (mirrors renderThanks() in public/widget.js) ─────── */
  function thanksScreen(followUp, status, sentiment, project, resetAct) {
    var accent = project.brandColor || "#617a58";
    var message = status === "pending" ? "Your review has been submitted for moderation." : "Thank you for your review!";
    var actions = "";
    if (followUp && followUp.google) {
      actions += '<p>We would love it if you shared your experience on Google.</p>' +
        '<div class="actions"><a class="btn-widget google" href="' + esc(followUp.google.url) + '" target="_blank" rel="noopener noreferrer">' + GOOGLE_G + " Leave a review on Google</a></div>";
    }
    if (followUp && followUp.support) {
      actions += (followUp.support.text ? "<p>" + esc(followUp.support.text) + "</p>" : "") + '<div class="actions">' +
        (followUp.support.contact ? '<a class="btn-widget" href="mailto:' + esc(followUp.support.email) + "?subject=" + encodeURIComponent("Follow-up about my review") + '">Email customer support</a>' : "") +
        (followUp.support.chat ? '<a class="btn-widget primary" href="' + esc(followUp.support.chatUrl) + '" target="_blank" rel="noopener noreferrer">Chat with support</a>' : "") +
        "</div>";
    }
    return '<div class="thanks" style="--accent:' + esc(accent) + '" data-widget-thanks>' +
      '<div class="icon">✓</div><h3>Thank you for your feedback!</h3><p>' + esc(message) + "</p>" +
      '<span class="level">' + esc(sentiment) + " · " + (status === "pending" ? "awaiting moderation" : status === "queued" ? "scheduled" : "published") + "</span>" +
      actions +
      (resetAct ? '<div class="actions"><button type="button" class="btn-widget" data-act="' + resetAct + '">Leave another review</button></div>' : "") +
      "</div>";
  }

  /* ── Widget blocks (mirrors public/widget.js rendering) ────────────────── */
  function widgetFeed(limit) {
    var m = metrics();
    var list = publishedReviews().sort(function (a, b) { return Number(b.pinned) - Number(a.pinned); }).slice(0, limit || 10);
    return '<div class="ow"><div class="ow-heading"><div><h2 class="ow-title">What our customers say</h2>' +
      '<p class="ow-subtitle">' + m.averageRating.toFixed(1) + " / 5 · " + m.published + " reviews</p></div>" +
      '<div class="row"><span class="stars">★★★★★</span><span class="ow-score">' + m.averageRating.toFixed(1) + "</span></div></div>" +
      (list.length === 0 ? '<div class="empty">No published reviews yet.</div>'
        : '<div class="ow-list">' + list.map(function (r) {
          var name = r.isAnonymous ? "Anonymous" : PROJECT.publicShowName ? r.authorName : "";
          var meta = [PROJECT.publicShowCity && !r.isAnonymous ? r.authorCity : null, PROJECT.publicShowDate ? date(r.publishedAt) : null].filter(Boolean).join(" · ");
          return '<article class="ow-card"><div class="row" style="align-items:flex-start">' +
            (PROJECT.publicShowAvatar ? '<span class="rep-choice-radio" style="position:static;display:grid;width:30px;height:30px;border:0;border-radius:50%;background:#e8eff9;color:#5476a1;font-size:10px;font-weight:700;place-items:center">' + esc(r.isAnonymous ? "A" : initials(r.authorName)) + "</span>" : "") +
            '<div style="flex:1;min-width:0"><div class="who"><strong style="font-size:12px">' + esc(name) + "</strong>" + stars(r.rating) + "</div>" +
            (meta ? '<div class="meta" style="color:#80868b;font-size:10px;margin-top:2px">' + esc(meta) + "</div>" : "") +
            (PROJECT.publicShowText ? '<p class="text" style="font-size:12px">' + esc(r.hiddenText ? "Text hidden by the moderator" : r.content) + "</p>" : "") +
            (r.companyReply ? '<div class="reply"><strong>Company reply</strong>' + esc(r.companyReply) + "</div>" : "") +
            "</div></div></article>";
        }).join("") + "</div>") + "</div>";
  }
  function widgetBadge() {
    var m = metrics();
    return '<div class="ow"><span class="ow-badge"><strong class="ow-badge-score">' + m.averageRating.toFixed(1) + '</strong><span class="stars">★★★★★</span>' +
      '<span class="ow-badge-caption">' + m.published + " reviews</span></span></div>";
  }
  function widgetForm() {
    var sb = S.sandbox;
    var textRequired = PROJECT.reviewTextRequired === true;
    return '<div class="ow"><form class="ow-form" data-widget-form style="--otklik-accent:' + esc(PROJECT.brandColor) + '">' +
      '<h2 class="ow-form-title">Share your experience</h2>' +
      '<p class="ow-form-description">' + (textRequired ? "Your rating and comment help us improve." : "A rating is enough. You can add a comment if you like.") + "</p>" +
      '<label class="ow-rate-label">Your rating</label><div class="ow-rating-options">' +
      [1, 2, 3, 4, 5].map(function (v) {
        return '<button type="button" class="ow-rating-choice' + (sb.rating === v ? " selected" : "") + '" data-act="sandbox-rating" data-arg="' + v + '" aria-label="Rating ' + v + ' out of 5">' + "★".repeat(v) + "</button>";
      }).join("") + "</div>" +
      '<input class="ow-field" name="authorName" placeholder="Your name" maxlength="120" value="' + esc(sb.name) + '" data-act="sandbox-field" data-arg="name" required />' +
      '<input class="ow-field" name="authorEmail" type="email" placeholder="Email address (optional)" maxlength="254" value="' + esc(sb.email) + '" data-act="sandbox-field" data-arg="email" />' +
      '<input class="ow-field" name="authorCity" placeholder="City (optional)" maxlength="120" value="' + esc(sb.city) + '" data-act="sandbox-field" data-arg="city" />' +
      '<textarea class="ow-field" name="content" placeholder="' + (textRequired ? "Tell us what you enjoyed or how we could improve…" : "Tell us more (optional)") + '" maxlength="2000" data-act="sandbox-field" data-arg="text">' + esc(sb.text) + "</textarea>" +
      (PROJECT.allowAnonymousReviews
        ? '<label class="ow-anonymous"><input type="checkbox" data-act="sandbox-anonymous"' + (sb.anonymous ? " checked" : "") + " />" +
          "<span>Publish this review anonymously. Your details remain visible to the company.</span></label>"
        : "") +
      '<button class="ow-submit" type="submit">Submit review</button>' +
      '<p class="ow-message" data-sandbox-message aria-live="polite"></p>' +
      '<p class="ow-note">Sandbox: submitting adds a review to this prototype and shows the standard thank-you screen for the selected level.</p>' +
      "</form></div>";
  }
  function submitSandbox() {
    var sb = S.sandbox;
    var box = document.querySelector("[data-sandbox-message]");
    var comment = String(sb.text || "").trim();
    var minLen = Number(PROJECT.minReviewLength || 10);
    if (String(sb.name || "").trim().length < 2) {
      if (box) { box.className = "ow-message error"; box.textContent = "Enter your name to continue."; }
      return;
    }
    if ((PROJECT.reviewTextRequired && comment.length < minLen) || (!PROJECT.reviewTextRequired && comment.length > 0 && comment.length < minLen)) {
      if (box) {
        box.className = "ow-message error";
        box.textContent = PROJECT.reviewTextRequired ? "Please write at least " + minLen + " characters." : "If you add a comment, please write at least " + minLen + " characters.";
      }
      return;
    }
    var rating = Number(sb.rating) || 5;
    var sentiment = sentimentOf(rating, PROJECT);
    var mode = sentiment === "positive" ? PROJECT.positivePublishMode : sentiment === "neutral" ? PROJECT.neutralPublishMode : PROJECT.negativePublishMode;
    var stop = String(PROJECT.stopWords || "").split(",").map(function (w) { return w.trim().toLowerCase(); }).filter(Boolean);
    var hitStop = stop.some(function (w) { return comment.toLowerCase().indexOf(w) >= 0; });
    var status = mode === "manual" || hitStop ? "pending" : mode === "instant" ? "published" : "queued";
    seq += 1;
    REVIEWS.unshift({
      id: "rev-" + String(seq).padStart(3, "0"),
      authorName: String(sb.name).trim(), authorEmail: String(sb.email || "").trim(), authorCity: String(sb.city || "").trim(),
      isAnonymous: !!sb.anonymous, rating: rating, sentiment: sentiment, content: comment, source: "Website widget",
      status: status, createdAt: new Date().toISOString(), scheduledAt: status === "queued" ? new Date(Date.now() + 3600 * 1000).toISOString() : null,
      publishedAt: status === "published" ? new Date().toISOString() : null, companyReply: null, replyAt: null, hiddenText: false, pinned: false
    });
    S.sandboxThanks = { sentiment: sentiment, status: status, followUp: followUpFor(sentiment, PROJECT) };
    S.sandbox = { rating: 5, name: "", email: "", city: "", text: "", anonymous: false };
    toast("Review submitted — the thank-you screen for " + sentiment + " reviews is shown.");
    render();
  }

  /* ── View: Widgets & embed SDK ─────────────────────────────────────────── */
  function embedSnippet() {
    var origin = window.location.origin.indexOf("http") === 0 ? window.location.origin : "https://otklik.ru";
    return '<script src="' + origin + '/widget.js" data-project-id="' + PROJECT.id + '" defer></' + "script>\n" +
      '<div data-widget="' + S.widgetType + '" data-limit="6" data-show-response="true"></div>';
  }
  function viewWidgets() {
    var types = [
      { id: "reviews", label: "Review feed", desc: "Display published customer feedback" },
      { id: "form", label: "Review form", desc: "Collect ratings and comments" },
      { id: "badge", label: "Rating badge", desc: "Show a compact rating summary" },
      { id: "all-in-one", label: "All-in-one", desc: "Feed, form, and rating badge" }
    ];
    var sandbox = S.sandboxThanks
      ? thanksScreen(S.sandboxThanks.followUp, S.sandboxThanks.status, S.sandboxThanks.sentiment, PROJECT, "sandbox-reset")
      : S.widgetType === "badge" ? widgetBadge()
        : S.widgetType === "form" ? widgetForm()
          : S.widgetType === "reviews" ? widgetFeed(4)
            : widgetBadge() + '<div style="margin-top:16px">' + widgetFeed(3) + "</div>" + '<div style="margin-top:16px">' + widgetForm() + "</div>";
    return '<h1 class="page-title">Widgets &amp; Embed SDK</h1>' +
      '<p class="page-sub">Add a review form, review feed, or rating badge to your website with a small embed snippet.</p>' +
      '<div class="grid cols-4">' + types.map(function (t) {
        return '<button class="card" style="text-align:left;border-color:' + (S.widgetType === t.id ? "var(--blue)" : "#e5e7eb") + ";background:" + (S.widgetType === t.id ? "#f5f8ff" : "#fff") + '" data-act="widget-type" data-arg="' + t.id + '">' +
          '<div style="font-size:13px;font-weight:700">' + t.label + '</div><div class="tiny muted" style="margin-top:4px">' + t.desc + "</div></button>";
      }).join("") + "</div>" +
      '<div class="card"><div class="between"><h2>HTML embed code</h2><button class="btn ghost-blue small" data-act="copy-snippet">Copy code</button></div>' +
      '<p class="sub">Paste this before the closing &lt;/body&gt; tag of the page where the widget should appear.</p>' +
      "<pre class=\"code\">" + esc(embedSnippet()) + "</pre></div>" +
      '<div class="card"><div class="between"><h2>Allowed domains for the widget</h2>' +
      '<button class="btn ghost-blue small" data-act="nav" data-view="reputation">Manage domains →</button></div>' +
      '<p class="sub">The widget and its API answer requests only from these domains. Every other origin is rejected, so the snippet cannot be reused on a third-party site.</p>' +
      '<div class="chips"><span class="chip">' + esc(PROJECT.domain) + '<span class="tag">primary</span></span>' +
      (PROJECT.allowedDomains || []).map(function (d) { return '<span class="chip">' + esc(d) + "</span>"; }).join("") +
      ((PROJECT.allowedDomains || []).length ? "" : '<span class="tiny muted">No extra domains yet — add them in Business reputation → Protection &amp; Settings.</span>') +
      "</div></div>" +
      '<div class="card"><div class="between"><h2>Interactive widget preview</h2>' +
      '<button class="btn small" data-act="open-preview">Open the full preview panel</button></div>' +
      '<p class="sub">Settings from Business reputation are applied immediately.</p>' +
      '<div style="padding:20px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc">' + sandbox + "</div></div>";
  }

  /* ── View: Settings ────────────────────────────────────────────────────── */
  var SETTINGS_TABS = [
    ["account", "Account"], ["company", "Company"], ["api", "API & Webhooks"],
    ["naming", "Naming"], ["booking", "Booking"], ["qrcode", "Feedback & QR code"]
  ];
  function viewSettings() {
    var tab = S.settingsTab;
    var body = "";
    if (tab === "account") {
      body = row("Company name", textField(PROJECT.name, "set-project", "name")) +
        row("Administrator email", textField("owner@zerno.coffee", "noop", "", { type: "email" })) +
        row("Time zone", selectField(PROJECT.timezone, [["Europe/Moscow", "Europe/Moscow (UTC+3)"], ["Europe/London", "Europe/London"], ["America/New_York", "America/New_York"]], "set-project", "timezone", "medium"));
    } else if (tab === "company") {
      body = row("Brand color", '<input type="color" value="' + esc(PROJECT.brandColor) + '" data-act="set-project" data-arg="brandColor" style="width:64px;height:38px;padding:2px;border:1px solid #bcbcc7;border-radius:3px;background:#fff" />',
        { hint: "Used by the widget buttons and the thank-you screen." }) +
        row("Rating scale", selectField("stars", [["stars", "5 stars"]], "noop", "", "medium"), { hint: "Only the 5-star scale is supported." });
    } else if (tab === "api") {
      body = row("API key", '<input class="rep-input" readonly value="upp_live_' + PROJECT.id.slice(0, 12) + '" />', { hint: "Server-to-server key for the public API." }) +
        row("Public endpoints", '<div class="chips"><span class="chip">GET /api/v1/projects/{id}/reviews</span><span class="chip">POST /api/v1/projects/{id}/reviews</span><span class="chip">GET /api/v1/projects/{id}/rating</span></div>',
        { hint: "Requests are accepted only from the allowed domains of the widget." });
    } else if (tab === "naming") {
      body = row("Positive reviews are called", textField("Positive", "noop", "")) +
        row("Neutral reviews are called", textField("Neutral", "noop", "")) +
        row("Negative reviews are called", textField("Negative", "noop", ""));
    } else if (tab === "booking") {
      body = row("Invitation after a visit", switchRow("Send review invitations automatically", true, "noop", "")) +
        row("Reminder rules", '<button class="rep-link" data-act="nav" data-view="reputation">Open Business reputation → Reminders →</button>',
        { hint: "Reminder schedule, channels, and message templates live in the reputation hub." });
    } else {
      body = row("Review form title", textField("Share your experience", "noop", "")) +
        row("QR code", '<div class="chips"><span class="chip">Print-ready QR</span><span class="chip">Table sticker</span><span class="chip">Receipt footer</span></div>',
        { hint: "The QR code opens the review form on the primary domain." });
    }
    return '<h1 class="page-title">Settings</h1><p class="page-sub">Workspace-level settings. Review rules live in Business reputation.</p>' +
      '<div class="card"><div class="tabs">' + SETTINGS_TABS.map(function (t) {
        return '<button class="tab ' + (tab === t[0] ? "active" : "") + '" data-act="settings-tab" data-arg="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + '</div><div style="padding-top:18px">' + body + "</div></div>" +
      '<div class="card"><h2>Payment method &amp; Domain security</h2><p class="sub">Where the widget may run and how invoices are paid.</p>' +
      '<div class="chips" style="margin-bottom:16px">' +
      ["By check", "Wire transfer", "Zelle", "Credit card", "Google Pay", "Paypal", "Amazon Pay"].map(function (p, i) {
        return '<span class="chip ' + (i === 1 ? "on" : "") + '">' + p + "</span>";
      }).join("") + "</div>" +
      '<div style="padding:12px;border:1px solid #fee2e2;border-radius:10px;background:#fef2f2;color:#991b1b;font-size:12px;margin-bottom:16px">' +
      "<strong>Attention:</strong> Avoid giving out your banking details to businesses or people you do not know or expect money from.</div>" +
      '<div class="grid cols-2">' +
      '<div><label class="label">Allowed domain</label>' + textField(PROJECT.domain, "set-project", "domain") +
      '<p class="tiny muted" style="margin-top:6px">The widget always loads on this domain. Extra allowed domains are set in Business reputation → Protection &amp; Settings.</p></div>' +
      '<div><label class="label">Timezone</label>' + selectField(PROJECT.timezone, [["Europe/Moscow", "Europe/Moscow (UTC+3)"], ["Europe/London", "Europe/London"], ["America/New_York", "America/New_York"]], "set-project", "timezone", "") + "</div>" +
      "</div>" +
      '<div class="row" style="margin-top:16px"><button class="btn small ghost-blue" data-act="nav" data-view="reputation">Manage the widget domain list →</button></div>' +
      "</div>" +
      '<div class="center" style="margin-top:20px"><button class="btn primary" data-act="save-settings" style="min-width:220px">Save</button></div>';
  }

  /* ── Remaining views ───────────────────────────────────────────────────── */
  function viewClients() {
    var authors = {};
    REVIEWS.forEach(function (r) {
      var key = r.authorEmail || r.authorName;
      if (!authors[key]) authors[key] = { name: r.authorName, email: r.authorEmail, city: r.authorCity, count: 0, sum: 0 };
      authors[key].count += 1;
      authors[key].sum += r.rating;
    });
    var list = Object.keys(authors).map(function (k) { return authors[k]; });
    return '<h1 class="page-title">Review authors</h1><p class="page-sub">Everyone who left a review, with their average rating.</p>' +
      '<div class="card"><table class="data"><thead><tr><th>Author</th><th>Contact</th><th>City</th><th>Reviews</th><th>Average</th></tr></thead><tbody>' +
      list.map(function (a) {
        var avg = Math.round(a.sum / a.count * 10) / 10;
        return "<tr><td><strong>" + esc(a.name) + '</strong></td><td class="muted">' + esc(a.email || "—") + '</td><td class="muted">' + esc(a.city || "—") +
          "</td><td>" + a.count + "</td><td>" + stars(avg) + " " + avg.toFixed(1) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function viewChannels() {
    var channels = [
      { name: "Website widget", state: "Active", detail: PROJECT.domain + ((PROJECT.allowedDomains || []).length ? " + " + PROJECT.allowedDomains.length + " more domains" : "") },
      { name: "Email invitations", state: PROJECT.reminders.some(function (r) { return r.channel === "email"; }) ? "Active" : "Off", detail: PROJECT.reminders.filter(function (r) { return r.channel === "email"; }).length + " reminder rules" },
      { name: "WhatsApp", state: PROJECT.reminders.some(function (r) { return r.channel === "whatsapp"; }) ? "Active" : "Off", detail: "Reminders and support chat" },
      { name: "SMS", state: PROJECT.reminders.some(function (r) { return r.channel === "sms"; }) ? "Active" : "Off", detail: "Reminders only" },
      { name: "Google Business Profile", state: PROJECT.googleReviewUrl ? "Connected" : "Not connected", detail: PROJECT.googleReviewUrl || "Add the review link in Protection & Settings" }
    ];
    return '<h1 class="page-title">Domains and channels</h1><p class="page-sub">Where reviews are collected and where invitations are sent.</p>' +
      '<div class="card"><h2>Channels</h2><p class="sub">Each channel can be configured in Business reputation.</p><div class="stack">' +
      channels.map(function (c) {
        return '<div class="between" style="padding:12px 0;border-bottom:1px solid #f1f5f9"><div><strong style="font-size:13px">' + esc(c.name) + "</strong>" +
          '<div class="tiny muted">' + esc(c.detail) + '</div></div><span class="badge ' + (c.state === "Active" || c.state === "Connected" ? "positive" : "pending") + '">' + c.state + "</span></div>";
      }).join("") + "</div></div>" +
      '<div class="card"><h2>Allowed domains for the widget</h2><p class="sub">Managed in Business reputation → Protection &amp; Settings.</p>' +
      '<div class="chips"><span class="chip">' + esc(PROJECT.domain) + '<span class="tag">primary</span></span>' +
      (PROJECT.allowedDomains || []).map(function (d) { return '<span class="chip">' + esc(d) + "</span>"; }).join("") + "</div></div>";
  }
  function viewTeam() {
    var team = [
      { name: "Elena Sokolova", role: "Owner", rights: "Full access" },
      { name: "Mark Ivanov", role: "Manager", rights: "Moderation and replies" },
      { name: "Daria Petrova", role: "Barista", rights: "Read only" }
    ];
    return '<h1 class="page-title">Team</h1><p class="page-sub">Who can moderate reviews and answer customers.</p>' +
      '<div class="card"><div class="between"><h2>Members</h2><button class="btn primary small" data-act="toast" data-arg="Invitation sent (prototype).">Invite</button></div>' +
      '<div class="stack" style="margin-top:14px">' + team.map(function (t) {
        return '<div class="between" style="padding:12px 0;border-bottom:1px solid #f1f5f9"><div class="row">' +
          '<span class="rep-choice-radio" style="position:static;display:grid;width:34px;height:34px;border:0;border-radius:50%;background:#e8eff9;color:#5476a1;font-size:11px;font-weight:700;place-items:center">' + esc(initials(t.name)) + "</span>" +
          "<div><strong style=\"font-size:13px\">" + esc(t.name) + '</strong><div class="tiny muted">' + esc(t.role) + "</div></div></div>" +
          '<span class="badge info">' + esc(t.rights) + "</span></div>";
      }).join("") + "</div></div>";
  }
  function viewMessages() {
    return '<h1 class="page-title">Invitations and reminders</h1><p class="page-sub">Automatic review invitations configured in Business reputation → Reminders.</p>' +
      '<div class="card"><h2>Schedule</h2><p class="sub">Every rule sends one invitation after a customer visit or order.</p>' +
      (S.rep.draft.reminders.length === 0 ? '<div class="empty">No reminders yet.</div>'
        : '<div class="stack">' + S.rep.draft.reminders.map(function (r, i) {
          var unit = S.rep.units[r.id] || inferUnit(r.delayMinutes);
          return '<div class="between" style="padding:12px 0;border-bottom:1px solid #f1f5f9"><div>' +
            '<strong style="font-size:12px">Reminder ' + (i + 1) + "</strong> · " + Math.round(r.delayMinutes / multiplier(unit)) + " " + multiplier(unit) + " min · " + r.channel +
            '<div class="tiny muted" style="margin-top:4px;max-width:640px">' + esc(r.message) + "</div></div>" +
            '<span class="badge ' + (r.enabled === false ? "pending" : "positive") + '">' + (r.enabled === false ? "Disabled" : "Active") + "</span></div>";
        }).join("") + "</div>") +
      '<div class="row" style="margin-top:16px"><button class="btn ghost-blue small" data-act="nav" data-view="reputation">Edit reminders →</button></div></div>';
  }
  function viewAnalytics() {
    var m = metrics();
    var tabs = [["usage", "Usage"], ["plan", "Plan"], ["payment", "Payment"], ["invoices", "Invoices"]];
    var body = "";
    if (S.analyticsTab === "usage") {
      body = '<div class="grid cols-4"><div class="kpi"><div class="value">' + m.total + '</div><div class="caption">Reviews collected</div></div>' +
        '<div class="kpi"><div class="value">' + m.published + '</div><div class="caption">Published</div></div>' +
        '<div class="kpi"><div class="value">' + (PROJECT.allowedDomains || []).length + 1 + '</div><div class="caption">Domains with the widget</div></div>' +
        '<div class="kpi"><div class="value">' + PROJECT.reminders.length + '</div><div class="caption">Reminder rules</div></div></div>';
    } else if (S.analyticsTab === "plan") {
      body = '<div class="grid cols-2"><div class="kpi"><div class="value">Business</div><div class="caption">Current plan · renews on 1 Nov</div></div>' +
        '<div class="kpi"><div class="value">5,000</div><div class="caption">Reviews per month included</div></div></div>';
    } else if (S.analyticsTab === "payment") {
      body = '<div class="chips"><span class="chip on">Visa •••• 4242</span><span class="chip">Add a card</span></div>';
    } else {
      body = '<table class="data"><thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>' +
        '<tr><td>UPP-2026-0041</td><td>Oct 1, 2026</td><td>$79.00</td><td><span class="badge positive">Paid</span></td></tr>' +
        '<tr><td>UPP-2026-0032</td><td>Sep 1, 2026</td><td>$79.00</td><td><span class="badge positive">Paid</span></td></tr>' +
        "</tbody></table>";
    }
    return '<h1 class="page-title">Analytics and reports</h1><p class="page-sub">Usage, plan, and billing.</p>' +
      '<div class="card"><div class="tabs">' + tabs.map(function (t) {
        return '<button class="tab ' + (S.analyticsTab === t[0] ? "active" : "") + '" data-act="analytics-tab" data-arg="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + '</div><div style="padding-top:18px">' + body + "</div></div>";
  }

  /* ── Side panels ───────────────────────────────────────────────────────── */
  function panelShell(title, subtitle, body, footer, width, tabs) {
    return '<div class="overlay" data-act="close-panel"><div class="panel" style="--panel-width:' + (width || 430) + 'px" data-panel>' +
      '<div class="panel-head"><div><h2>' + esc(title) + "</h2>" + (subtitle ? "<p>" + esc(subtitle) + "</p>" : "") + "</div>" +
      '<button type="button" class="panel-close" data-act="close-panel" aria-label="Close panel">✕</button></div>' +
      (tabs ? '<div class="panel-tabs" role="tablist">' + tabs + "</div>" : "") +
      '<div class="panel-body">' + body + "</div>" +
      (footer ? '<div class="panel-foot">' + footer + "</div>" : "") + "</div></div>";
  }
  function previewCard(r) {
    var name = r.isAnonymous ? "Anonymous" : PROJECT.publicShowName ? r.authorName : "";
    var meta = [PROJECT.publicShowCity && !r.isAnonymous ? r.authorCity : null, PROJECT.publicShowDate ? date(r.publishedAt) : null].filter(Boolean).join(" · ");
    return '<article class="review-card"><div class="row" style="align-items:flex-start">' +
      (PROJECT.publicShowAvatar ? '<span class="avatar">' + esc(r.isAnonymous ? "A" : initials(r.authorName)) + "</span>" : "") +
      '<div style="flex:1;min-width:0"><div class="who">' + (name ? "<strong style=\"font-size:12px\">" + esc(name) + "</strong>" : "<span></span>") + stars(r.rating) + "</div>" +
      (meta ? '<p class="meta">' + esc(meta) + "</p>" : "") +
      (PROJECT.publicShowText ? '<p class="text">' + esc(r.hiddenText ? "Text hidden by the moderator" : (r.content || "Rating only")) + "</p>" : "") +
      (r.companyReply ? '<div class="reply"><strong>Company reply: </strong>' + esc(r.companyReply) + "</div>" : "") +
      "</div></div></article>";
  }
  function previewBody() {
    var kind = S.preview.kind;
    var m = metrics();
    var list = publishedReviews().sort(function (a, b) { return Number(b.pinned) - Number(a.pinned); }).slice(0, 3);
    var head = '<div class="row" style="margin-bottom:12px;padding:8px 10px;border:1px solid #e9edf2;border-radius:8px;background:#fff;font-size:10px;color:#667085">' +
      "Showing: " + (PROJECT.publicShowAvatar ? "avatar" : "no avatar") + " · " + (PROJECT.publicShowName ? "name" : "no name") + " · " +
      (PROJECT.publicShowCity ? "city" : "no city") + " · " + (PROJECT.publicShowDate ? "date" : "no date") + " · " + (PROJECT.publicShowText ? "review text" : "rating only") + "</div>";
    var inner = "";
    if (kind === "badge" || kind === "all-in-one") {
      inner += '<div class="row" style="padding:12px;border:1px solid #dadce0;border-radius:10px;margin-bottom:12px"><strong style="font-size:18px">' + m.averageRating.toFixed(1) + "</strong>" + stars(m.averageRating) + '<span class="tiny muted">' + m.published + " reviews</span></div>";
    }
    if (kind === "reviews" || kind === "all-in-one") {
      inner += '<h3 style="font-size:13px;margin-bottom:10px">What our customers say</h3>' +
        (list.length ? list.map(previewCard).join("") : '<p class="empty">No published reviews yet.</p>');
    }
    if (kind === "form" || kind === "all-in-one") {
      inner += '<div style="margin-top:14px;padding:12px;border:1px solid #e8eaed;border-radius:10px"><h3 style="font-size:13px;margin-bottom:8px">Share your experience</h3>' +
        stars(5) +
        ["Your name", "Email address (optional)", "City (optional)"].map(function (p) {
          return '<div style="margin-top:8px;padding:8px;border:1px solid #dadce0;border-radius:6px;font-size:11px;color:#94a3b8">' + p + "</div>";
        }).join("") +
        '<div style="margin-top:8px;height:56px;padding:8px;border:1px solid #dadce0;border-radius:6px;font-size:11px;color:#94a3b8">' + (PROJECT.reviewTextRequired ? "Tell us about your experience…" : "Tell us more (optional)") + "</div>" +
        (PROJECT.allowAnonymousReviews ? '<div class="row tiny muted" style="margin-top:8px"><span style="width:12px;height:12px;border:1px solid #aeb6c3;border-radius:2px;display:block"></span>Publish this review anonymously</div>' : "") +
        '<div style="margin-top:10px;padding:10px;border-radius:6px;text-align:center;font-size:12px;font-weight:600;color:#fff;background:' + esc(PROJECT.brandColor) + '">Submit review</div>' +
        '<p class="tiny muted" style="margin-top:8px">Preview only · no review will be submitted.</p></div>';
    }
    if (kind === "after") {
      var sentiment = S.preview.after;
      inner += '<div class="row" style="margin-bottom:12px">' + ["positive", "neutral", "negative"].map(function (s) {
        return '<button class="btn small" style="flex:1;' + (sentiment === s ? "background:var(--slate-900);border-color:var(--slate-900);color:#fff" : "") + '" data-act="preview-after" data-arg="' + s + '">' + s + "</button>";
      }).join("") + "</div>" +
        thanksScreen(followUpFor(sentiment, PROJECT), sentiment === "positive" ? "published" : "pending", sentiment, PROJECT, null);
    }
    return head + '<div class="browser"><div class="browser-bar"><i style="background:#ef9a8e"></i><i style="background:#edcb7d"></i><i style="background:#9bc4a1"></i>' +
      '<span class="url">' + esc(PROJECT.domain) + '</span></div><div class="browser-body">' +
      '<div class="row" style="margin-bottom:14px"><span style="display:grid;width:28px;height:28px;place-items:center;border-radius:6px;color:#fff;font-size:12px;font-weight:600;background:' + esc(PROJECT.brandColor) + '">' + esc(PROJECT.name.charAt(0).toUpperCase()) + "</span>" +
      "<strong style=\"font-size:12px\">" + esc(PROJECT.name) + "</strong></div>" + inner + "</div></div>" +
      '<div style="margin-top:16px;padding:12px;border:1px solid #e9edf2;border-radius:10px;background:#fff">' +
      '<div class="between"><h3 style="font-size:12px">Embed code</h3><button class="btn small ghost-blue" data-act="copy-snippet">Copy</button></div>' +
      "<pre class=\"code\" style=\"margin-top:8px\">" + esc(embedSnippet()) + "</pre>" +
      '<p class="tiny muted" style="margin-top:8px">Allowed domains: <strong>' + esc([PROJECT.domain].concat(PROJECT.allowedDomains || []).join(", ")) + "</strong><br />The widget only loads on these domains. Manage the list in Business reputation → Protection &amp; Settings.</p></div>";
  }
  function previewPanel() {
    var tabs = [["reviews", "Feed"], ["form", "Form"], ["badge", "Badge"], ["all-in-one", "All-in-one"], ["after", "After submission"]].map(function (t) {
      return '<button type="button" role="tab" aria-selected="' + (S.preview.kind === t[0]) + '" data-act="preview-kind" data-arg="' + t[0] + '">' + t[1] + "</button>";
    }).join("");
    return panelShell("Widget preview", "Settings in Business reputation are applied below.", previewBody(),
      '<button class="btn primary" style="width:100%" data-act="copy-snippet">Copy embed code</button>', 430, tabs);
  }
  function actionsPanel() {
    var r = REVIEWS.filter(function (x) { return x.id === S.actions.id; })[0];
    if (!r) return "";
    var actions = [
      ["publish", "Publish on the website", r.status !== "published"],
      ["unpublish", "Return to moderation", r.status === "published"],
      ["approve", "Approve", r.status === "pending"],
      ["reject", "Reject", r.status !== "rejected"],
      ["spam", "Mark as spam", r.status !== "spam"],
      ["pin", "Pin to the top", !r.pinned],
      ["unpin", "Unpin", r.pinned],
      ["hide", "Hide review text", !r.hiddenText],
      ["show", "Show review text", r.hiddenText],
      ["delay", "Delay publication by 24 h", true]
    ].filter(function (a) { return a[2]; });
    return panelShell("Review actions", r.authorName + " · " + date(r.createdAt),
      '<div class="row" style="margin-bottom:12px">' + stars(r.rating) + statusBadge(r) + (r.pinned ? '<span class="badge info">Pinned</span>' : "") + "</div>" +
      '<p style="padding:12px;border:1px solid #f1f5f9;border-radius:10px;background:#f8fafc;font-size:13px">' + esc(r.content) + "</p>" +
      '<div class="tiny muted" style="margin:10px 0 16px">Source: ' + esc(r.source) + " · ID " + esc(r.id) + "</div>" +
      '<h3 style="font-size:12px;margin-bottom:8px">Change the rating</h3><div class="row" style="margin-bottom:16px">' +
      [1, 2, 3, 4, 5].map(function (v) {
        return '<button class="btn small" style="' + (v === r.rating ? "background:var(--blue);border-color:var(--blue);color:#fff" : "") + '" data-act="change-rating" data-id="' + r.id + '" data-arg="' + v + '">' + v + " ★</button>";
      }).join("") + "</div>" +
      '<h3 style="font-size:12px;margin-bottom:8px">Company reply</h3>' +
      '<textarea class="field" rows="4" placeholder="Thank you for sharing your feedback…" data-act="reply-text">' + esc(S.actions.reply || r.companyReply || "") + "</textarea>" +
      '<div class="row" style="margin-top:10px"><button class="btn primary small" data-act="review-action" data-arg="reply" data-id="' + r.id + '">Publish reply</button></div>' +
      '<h3 style="font-size:12px;margin:20px 0 8px">Moderation</h3><div class="row">' +
      actions.map(function (a) { return '<button class="btn small" data-act="review-action" data-arg="' + a[0] + '" data-id="' + r.id + '">' + a[1] + "</button>"; }).join("") + "</div>" +
      '<h3 style="font-size:12px;margin:20px 0 8px">Contact the author</h3><div class="row">' +
      '<button class="btn small" data-act="local" data-arg="link" data-id="' + r.id + '">Copy review link</button>' +
      '<button class="btn small" data-act="local" data-arg="id" data-id="' + r.id + '">Copy review ID</button>' +
      '<button class="btn small" data-act="local" data-arg="mail" data-id="' + r.id + '"' + (r.authorEmail ? "" : " disabled") + ">Email the author</button>" +
      '<button class="btn small" data-act="local" data-arg="support" data-id="' + r.id + '"' + (PROJECT.supportEmail ? "" : " disabled") + ">Email support</button>" +
      '<button class="btn small" data-act="local" data-arg="export" data-id="' + r.id + '">Export JSON</button>' +
      "</div>",
      '<button class="btn" style="width:100%" data-act="close-panel">Close</button>', 470);
  }
  function messagePanel() {
    var index = -1;
    var reminder = S.rep.draft.reminders.filter(function (r, i) { index = i; return r.id === S.rep.messageId; })[0];
    if (!reminder) return "";
    return panelShell("Edit reminder message", "Write the message customers will receive.",
      '<p class="tiny muted">Reminder ' + (index + 1) + " · " + (reminder.channel === "whatsapp" ? "WhatsApp" : reminder.channel === "sms" ? "SMS" : "Email") + "</p>" +
      '<label class="label" style="margin-top:14px">Message text</label>' +
      '<textarea class="field" rows="6" data-act="rem-message-text">' + esc(S.rep.messageDraft) + "</textarea>" +
      '<p class="tiny muted" style="margin-top:10px">Personalization variables: {name}, {link}</p>' +
      '<p class="tiny muted">Save the reputation settings to apply this change.</p>',
      '<div class="row"><button class="btn" style="flex:1" data-act="rem-message-cancel">Cancel</button>' +
      '<button class="btn primary" style="flex:1" data-act="rem-message-save"' + (S.rep.messageDraft.trim() ? "" : " disabled") + ">Save message</button></div>", 480);
  }
  function composerPanel() {
    var c = S.composer;
    return panelShell("Add a review", "Creates a review as if it came from the website form.",
      '<label class="label">Rating</label><div class="row" style="margin-bottom:14px">' +
      [1, 2, 3, 4, 5].map(function (v) {
        return '<button class="btn small" style="' + (v === c.rating ? "background:var(--blue);border-color:var(--blue);color:#fff" : "") + '" data-act="composer-rating" data-arg="' + v + '">' + v + " ★</button>";
      }).join("") + "</div>" +
      '<label class="label">Author name</label><input class="field" value="' + esc(c.name) + '" data-act="composer-field" data-arg="name" />' +
      '<label class="label" style="margin-top:12px">Email</label><input class="field" type="email" value="' + esc(c.email) + '" data-act="composer-field" data-arg="email" />' +
      '<label class="label" style="margin-top:12px">Review text</label><textarea class="field" rows="4" data-act="composer-field" data-arg="text">' + esc(c.text) + "</textarea>" +
      '<p class="tiny muted" style="margin-top:10px">Level: ' + sentimentOf(c.rating, PROJECT) + " (" + c.rating + " ★)</p>",
      '<button class="btn primary" style="width:100%" data-act="composer-submit">Add review</button>', 430);
  }
  function renderPanels() {
    var html = "";
    if (S.preview.open) html += previewPanel();
    if (S.actions.open) html += actionsPanel();
    if (S.rep.messageId) html += messagePanel();
    if (S.composer.open) html += composerPanel();
    document.getElementById("panels").innerHTML = html;
  }

  /* ── Review actions (mirrors /api/reviews/[id]) ────────────────────────── */
  var ACTION_MESSAGES = {
    approve: "Review approved for publication.", reject: "Review rejected.", spam: "Review marked as spam.",
    reply: "Company reply published.", publish: "Review published on your website.", unpublish: "Review returned to moderation.",
    delay: "Publication delayed by 24 hours.", hide: "Review text hidden on your website.", show: "Review text is visible again.",
    pin: "Review pinned to the top of your feed.", unpin: "Review unpinned.", change_rating: "Rating and sentiment updated."
  };
  function applyReviewAction(id, action, value) {
    var r = REVIEWS.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    var now = new Date().toISOString();
    if (action === "approve" || action === "publish") { r.status = "published"; r.publishedAt = now; r.scheduledAt = null; }
    else if (action === "unpublish") { r.status = "pending"; r.publishedAt = null; }
    else if (action === "reject") { r.status = "rejected"; r.publishedAt = null; }
    else if (action === "spam") { r.status = "spam"; r.publishedAt = null; }
    else if (action === "pin") r.pinned = true;
    else if (action === "unpin") r.pinned = false;
    else if (action === "hide") r.hiddenText = true;
    else if (action === "show") r.hiddenText = false;
    else if (action === "delay") { r.status = "queued"; r.publishedAt = null; r.scheduledAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); }
    else if (action === "change_rating") {
      r.rating = Number(value) || r.rating;
      r.sentiment = sentimentOf(r.rating, PROJECT);
    } else if (action === "reply") {
      var text = String(S.actions.reply || "").trim();
      if (text.length < 2) { toast("Write a reply before publishing it."); return; }
      r.companyReply = text.slice(0, 2000);
      r.replyAt = now;
      S.actions.reply = "";
    }
    toast(ACTION_MESSAGES[action] || "Saved.");
    render();
  }

  /* ── Render ────────────────────────────────────────────────────────────── */
  function viewHtml() {
    switch (S.view) {
      case "overview": return viewOverview();
      case "queue": return viewQueue();
      case "moderation": return viewModeration();
      case "clients": return viewClients();
      case "channels": return viewChannels();
      case "team": return viewTeam();
      case "reputation": return viewReputation();
      case "messages": return viewMessages();
      case "analytics": return viewAnalytics();
      case "widgets": return viewWidgets();
      case "settings": return viewSettings();
      default: return viewReviews();
    }
  }
  function keyOf(el) {
    if (!el || !el.getAttribute) return null;
    var act = el.getAttribute("data-act");
    if (!act) return null;
    return act + "|" + (el.getAttribute("data-arg") || "") + "|" + (el.getAttribute("data-id") || "") + "|" + (el.name || "");
  }
  function render() {
    var active = document.activeElement;
    var key = keyOf(active);
    var caret = active && typeof active.selectionStart === "number" ? active.selectionStart : null;
    renderSidebar();
    document.getElementById("main").innerHTML = viewHtml();
    renderPanels();
    if (key) {
      var match = Array.prototype.filter.call(document.querySelectorAll("[data-act]"), function (el) { return keyOf(el) === key; })[0];
      if (match) {
        match.focus();
        if (caret !== null && typeof match.selectionStart === "number") {
          try { match.setSelectionRange(caret, caret); } catch (e) { /* number inputs reject setSelectionRange */ }
        }
      }
    }
  }

  /* ── Events: clicks ────────────────────────────────────────────────────── */
  document.addEventListener("click", function (event) {
    var helpBtn = event.target.closest ? event.target.closest("[data-act='help']") : null;
    if (helpBtn) {
      var wrap = helpBtn.parentNode;
      var open = wrap.classList.toggle("open");
      helpBtn.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }
    if (event.target.closest && event.target.closest("[data-help]") && !event.target.closest(".rep-help")) {
      Array.prototype.forEach.call(document.querySelectorAll("[data-help].open"), function (w) {
        w.classList.remove("open");
        var b = w.querySelector(".rep-help");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    }
    var el = event.target.closest ? event.target.closest("[data-act]") : null;
    if (!el) return;
    var act = el.getAttribute("data-act");
    var arg = el.getAttribute("data-arg");
    var id = el.getAttribute("data-id");
    var d = S.rep.draft;

    switch (act) {
      case "nav":
        S.view = el.getAttribute("data-view");
        S.rep.messageId = null;
        render();
        window.scrollTo(0, 0);
        break;
      case "toptab": S.topTab = arg; S.filter = "all"; render(); break;
      case "filter": S.filter = arg; render(); break;
      case "filters": S.filter = "all"; toast("Use the tabs to filter by status or level."); render(); break;
      case "toggle-stats": S.stats = !S.stats; render(); break;
      case "select-all":
        if (el.checked) filteredReviews().forEach(function (r) { S.selected[r.id] = true; });
        else S.selected = {};
        render();
        break;
      case "select-row":
        if (S.selected[arg]) delete S.selected[arg]; else S.selected[arg] = true;
        render();
        break;
      case "export-csv": exportCsv(); break;
      case "print": window.print(); break;
      case "toast": toast(arg); break;

      case "open-actions": S.actions = { open: true, id: arg, reply: "" }; render(); break;
      case "review-action": applyReviewAction(id, arg); break;
      case "change-rating": applyReviewAction(id, "change_rating", arg); break;
      case "local": localAction(id, arg); break;

      case "toggle-smart-queue": PROJECT.smartQueueEnabled = !PROJECT.smartQueueEnabled; S.rep.draft = clone(PROJECT); toast("Smart queue " + (PROJECT.smartQueueEnabled ? "enabled" : "disabled") + "."); render(); break;

      /* reputation hub */
      case "rep-section": S.rep.section = arg; render(); break;
      case "rep-goto": S.rep.section = arg; render(); break;
      case "rep-category": S.rep.category = arg; render(); break;
      case "rep-star":
        var rating = Number(arg);
        if (S.rep.category === "positive") { d.positiveThreshold = rating; d.neutralThreshold = Math.min(d.neutralThreshold, rating); }
        else if (S.rep.category === "neutral") d.neutralThreshold = rating;
        else d.neutralThreshold = rating + 1;
        render();
        break;
      case "rep-toggle": d[arg] = !d[arg]; render(); break;
      case "rep-lookback": d.negativeLookbackCount = Number(arg); render(); break;
      case "rep-channel-toggle":
        d[S.rep.category + "NotifyChannels"][arg].enabled = !d[S.rep.category + "NotifyChannels"][arg].enabled;
        render();
        break;
      case "rep-save": saveReputation(); break;
      case "rep-discard": discardReputation(); break;

      case "domain-add": d.allowedDomains = (d.allowedDomains || []).concat([""]); render(); break;
      case "domain-remove": d.allowedDomains = (d.allowedDomains || []).filter(function (_, i) { return i !== Number(arg); }); render(); break;

      case "rem-add":
        var newId = "rem-" + Math.random().toString(36).slice(2, 8);
        d.reminders.push({ id: newId, delayMinutes: 3 * 1440, channel: "email", target: "", message: "Hello {name}! We would love to hear about your experience. Leave a review here: {link}", enabled: true });
        S.rep.units[newId] = "days";
        render();
        break;
      case "rem-toggle":
        var target = d.reminders.filter(function (r) { return r.id === arg; })[0];
        target.enabled = !(target.enabled !== false);
        render();
        break;
      case "rem-delete": d.reminders = d.reminders.filter(function (r) { return r.id !== arg; }); render(); break;
      case "rem-message":
        var editing = d.reminders.filter(function (r) { return r.id === arg; })[0];
        S.rep.messageId = arg;
        S.rep.messageDraft = editing.message;
        render();
        break;
      case "rem-message-save":
        var saved = d.reminders.filter(function (r) { return r.id === S.rep.messageId; })[0];
        if (saved) saved.message = S.rep.messageDraft.trim();
        S.rep.messageId = null;
        render();
        break;
      case "rem-message-cancel": S.rep.messageId = null; render(); break;

      /* widgets */
      case "widget-type": S.widgetType = arg; S.sandboxThanks = null; render(); break;
      case "copy-snippet": copyText(embedSnippet()); break;
      case "open-preview": S.preview = { open: true, kind: S.preview.kind || "reviews", after: S.preview.after || "negative", thanks: null }; render(); break;
      case "preview-kind": S.preview.kind = arg; render(); break;
      case "preview-after": S.preview.after = arg; render(); break;
      case "close-panel":
        if (event.target.closest("[data-panel]") && event.target !== el) break;
        S.preview.open = false; S.actions.open = false; S.rep.messageId = null; S.composer.open = false;
        render();
        break;

      /* sandbox widget */
      case "sandbox-rating": S.sandbox.rating = Number(arg); render(); break;
      case "sandbox-reset": S.sandboxThanks = null; render(); break;

      /* composer */
      case "open-composer": S.composer = { open: true, rating: 5, name: "", email: "", text: "" }; render(); break;
      case "composer-rating": S.composer.rating = Number(arg); render(); break;
      case "composer-submit": addReviewFromComposer(); break;

      /* settings */
      case "settings-tab": S.settingsTab = arg; render(); break;
      case "analytics-tab": S.analyticsTab = arg; render(); break;
      case "save-settings": toast("Settings saved."); break;
      default: break;
    }
  });

  /* ── Events: inputs ────────────────────────────────────────────────────── */
  document.addEventListener("input", function (event) {
    var el = event.target;
    var act = el.getAttribute && el.getAttribute("data-act");
    if (!act) return;
    var arg = el.getAttribute("data-arg");
    var d = S.rep.draft;
    switch (act) {
      case "search": S.search = el.value; render(); break;
      case "rep-set": d[arg] = el.value; updateFooter(); break;
      case "rep-num": d[arg] = Number(el.value) || 0; updateFooter(); break;
      case "rep-channel": d[S.rep.category + "NotifyChannels"][arg].value = el.value; updateFooter(); break;
      case "domain-edit": d.allowedDomains[Number(arg)] = el.value; updateFooter(); break;
      case "rem-time":
        var r = d.reminders.filter(function (x) { return x.id === arg; })[0];
        if (r) {
          var unit = S.rep.units[arg] || inferUnit(r.delayMinutes);
          r.delayMinutes = Math.max(0, Math.round(Number(el.value) || 0)) * multiplier(unit);
        }
        updateFooter();
        break;
      case "rem-target":
        var rt = d.reminders.filter(function (x) { return x.id === arg; })[0];
        if (rt) rt.target = el.value;
        updateFooter();
        break;
      case "rem-message-text": S.rep.messageDraft = el.value; break;
      case "reply-text": S.actions.reply = el.value; break;
      case "sandbox-field": S.sandbox[arg] = el.value; break;
      case "composer-field": S.composer[arg] = el.value; break;
      case "set-project":
        PROJECT[arg] = el.value;
        S.rep.draft = clone(PROJECT);
        if (arg === "name") document.getElementById("header-company").textContent = PROJECT.name;
        break;
      default: break;
    }
  });
  document.addEventListener("change", function (event) {
    var el = event.target;
    var act = el.getAttribute && el.getAttribute("data-act");
    if (!act) return;
    var arg = el.getAttribute("data-arg");
    var d = S.rep.draft;
    if (act === "rep-set" && el.tagName === "SELECT") { d[arg] = el.value; render(); }
    else if (act === "set-project" && el.tagName === "SELECT") { PROJECT[arg] = el.value; S.rep.draft = clone(PROJECT); render(); }
    else if (act === "set-project" && el.type === "color") { PROJECT[arg] = el.value; S.rep.draft = clone(PROJECT); render(); }
    else if (act === "sandbox-anonymous") { S.sandbox.anonymous = el.checked; }
    else if (act === "rem-channel") {
      var target = d.reminders.filter(function (x) { return x.id === arg; })[0];
      if (target) target.channel = el.value;
      updateFooter();
    } else if (act === "rem-unit") {
      var reminder = d.reminders.filter(function (x) { return x.id === arg; })[0];
      if (reminder) {
        var previousUnit = S.rep.units[arg] || inferUnit(reminder.delayMinutes);
        var amount = Math.round(reminder.delayMinutes / multiplier(previousUnit));
        S.rep.units[arg] = el.value;
        reminder.delayMinutes = amount * multiplier(el.value);
      }
      render();
    }
  });
  document.addEventListener("submit", function (event) {
    if (event.target.hasAttribute && event.target.hasAttribute("data-widget-form")) {
      event.preventDefault();
      submitSandbox();
    }
  });
  document.getElementById("toggle-sidebar").addEventListener("click", function () {
    S.sidebar = !S.sidebar;
    render();
  });
  document.getElementById("global-search").addEventListener("input", function (event) {
    S.search = event.target.value;
    if (S.view !== "reviews") { S.view = "reviews"; }
    render();
    var box = document.getElementById("global-search");
    box.value = S.search;
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (S.preview.open || S.actions.open || S.rep.messageId || S.composer.open) {
        S.preview.open = false; S.actions.open = false; S.rep.messageId = null; S.composer.open = false;
        render();
      }
    }
  });
  document.addEventListener("mouseover", function (event) {
    var wrap = event.target.closest ? event.target.closest("[data-help]") : null;
    if (wrap) {
      wrap.classList.add("open");
      var b = wrap.querySelector(".rep-help");
      if (b) b.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("mouseout", function (event) {
    var wrap = event.target.closest ? event.target.closest("[data-help]") : null;
    if (wrap && !wrap.contains(event.relatedTarget)) {
      wrap.classList.remove("open");
      var b = wrap.querySelector(".rep-help");
      if (b) b.setAttribute("aria-expanded", "false");
    }
  });

  function updateFooter() {
    var footer = document.querySelector(".rep-footer");
    if (!footer) return;
    footer.innerHTML = "<span>" + (repDirty() ? "You have unsaved changes" : "All settings are up to date") + "</span>" +
      '<div class="rep-footer-actions">' +
      (repDirty() ? '<button type="button" class="rep-button quiet" data-act="rep-discard">Discard changes</button>' : "") +
      '<button type="button" class="rep-button primary" data-act="rep-save"' + (repDirty() ? "" : " disabled") + ">Save changes</button></div>";
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Widget code copied."); }, function () { toast("Select the code and copy it manually."); });
    } else {
      toast("Select the code and copy it manually.");
    }
  }
  function exportCsv() {
    var lines = ["ID,Author,Date,Rating,Sentiment,Status,Content"].concat(filteredReviews().map(function (r) {
      return '"' + r.id + '","' + r.authorName + '","' + r.createdAt + '","' + r.rating + '","' + r.sentiment + '","' + r.status + '","' + r.content.replace(/"/g, '""') + '"';
    }));
    var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "reviews_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("CSV download started.");
  }
  function localAction(id, kind) {
    var r = REVIEWS.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    var ref = window.location.href.split("?")[0] + "?review=" + encodeURIComponent(r.id);
    if (kind === "link" || kind === "id") { copyText(kind === "link" ? ref : r.id); return; }
    if (kind === "export") {
      var blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "review-" + r.id + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Review download started.");
      return;
    }
    if (kind === "mail" || kind === "support") {
      var recipient = kind === "support" ? PROJECT.supportEmail : r.authorEmail;
      if (!recipient) { toast("A valid email address is required."); return; }
      var subject = kind === "support" ? "Review needs attention: " + r.authorName : "Your review of " + PROJECT.name;
      window.location.href = "mailto:" + encodeURIComponent(recipient) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(r.content + "\n\n" + ref);
      toast("Opening a draft in your email app.");
    }
  }
  function addReviewFromComposer() {
    var c = S.composer;
    if (String(c.name).trim().length < 2) { toast("Enter an author name."); return; }
    var rating = Number(c.rating) || 5;
    var sentiment = sentimentOf(rating, PROJECT);
    seq += 1;
    REVIEWS.unshift({
      id: "rev-" + String(seq).padStart(3, "0"),
      authorName: String(c.name).trim(), authorEmail: String(c.email || "").trim(), authorCity: "",
      isAnonymous: false, rating: rating, sentiment: sentiment, content: String(c.text || "").trim(),
      source: "Review form", status: "pending", createdAt: new Date().toISOString(),
      scheduledAt: null, publishedAt: null, companyReply: null, replyAt: null, hiddenText: false, pinned: false
    });
    S.composer = { open: false, rating: 5, name: "", email: "", text: "" };
    toast("Review added successfully.");
    render();
  }

  render();
})();
