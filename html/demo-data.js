/* Demo data + in-memory API for the standalone HTML build.
   The bundle is the real application code (src/app/dashboard.tsx and its
   components); this file only replaces the server: it provides `initialData`
   exactly like GET /api/dashboard and answers the same endpoints in memory. */
(function () {
  "use strict";

  function hoursAgo(hours) { return new Date(Date.now() - hours * 3600 * 1000).toISOString(); }
  function channels(email, whatsapp, sms) {
    return {
      email: { enabled: true, value: email },
      whatsapp: { enabled: !!whatsapp, value: whatsapp || "" },
      sms: { enabled: !!sms, value: sms || "" }
    };
  }

  /* Two small demo photos (PNG data URLs) so the attachment UI has something to show. */
  var DEMO_PHOTOS = [
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAABJklEQVR42u3bsQ3CQAwFUM/FNIzCDIzCMPRZgI6eAokGkoCU853Dk/4ETy4u8XecjwdZSCAABAgQIECAAAESQIAAAQIECBAgAQQIECBAr1wvp7n8L9ACylBYUYKmI1MUounCFOVokpmiu879Ni2nr1H0oll1+UmqJNCGNN8wFQNqpJNvFGk6m9CsMlUF2lxnzqgAUJpOjlGU1kkwaguUoPPRaFCgLuPTeohiB+PTdIhiHzrtjAClAI2g08gIEKDRgDrqvBsNATTO+LQYIkCAAAECBAgQIEBe0r7FAAGqCuSPIiBbDXsxm9WCq2e7ee0O/SANMx1FLdeKLVc9aU17txqufdyLuTh0s+qo19UzIECABBAgQIAAAQIESAABAgQIECBAgOSZB/JIwpR97AJbAAAAAElFTkSuQmCC",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAIAAABt+uBvAAAApklEQVR42u3aMQkAIBRAQWOZwRRGcDaGCcXZEDb4o4gcvAQ3v9RHU1BCAAgQIECAAAECJECAAAECBAgQIAEC9CLQ2vOdAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAECBAgQIECAAAGyAQMSIECAAAECBAiQAAECBAgQoE+AaskKAgQIECBAgAABAiRAgAABAgQIECABAgToVge40g1sca+jtwAAAABJRU5ErkJggg=="
  ];

  var project = {
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
    positiveNotifyChannels: channels("hello@zerno.coffee"),
    neutralNotifyChannels: channels("hello@zerno.coffee", "+1 555 010 2030"),
    negativeNotifyChannels: channels("owner@zerno.coffee", "", "+1 555 010 2030"),
    positiveNotify: false,
    neutralNotify: true,
    negativeNotify: true,
    positiveAutoReplyEnabled: true,
    neutralAutoReplyEnabled: false,
    negativeAutoReplyEnabled: false,
    positiveAutoReplyTemplate: "Thank you for your great review! We look forward to welcoming you back.",
    neutralAutoReplyTemplate: "Thank you for your feedback! Please let us know how we can improve.",
    negativeAutoReplyTemplate: "We are sorry about your experience. Please contact our support team so we can make it right.",
    replySlaHours: 24,
    replyRequiredNegative: true,
    replySignature: "Zerna Coffee support team",
    reminders: [
      { id: "rem-3d", delayMinutes: 4320, channel: "email", target: "", message: "Hello {name}! We would love to hear about your experience. Leave a review here: {link}", enabled: true },
      { id: "rem-7d", delayMinutes: 10080, channel: "whatsapp", target: "+1 555 010 2030", message: "Hello {name}, your table is waiting — and so is your review: {link}", enabled: true },
      { id: "rem-14d", delayMinutes: 20160, channel: "sms", target: "", message: "Hi {name}! One minute for a review? {link}", enabled: false }
    ],
    invitePositiveToExternal: true,
    googleReviewUrl: "https://g.page/r/zerna-coffee/review",
    allowAnonymousReviews: true,
    reviewTextRequired: false,
    allowPhotos: true,
    maxPhotos: 3,
    maxPhotoSizeKb: 400,
    formShowEmail: true,
    formShowCity: true,
    formShowComment: true,
    formFields: [
      { id: "cf-visit", label: "What did you order?", type: "select", options: ["Coffee", "Breakfast", "Dessert"], required: false, showPublic: true },
      { id: "cf-table", label: "Table number", type: "text", options: [], required: false, showPublic: false }
    ],
    badgeFormat: "full",
    badgeSize: "medium",
    badgeTheme: "light",
    badgeShape: "rounded",
    badgeShowCount: true,
    badgeLabel: "",
    publicShowCity: false,
    publicShowDate: true,
    publicShowName: true,
    publicShowText: true,
    publicShowAvatar: true,
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
    minReviewLength: 10,
    maxReviewsPerIp: 3,
    minIntervalMinutes: 15,
    maxPerHour: 10,
    maxPerDay: 50,
    maxNegativeShare: 20,
    randomizeOrder: false,
    primeTimeBoost: true,
    hideNegativeText: false,
    createdAt: "2026-01-12T09:00:00.000Z"
  };

  /* The same demo reviews the app seeds in src/lib/dashboard-data.ts. */
  var counter = 0;
  function review(name, email, city, rating, content, status, hoursBack, extra) {
    counter += 1;
    var createdAt = hoursAgo(hoursBack);
    return Object.assign({
      id: "9a0c0000-0000-4000-8000-0000000000" + String(counter).padStart(2, "0"),
      projectId: project.id,
      authorName: name,
      authorEmail: email,
      authorCity: city,
      isAnonymous: false,
      rating: rating,
      sentiment: rating >= project.positiveThreshold ? "positive" : rating >= project.neutralThreshold ? "neutral" : "negative",
      content: content,
      source: "Виджет сайта",
      status: status,
      createdAt: createdAt,
      scheduledAt: null,
      publishedAt: status === "published" ? hoursAgo(hoursBack - 0.2) : null,
      companyReply: null,
      replyAt: null,
      hiddenText: false,
      pinned: false,
      photos: [],
      authorKind: "customer",
      addedBy: null,
      customFields: []
    }, extra || {});
  }

  var reviews = [
    review("Valeria M.", "valeria@example.com", "New York", 5, "Such a cozy spot — the matcha and the pour-over are love. I will definitely come back!", "published", 0.6, { companyReply: "Valeria, thank you for the warm words! We look forward to seeing you again ☕", replyAt: hoursAgo(0.1), photos: [DEMO_PHOTOS[0], DEMO_PHOTOS[1]], customFields: [{ id: "cf-visit", label: "What did you order?", value: "Coffee", showPublic: true }] }),
    review("Artem S.", "artem@example.com", "Chicago", 5, "The best cappuccino in the city. The barista helped me pick a bean, and now I come here first.", "published", 4, { companyReply: "Artem, glad we helped you find your taste. See you soon!" }),
    review("Anna K.", "anna@example.com", "Boston", 4, "Delicious and atmospheric, but we waited a bit long for the order. Otherwise everything was great.", "published", 26, { companyReply: "Anna, thanks for the feedback — we have already discussed serving speed with the team." }),
    review("Maria R.", "maria@example.com", "Seattle", 5, "Zerna has become my new Sunday tradition. Thank you for the cozy atmosphere and great coffee!", "published", 50, { photos: [DEMO_PHOTOS[1]] }),
    review("Pavel T.", "pavel@example.com", "Austin", 3, "The dessert was not very fresh. I hope you will fix this. The coffee itself was excellent.", "published", 73, { companyReply: "Pavel, we are sorry about this experience. Please reach out — we want to make it right." }),
    review("Polina D.", "polina@example.com", "Portland", 5, "Very attentive service and an incredibly delicious raf. Beautiful and calm inside.", "published", 101, { isAnonymous: true }),
    review("Sergey V.", "sergey@example.com", "Denver", 5, "Great place, beautiful interior, and excellent coffee. I stopped by on a whim — I will come back on purpose.", "queued", 0.4, { scheduledAt: new Date(Date.now() + 35 * 60 * 1000).toISOString() }),
    review("Kristina L.", "kristina@example.com", "San Diego", 5, "Very pleasant staff. I stopped by for a minute and stayed for a whole hour.", "queued", 1, { scheduledAt: new Date(Date.now() + 90 * 60 * 1000).toISOString() }),
    review("Ivan K.", "ivan@example.com", "Miami", 1, "I waited almost forty minutes for my order and the coffee went cold. I am very disappointed with the service.", "pending", 1.2),
    review("Marina B.", "marina@example.com", "Los Angeles", 3, "Everything was fine, but the tables were full and I had to wait at the entrance.", "pending", 2.4),
    review("Roman F.", "roman@example.com", "Dallas", 2, "I expected more from breakfast: the dishes were served cold and the waiter did not notice.", "pending", 3.1),
    review("Olga N.", "olga@example.com", "Philadelphia", 4, "Good coffee, but I would like more sugar-free syrup options.", "pending", 5.5),
    review("Nina W.", "", "Rotterdam", 5, "Left a review by phone after the order — the manager passed it on with the customer's permission.", "published", 8, { source: "Added manually", authorKind: "employee", addedBy: "Administrator", photos: [DEMO_PHOTOS[0]] })
  ];

  function isPhotoValue(value) {
    if (typeof value !== "string" || !value) return false;
    return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) || /^https:\/\//.test(value);
  }

  function sentimentOf(rating) {
    return rating >= project.positiveThreshold ? "positive" : rating >= project.neutralThreshold ? "neutral" : "negative";
  }
  function metrics() {
    var published = reviews.filter(function (r) { return r.status === "published"; });
    var average = published.length
      ? Math.round(published.reduce(function (sum, r) { return sum + r.rating; }, 0) / published.length * 10) / 10
      : 0;
    var positive = published.filter(function (r) { return r.sentiment === "positive"; }).length;
    return {
      total: reviews.length,
      published: published.length,
      pending: reviews.filter(function (r) { return r.status === "pending"; }).length,
      queued: reviews.filter(function (r) { return r.status === "queued"; }).length,
      averageRating: average,
      positiveShare: published.length ? Math.round(positive / published.length * 100) : 0
    };
  }
  function dashboardData() {
    var published = reviews.filter(function (r) { return r.status === "published"; });
    return {
      project: JSON.parse(JSON.stringify(project)),
      reviews: JSON.parse(JSON.stringify(reviews)).sort(function (a, b) { return b.createdAt.localeCompare(a.createdAt); }),
      metrics: metrics(),
      ratingDistribution: [5, 4, 3, 2, 1].map(function (rating) {
        return { rating: rating, count: published.filter(function (r) { return r.rating === rating; }).length };
      }),
      weekly: Array.from({ length: 7 }, function (_, index) {
        var date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        var key = date.toISOString().slice(0, 10);
        var dayReviews = published.filter(function (r) { return (r.publishedAt || "").slice(0, 10) === key; });
        return {
          date: key,
          label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
          count: dayReviews.length,
          average: dayReviews.length
            ? Math.round(dayReviews.reduce(function (sum, r) { return sum + r.rating; }, 0) / dayReviews.length * 10) / 10
            : null
        };
      })
    };
  }

  window.__UPP_DEMO__ = dashboardData();

  /* ── In-memory replacements for the Next.js API routes ─────────────────── */
  function json(body, status) {
    return { ok: status < 400, status: status, json: function () { return Promise.resolve(body); } };
  }
  function find(id) { return reviews.filter(function (r) { return r.id === id; })[0]; }

  window.fetch = function (input, init) {
    var url = String((input && input.url) || input);
    var method = ((init && init.method) || "GET").toUpperCase();
    var body = init && init.body ? JSON.parse(init.body) : {};
    return Promise.resolve().then(function () {
      if (url.indexOf("/api/dashboard") === 0) return json(dashboardData(), 200);

      if (url.indexOf("/api/project") === 0 && method === "PATCH") {
        Object.keys(body).forEach(function (key) {
          if (key === "ratingScale") { project.ratingScale = "stars"; return; }
          if (key === "allowedDomains") {
            project.allowedDomains = (body.allowedDomains || [])
              .map(function (d) { return String(d || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+.*$/, ""); })
              .filter(function (d, i, all) { return d && all.indexOf(d) === i; });
            return;
          }
          project[key] = body[key];
        });
        reviews.forEach(function (r) { r.sentiment = sentimentOf(r.rating); });
        window.__UPP_DEMO__ = dashboardData();
        return json({ project: JSON.parse(JSON.stringify(project)) }, 200);
      }

      if (url.indexOf("/api/reviews") === 0 && method === "POST") {
        counter += 1;
        var rating = Number(body.rating) || 5;
        var sentiment = sentimentOf(rating);
        var mode = sentiment === "positive" ? project.positivePublishMode : sentiment === "neutral" ? project.neutralPublishMode : project.negativePublishMode;
        var authorKind = body.authorKind === "employee" ? "employee" : "customer";
        var addedBy = typeof body.addedBy === "string" ? body.addedBy.trim().slice(0, 120) : "";
        var submitted = Array.isArray(body.photos) ? body.photos.filter(isPhotoValue) : [];
        var customMissing = "";
        var customSnapshot = [];
        (project.formFields || []).forEach(function (field) {
          var raw = body.customFields && typeof body.customFields === "object" ? body.customFields[field.id] : undefined;
          var value = typeof raw === "string" ? raw.trim().slice(0, 500) : "";
          if (field.required && !value) { customMissing = field.label; return; }
          if (value) customSnapshot.push({ id: field.id, label: field.label, value: value, showPublic: !!field.showPublic });
        });
        if (customMissing) return json({ error: "Please fill in “" + customMissing + "”." }, 400);
        var created = review(
          String(body.authorName || "Guest"), body.authorEmail || "", body.authorCity || "",
          rating, String(body.content || ""), mode === "instant" ? "published" : mode === "delayed" ? "queued" : "pending", 0,
          { photos: project.allowPhotos ? submitted.slice(0, project.maxPhotos) : [], authorKind: authorKind, addedBy: addedBy || null, customFields: customSnapshot }
        );
        created.id = "9a0c0000-0000-4000-8000-0000000001" + String(counter).padStart(2, "0");
        created.source = authorKind === "employee" || addedBy ? "Added manually" : "Review form";
        reviews.unshift(created);
        window.__UPP_DEMO__ = dashboardData();
        return json({ review: JSON.parse(JSON.stringify(created)), followUp: followUp(sentiment) }, 201);
      }

      var match = /\/api\/reviews\/([^/?]+)/.exec(url);
      if (match && method === "PATCH") {
        var target = find(match[1]);
        if (!target) return json({ error: "Review not found." }, 404);
        var action = body.action;
        var now = new Date().toISOString();
        if (action === "approve" || action === "publish") { target.status = "published"; target.publishedAt = now; target.scheduledAt = null; }
        else if (action === "unpublish") { target.status = "pending"; target.publishedAt = null; }
        else if (action === "reject") { target.status = "rejected"; target.publishedAt = null; }
        else if (action === "spam") { target.status = "spam"; target.publishedAt = null; }
        else if (action === "pin") target.pinned = true;
        else if (action === "unpin") target.pinned = false;
        else if (action === "hide") target.hiddenText = true;
        else if (action === "show") target.hiddenText = false;
        else if (action === "delay") {
          var minutes = Number(body.minutes) || 30;
          target.status = "queued";
          target.publishedAt = null;
          target.scheduledAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();
        } else if (action === "change_rating") {
          target.rating = Number(body.rating) || target.rating;
          target.sentiment = sentimentOf(target.rating);
        } else if (action === "reply") {
          target.companyReply = String(body.reply || body.text || "").trim().slice(0, 2000);
          target.replyAt = now;
        }
        window.__UPP_DEMO__ = dashboardData();
        return json({ review: JSON.parse(JSON.stringify(target)) }, 200);
      }

      return json({ error: "Not found in the offline prototype." }, 404);
    });
  };

  /** Mirrors buildFollowUp() in src/lib/follow-up.ts. */
  function followUp(sentiment) {
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
        ? { contact: hasContact, chat: hasChat, email: project.supportEmail, chatUrl: project.supportChatUrl, text: project.supportOfferText }
        : null,
      google: null
    };
  }
})();
