(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;
  var projectId = script.getAttribute("data-project-id");
  if (!projectId) return;
  var apiBase = new URL(script.src, window.location.href).origin;
  var widgets = Array.prototype.slice.call(document.querySelectorAll("[data-widget]"));
  if (!widgets.length) return;

  var STAR = "#FBBC04"; // плоский жёлтый Google
  var GOOGLE_G =
    '<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">' +
    '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
    '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
    '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
    '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
    "</svg>";

  var styleId = "otklik-widget-styles";
  if (!document.getElementById(styleId)) {
    var style = document.createElement("style");
    style.id = styleId;
    // Все индикаторы плоские: без теней, градиентов и объёма
    style.textContent = [
      ".otklik-widget{--otklik-accent:#617a58;box-sizing:border-box;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#202124;max-width:100%;line-height:1.5}",
      ".otklik-widget *{box-sizing:border-box}",
      ".otklik-widget .ow-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px}",
      ".otklik-widget .ow-title{margin:0;color:#202124;font-size:20px;font-weight:650;letter-spacing:-.35px}",
      ".otklik-widget .ow-subtitle{margin:4px 0 0;color:#5f6368;font-size:13px}",
      ".otklik-widget .ow-rating{display:flex;align-items:center;gap:8px;white-space:nowrap}",
      ".otklik-widget .ow-stars{color:" + STAR + ";font-size:15px;letter-spacing:1px}",
      ".otklik-widget .ow-score{color:#202124;font-size:16px;font-weight:600}",
      ".otklik-widget .ow-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}",
      ".otklik-widget .ow-card{min-width:0;padding:15px;border:1px solid #dadce0;border-radius:10px;background:#fff}",
      ".otklik-widget .ow-card-head{display:flex;align-items:flex-start;gap:9px}",
      ".otklik-widget .ow-avatar{display:grid;width:30px;height:30px;flex:0 0 30px;place-items:center;border-radius:50%;background:#e8eff9;color:#5476a1;font-size:10px;font-weight:700}",
      ".otklik-widget .ow-card-info{min-width:0;flex:1}",
      ".otklik-widget .ow-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}",
      ".otklik-widget .ow-author{color:#202124;font-size:13px;font-weight:650}",
      ".otklik-widget .ow-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:2px;color:#80868b;font-size:10px}",
      ".otklik-widget .ow-date{color:#80868b;font-size:10px}",
      ".otklik-widget .ow-review-score{margin-top:5px;color:" + STAR + ";font-size:13px;letter-spacing:1px}",
      ".otklik-widget .ow-review-text{margin:9px 0 0;color:#3c4043;font-size:13px;line-height:1.65;overflow-wrap:anywhere}",
      ".otklik-widget .ow-review-text.ow-hidden{color:#80868b;font-style:italic}",
      ".otklik-widget .ow-reply{padding:9px 10px;margin-top:11px;border-left:2px solid var(--otklik-accent);border-radius:0 6px 6px 0;background:#f8f9fa;color:#3c4043;font-size:11px}",
      ".otklik-widget .ow-reply strong{display:block;margin-bottom:3px;color:#202124;font-size:10px}",
      ".otklik-widget .ow-empty,.otklik-widget .ow-error{padding:20px;border:1px dashed #dadce0;border-radius:10px;color:#5f6368;text-align:center;font-size:13px}",
      ".otklik-widget .ow-badge{display:inline-flex;flex-wrap:wrap;align-items:center;gap:9px;padding:10px 14px;border:1px solid #dadce0;border-radius:10px;background:#fff}",
      ".otklik-widget .ow-badge-score{color:#202124;font-size:19px;font-weight:600}",
      ".otklik-widget .ow-badge-caption{color:#5f6368;font-size:11px}",
      ".otklik-widget .ow-stars-big{font-size:19px;letter-spacing:2px}",
      ".otklik-widget .ow-badge-banner{display:flex;align-items:center;gap:12px;width:100%;max-width:420px}",
      ".otklik-widget .ow-badge-banner-left{display:flex;align-items:center;gap:8px}",
      ".otklik-widget .ow-badge-divider{width:1px;align-self:stretch;background:#dadce0}",
      ".otklik-widget .ow-form{max-width:540px;padding:20px;border:1px solid #b6bcc4;border-radius:12px;background:#fff}",
      ".otklik-widget .ow-form-title{margin:0;color:#202124;font-size:19px;font-weight:650}",
      ".otklik-widget .ow-form-description{margin:5px 0 16px;color:#5f6368;font-size:12px}",
      ".otklik-widget .ow-field{display:block;width:100%;padding:10px 11px;margin:9px 0;color:#202124;border:1px solid #8f959c;border-radius:7px;background:#fff;font:inherit;font-size:12px;outline:none}",
      ".otklik-widget .ow-field:focus{border-color:var(--otklik-accent);box-shadow:0 0 0 2px color-mix(in srgb, var(--otklik-accent) 25%, transparent)}",
      ".otklik-widget .ow-field::placeholder{color:#5f6368}",
      ".otklik-widget select.ow-field{appearance:auto}",
      ".otklik-widget .ow-field-label{display:block;margin:10px 0 0;color:#3c4043;font-size:11px;font-weight:600}",
      ".otklik-widget textarea.ow-field{min-height:94px;resize:vertical}",
      ".otklik-widget .ow-rate-label{display:block;margin:13px 0 7px;color:#5f6368;font-size:11px;font-weight:600}",
      ".otklik-widget .ow-rating-options{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px}",
      ".otklik-widget .ow-rating-choice{min-width:36px;height:35px;padding:0 7px;color:#3c4043;border:1px solid #8f959c;border-radius:7px;background:#fff;font:inherit;font-size:12px;cursor:pointer}",
      ".otklik-widget .ow-rating-choice:hover,.otklik-widget .ow-rating-choice.selected{color:#fff;border-color:var(--otklik-accent);background:var(--otklik-accent)}",
      ".otklik-widget .ow-submit{min-height:39px;padding:0 16px;color:#fff;border:0;border-radius:7px;background:var(--otklik-accent);font:inherit;font-size:12px;font-weight:650;cursor:pointer}",
      ".otklik-widget .ow-submit:hover{filter:brightness(.94)}",
      ".otklik-widget .ow-submit:disabled{opacity:.6;cursor:wait}",
      ".otklik-widget .ow-anonymous{display:flex;align-items:flex-start;gap:8px;margin:10px 0;color:#5f6c63;font-size:11px;line-height:1.45;cursor:pointer}",
      ".otklik-widget .ow-anonymous input{width:14px;height:14px;flex:0 0 14px;margin:1px 0 0;accent-color:var(--otklik-accent)}",
      ".otklik-widget .ow-optional{color:#8a958e;font-size:10px;font-weight:400}",
      ".otklik-widget .ow-message{min-height:18px;margin:8px 0 0;color:#188038;font-size:11px}",
      ".otklik-widget .ow-photos{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}",
      ".otklik-widget .ow-photo{width:74px;height:74px;object-fit:cover;border:1px solid #dadce0;border-radius:8px;background:#f1f3f4}",
      ".otklik-widget .ow-photos-field{margin-top:12px}",
      ".otklik-widget .ow-photo-pick{min-height:36px;padding:0 13px;color:#3c4043;border:1px dashed #dadce0;border-radius:7px;background:#fff;font:inherit;font-size:12px;cursor:pointer}",
      ".otklik-widget .ow-photo-pick:hover{background:#f8f9fa}",
      ".otklik-widget .ow-photo-pick:disabled{color:#9aa0a6;cursor:not-allowed}",
      ".otklik-widget .ow-photo-hint{margin:7px 0 0;color:#80868b;font-size:10px}",
      ".otklik-widget .ow-photo-hint.error{color:#d93025}",
      ".otklik-widget .ow-photo-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}",
      ".otklik-widget .ow-photo-thumb{position:relative;display:block;width:64px;height:64px}",
      ".otklik-widget .ow-photo-thumb img{width:64px;height:64px;object-fit:cover;border:1px solid #dadce0;border-radius:8px}",
      ".otklik-widget .ow-photo-remove{position:absolute;top:-6px;right:-6px;width:19px;height:19px;padding:0;color:#fff;border:0;border-radius:50%;background:#5f6368;font-size:12px;line-height:19px;cursor:pointer}",
      ".otklik-widget .ow-message.error{color:#d93025}",
      /* экран после отправки */
      ".otklik-widget .ow-thanks{max-width:540px;padding:22px;border:1px solid #dadce0;border-radius:12px;background:#fff;text-align:center}",
      ".otklik-widget .ow-thanks-icon{display:flex;width:42px;height:42px;margin:0 auto 10px;align-items:center;justify-content:center;border-radius:50%;background:var(--otklik-accent);color:#fff;font-size:20px}",
      ".otklik-widget .ow-thanks-title{margin:0;color:#202124;font-size:18px;font-weight:650}",
      ".otklik-widget .ow-thanks-text{margin:8px 0 0;color:#5f6368;font-size:13px;line-height:1.6}",
      ".otklik-widget .ow-actions{display:flex;flex-direction:column;gap:8px;margin-top:16px}",
      ".otklik-widget .ow-btn{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:8px;padding:0 16px;border:1px solid #dadce0;border-radius:8px;background:#fff;color:#3c4043;font:inherit;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer}",
      ".otklik-widget .ow-btn:hover{background:#f8f9fa}",
      ".otklik-widget .ow-btn-primary{border-color:var(--otklik-accent);background:var(--otklik-accent);color:#fff}",
      ".otklik-widget .ow-btn-primary:hover{background:var(--otklik-accent);filter:brightness(.94)}",
      ".otklik-widget .ow-btn-google{border-radius:999px}",
      ".otklik-widget.ow-dark{padding:14px;border-radius:12px;background:#202124;color:#e8eaed}",
      ".otklik-widget.ow-dark .ow-title,.otklik-widget.ow-dark .ow-author,.otklik-widget.ow-dark .ow-score,.otklik-widget.ow-dark .ow-badge-score,.otklik-widget.ow-dark .ow-thanks-title{color:#e8eaed}",
      ".otklik-widget.ow-dark .ow-card,.otklik-widget.ow-dark .ow-form,.otklik-widget.ow-dark .ow-badge,.otklik-widget.ow-dark .ow-thanks{border-color:#5f6368;background:#292a2d}",
      ".otklik-widget.ow-dark .ow-review-text,.otklik-widget.ow-dark .ow-form-description,.otklik-widget.ow-dark .ow-badge-caption,.otklik-widget.ow-dark .ow-thanks-text{color:#bdc1c6}",
      "@media(max-width:520px){.otklik-widget .ow-title{font-size:17px}.otklik-widget .ow-list{grid-template-columns:1fr}.otklik-widget .ow-rating{gap:5px}.otklik-widget .ow-badge{gap:6px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function safeUrl(value) {
    try {
      var u = new URL(String(value));
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
    } catch (_error) {
      return null;
    }
  }

  function safeEmail(value) {
    var v = String(value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
  }

  function stars(value) {
    var rating = Math.max(0, Math.min(5, Number(value) || 0));
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  }

  function scoreLabel(value, scale) {
    if (scale === "nps") return String(value) + "/10";
    if (scale === "binary") return Number(value) > 0 ? "Yes" : "No";
    if (scale === "emoji") return ["😡", "😕", "😐", "🙂", "😍"][Math.max(0, Math.min(4, Number(value) - 1))];
    return stars(value);
  }

  function formattedDate(value) {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
    } catch (_error) {
      return "";
    }
  }

  function initials(name) {
    return String(name || "A").split(/\s+/).filter(Boolean).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("") || "A";
  }

  function renderReviewFeed(container, payload, limit) {
    container.classList.add("ow-feed");
    var heading = element("div", "ow-heading");
    var titleWrap = element("div");
    var scale = payload.project.ratingScale || "stars";
    var scaleLabel = scale === "nps" ? " / 10" : scale === "binary" ? "" : " / 5";
    titleWrap.appendChild(element("h2", "ow-title", "What our customers say"));
    titleWrap.appendChild(element("p", "ow-subtitle", payload.metrics.averageRating.toFixed(1) + scaleLabel + " · " + payload.metrics.total + " reviews"));
    heading.appendChild(titleWrap);
    var rating = element("div", "ow-rating");
    if (scale === "stars") rating.appendChild(element("span", "ow-stars", "★★★★★"));
    rating.appendChild(element("span", "ow-score", payload.metrics.averageRating.toFixed(1) + (scale === "nps" ? "/10" : "")));
    heading.appendChild(rating);
    container.appendChild(heading);

    var reviews = Array.isArray(payload.reviews) ? payload.reviews.slice(0, limit) : [];
    if (!reviews.length) {
      container.appendChild(element("div", "ow-empty", "No published reviews yet."));
      return;
    }
    var list = element("div", "ow-list");
    reviews.forEach(function (review) {
      var card = element("article", "ow-card");
      var head = element("div", "ow-card-head");
      if (review.showAvatar !== false) {
        head.appendChild(element("span", "ow-avatar", review.isAnonymous ? "A" : initials(review.authorName)));
      }
      var info = element("div", "ow-card-info");
      var top = element("div", "ow-card-top");
      if (review.authorName) top.appendChild(element("strong", "ow-author", review.authorName));
      top.appendChild(element("span", "ow-review-score", scoreLabel(review.rating, scale)));
      info.appendChild(top);
      var metaParts = [];
      if (review.authorCity) metaParts.push(review.authorCity);
      var date = formattedDate(review.publishedAt);
      if (date) metaParts.push(date);
      if (metaParts.length) info.appendChild(element("div", "ow-meta", metaParts.join(" · ")));
      head.appendChild(info);
      card.appendChild(head);
      if (review.showText !== false) {
        if (review.hiddenText) {
          card.appendChild(element("p", "ow-review-text ow-hidden", "Text hidden by the moderator"));
        } else if (review.content) {
          card.appendChild(element("p", "ow-review-text", review.content));
        }
      }
      if (Array.isArray(review.photos) && review.photos.length) {
        var photoRow = element("div", "ow-photos");
        review.photos.forEach(function (src, index) {
          if (!isSafePhoto(src)) return;
          var photo = element("img", "ow-photo");
          photo.src = src;
          photo.alt = "Customer photo " + (index + 1);
          photo.loading = "lazy";
          photoRow.appendChild(photo);
        });
        if (photoRow.children.length) card.appendChild(photoRow);
      }
      if (Array.isArray(review.customFields) && review.customFields.length) {
        var customRow = element("div", "ow-meta");
        customRow.style.marginTop = "7px";
        review.customFields.forEach(function (field) {
          var item = element("span", "", field.label + ": " + field.value);
          customRow.appendChild(item);
        });
        card.appendChild(customRow);
      }
      var showReply = container.getAttribute("data-show-response") !== "false";
      if (showReply && review.companyReply) {
        var reply = element("div", "ow-reply");
        reply.appendChild(element("strong", "", "Company reply"));
        reply.appendChild(document.createTextNode(review.companyReply));
        card.appendChild(reply);
      }
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  function renderBadge(container, payload) {
    var format = container.getAttribute("data-format") || ((payload.badge && payload.badge.format) || "full");
    var scale = payload.project.ratingScale || "stars";
    var suffix = scale === "nps" ? "/10" : "";
    var score = payload.metrics.averageRating.toFixed(1);
    var symbol = "★★★★★";
    var count = payload.metrics.total;
    container.classList.add("ow-badge-wrap");

    if (format === "banner") {
      var banner = element("div", "ow-badge ow-badge-banner");
      var left = element("div", "ow-badge-banner-left");
      left.appendChild(element("strong", "ow-badge-score", score + suffix));
      left.appendChild(element("span", "ow-stars", symbol));
      banner.appendChild(left);
      banner.appendChild(element("span", "ow-badge-divider", ""));
      banner.appendChild(element("span", "ow-badge-caption", count + " verified reviews"));
      container.appendChild(banner);
      return;
    }

    var badge = element("div", "ow-badge");
    if (format !== "stars-only") badge.appendChild(element("strong", "ow-badge-score", score + suffix));
    if (format !== "number") {
      var stars = element("span", format === "stars-only" ? "ow-stars ow-stars-big" : "ow-stars", symbol);
      badge.appendChild(stars);
    }
    if (format === "full") badge.appendChild(element("span", "ow-badge-caption", count + " reviews"));
    container.appendChild(badge);
  }

  // Экран после отправки: Google для позитива, поддержка и чат для нейтрала / негатива
  function renderThanks(message, followUp) {
    var box = element("div", "ow-thanks");
    box.appendChild(element("div", "ow-thanks-icon", "✓"));
    box.appendChild(element("h3", "ow-thanks-title", "Thank you for your feedback!"));
    if (message) box.appendChild(element("p", "ow-thanks-text", message));

    if (followUp) {
      var actions = element("div", "ow-actions");

      if (followUp.google && safeUrl(followUp.google.url)) {
        box.appendChild(element("p", "ow-thanks-text", "We would love it if you shared your experience on Google."));
        var g = element("a", "ow-btn ow-btn-google");
        g.href = safeUrl(followUp.google.url);
        g.target = "_blank";
        g.rel = "noopener noreferrer";
        var gIcon = element("span");
        gIcon.innerHTML = GOOGLE_G; // статичная разметка логотипа, без пользовательских данных
        g.appendChild(gIcon);
        g.appendChild(document.createTextNode("Leave a review on Google"));
        actions.appendChild(g);
      }

      if (followUp.support) {
        if (followUp.support.text) box.appendChild(element("p", "ow-thanks-text", followUp.support.text));
        var email = followUp.support.contact ? safeEmail(followUp.support.email) : null;
        if (email) {
          var mail = element("a", "ow-btn", "Email customer support");
          mail.href = "mailto:" + email + "?subject=" + encodeURIComponent("Follow-up about my review");
          actions.appendChild(mail);
        }
        var chatUrl = followUp.support.chat ? safeUrl(followUp.support.chatUrl) : null;
        if (chatUrl) {
          var chat = element("a", "ow-btn ow-btn-primary", "Chat with support");
          chat.href = chatUrl;
          chat.target = "_blank";
          chat.rel = "noopener noreferrer";
          actions.appendChild(chat);
        }
      }

      if (actions.children.length) box.appendChild(actions);
    }
    return box;
  }

  function photoDataSizeKb(dataUrl) {
    var comma = String(dataUrl).indexOf(",");
    return Math.ceil(((String(dataUrl).length - comma - 1) * 3) / 4 / 1024);
  }

  function isSafePhoto(value) {
    var v = String(value || "");
    if (!v) return false;
    if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+\/]+={0,2}$/.test(v)) return true;
    return safeUrl(v) !== null;
  }

  // Читает картинку и пережимает её в JPEG не тяжелее maxKb (1280px по длинной стороне)
  function compressImage(file, maxKb) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) { reject(new Error("Only image files can be attached.")); return; }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("This file could not be read.")); };
      reader.onload = function () {
        var image = new Image();
        image.onerror = function () { reject(new Error("This file could not be read as an image.")); };
        image.onload = function () {
          var maxEdge = 1280;
          var width = image.naturalWidth || maxEdge;
          var height = image.naturalHeight || maxEdge;
          var scale = Math.min(1, maxEdge / Math.max(width, height));
          var canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          var context = canvas.getContext("2d");
          if (!context) { reject(new Error("This browser cannot process images.")); return; }
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          var quality = 0.85;
          var dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (photoDataSizeKb(dataUrl) > maxKb && quality > 0.35) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          if (photoDataSizeKb(dataUrl) > maxKb) { reject(new Error("This photo is too large — the limit is " + maxKb + " KB.")); return; }
          resolve(dataUrl);
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  function renderPhotoField(config) {
    var maxPhotos = Math.max(1, Math.min(10, Number(config.maxPhotos) || 3));
    var maxKb = Math.max(64, Math.min(4096, Number(config.maxPhotoSizeKb) || 400));
    var defaultHint = "Up to " + maxPhotos + " photo" + (maxPhotos === 1 ? "" : "s") + ", " + maxKb + " KB each. Large photos are compressed automatically.";
    var photos = [];
    var wrap = element("div", "ow-photos-field");
    wrap.appendChild(element("span", "ow-rate-label", "Photos (optional)"));
    var input = element("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.style.display = "none";
    var pick = element("button", "ow-photo-pick", "Add photos");
    pick.type = "button";
    pick.addEventListener("click", function () { input.click(); });
    var hint = element("p", "ow-photo-hint", defaultHint);
    var list = element("div", "ow-photo-list");
    wrap.appendChild(pick);
    wrap.appendChild(input);
    wrap.appendChild(hint);
    wrap.appendChild(list);

    function renderList() {
      list.textContent = "";
      photos.forEach(function (src, index) {
        var thumb = element("span", "ow-photo-thumb");
        var img = element("img");
        img.src = src;
        img.alt = "Photo " + (index + 1);
        var remove = element("button", "ow-photo-remove", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", "Remove photo " + (index + 1));
        remove.addEventListener("click", function () { photos.splice(index, 1); renderList(); });
        thumb.appendChild(img);
        thumb.appendChild(remove);
        list.appendChild(thumb);
      });
      pick.disabled = photos.length >= maxPhotos;
      pick.textContent = photos.length >= maxPhotos ? "Photo limit reached" : "Add photos";
    }

    input.addEventListener("change", function () {
      var room = Math.max(0, maxPhotos - photos.length);
      var files = Array.prototype.slice.call(input.files || []).slice(0, room);
      if (!files.length) {
        hint.textContent = "You can attach up to " + maxPhotos + " photo" + (maxPhotos === 1 ? "" : "s") + ".";
        hint.classList.add("error");
        input.value = "";
        return;
      }
      pick.disabled = true;
      var failed = null;
      var chain = Promise.resolve();
      files.forEach(function (file) {
        chain = chain.then(function () {
          return compressImage(file, maxKb).then(function (dataUrl) {
            if (photos.length < maxPhotos) photos.push(dataUrl);
          }, function (error) { failed = error; });
        });
      });
      chain.then(function () {
        input.value = "";
        renderList();
        if (failed) {
          hint.textContent = failed.message || "This photo could not be added.";
          hint.classList.add("error");
        } else {
          hint.textContent = defaultHint;
          hint.classList.remove("error");
        }
      });
    });

    renderList();
    return { node: wrap, getPhotos: function () { return photos.slice(); } };
  }

  function renderForm(container, payload) {
    container.classList.add("ow-form-wrap");
    var config = payload.project.form || {};
    var textRequired = config.reviewTextRequired === true;
    var minReviewLength = Number(config.minReviewLength || 10);
    var form = element("form", "ow-form");
    form.appendChild(element("h2", "ow-form-title", "Share your experience"));
    form.appendChild(element("p", "ow-form-description", textRequired ? "Your rating and comment help us improve." : "A rating is enough. You can add a comment if you like."));
    form.appendChild(element("label", "ow-rate-label", "Your rating"));
    var choices = element("div", "ow-rating-options");
    var values = [1, 2, 3, 4, 5];
    var selectedRating = null;
    values.forEach(function (value) {
      var choice = element("button", "ow-rating-choice", "★".repeat(value));
      choice.type = "button";
      choice.setAttribute("aria-label", "Rating " + value + " out of 5");
      choice.addEventListener("click", function () {
        selectedRating = value;
        Array.prototype.forEach.call(choices.children, function (item) { item.classList.remove("selected"); });
        choice.classList.add("selected");
      });
      choices.appendChild(choice);
    });
    form.appendChild(choices);

    var nameField = element("input", "ow-field");
    nameField.name = "authorName";
    nameField.type = "text";
    nameField.placeholder = "Your name";
    nameField.maxLength = 120;
    nameField.required = true;
    form.appendChild(nameField);
    // Standard fields can be hidden in Business reputation → Review form.
    var emailField = null;
    if (config.showEmail !== false) {
      emailField = element("input", "ow-field");
      emailField.name = "authorEmail";
      emailField.type = "email";
      emailField.placeholder = "Email address (optional)";
      emailField.maxLength = 254;
      form.appendChild(emailField);
    }
    var cityField = null;
    if (config.showCity !== false) {
      cityField = element("input", "ow-field");
      cityField.name = "authorCity";
      cityField.type = "text";
      cityField.placeholder = "City (optional)";
      cityField.maxLength = 120;
      form.appendChild(cityField);
    }
    var commentField = null;
    if (config.showComment !== false) {
      commentField = element("textarea", "ow-field");
      commentField.name = "content";
      commentField.placeholder = textRequired ? "Tell us what you enjoyed or how we could improve…" : "Tell us more (optional)";
      commentField.maxLength = 2000;
      commentField.required = textRequired;
      form.appendChild(commentField);
    }

    var photoField = config.allowPhotos === true ? renderPhotoField(config) : null;
    if (photoField) form.appendChild(photoField.node);

    // Custom fields configured in Business reputation → Review form
    var customInputs = [];
    (config.customFields || []).forEach(function (field) {
      form.appendChild(element("label", "ow-field-label", field.label + (field.required ? " *" : "")));
      if (field.type === "select") {
        var select = element("select", "ow-field");
        select.name = field.id;
        select.required = field.required === true;
        var placeholder = element("option", "", "Choose…");
        placeholder.value = "";
        select.appendChild(placeholder);
        (field.options || []).forEach(function (option) {
          var optionNode = element("option", "", option);
          optionNode.value = option;
          select.appendChild(optionNode);
        });
        form.appendChild(select);
        customInputs.push({ field: field, read: function () { return select.value; } });
      } else {
        var input = element("input", "ow-field");
        input.type = "text";
        input.name = field.id;
        input.maxLength = 500;
        input.required = field.required === true;
        input.placeholder = field.label;
        form.appendChild(input);
        customInputs.push({ field: field, read: function () { return input.value.trim(); } });
      }
    });
    function collectCustom() {
      var out = {};
      customInputs.forEach(function (item) {
        var value = item.read();
        if (value) out[item.field.id] = value;
      });
      return out;
    }

    var anonymousField = null;
    if (config.allowAnonymousReviews === true) {
      var anonymousLabel = element("label", "ow-anonymous");
      anonymousField = element("input");
      anonymousField.type = "checkbox";
      anonymousField.name = "isAnonymous";
      anonymousLabel.appendChild(anonymousField);
      anonymousLabel.appendChild(element("span", "", "Publish this review anonymously. Your details remain visible to the company."));
      form.appendChild(anonymousLabel);
    }

    var submit = element("button", "ow-submit", "Submit review");
    submit.type = "submit";
    form.appendChild(submit);
    var message = element("p", "ow-message", "");
    message.setAttribute("aria-live", "polite");
    form.appendChild(message);

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      message.classList.remove("error");
      var comment = commentField ? commentField.value.trim() : "";
      if (selectedRating === null) {
        message.textContent = "Choose a rating to continue.";
        message.classList.add("error");
        return;
      }
      if ((textRequired && comment.length < minReviewLength) || (!textRequired && comment.length > 0 && comment.length < minReviewLength)) {
        message.textContent = textRequired ? "Please write at least " + minReviewLength + " characters." : "If you add a comment, please write at least " + minReviewLength + " characters.";
        message.classList.add("error");
        return;
      }
      submit.disabled = true;
      submit.textContent = "Submitting…";
      fetch(apiBase + "/api/v1/projects/" + encodeURIComponent(projectId) + "/reviews", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: nameField.value.trim(),
          authorEmail: emailField ? emailField.value.trim() : "",
          authorCity: cityField ? cityField.value.trim() : "",
          isAnonymous: anonymousField ? anonymousField.checked : false,
          rating: selectedRating,
          content: comment,
          photos: photoField ? photoField.getPhotos() : [],
          customFields: collectCustom()
        })
      }).then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) throw new Error(body.error || "Unable to submit your review.");
          return body;
        });
      }).then(function (result) {
        var thanks = renderThanks(result.message || "", result.followUp || null);
        if (form.parentNode) form.parentNode.replaceChild(thanks, form);
      }).catch(function (error) {
        message.textContent = error.message || "Unable to submit your review. Please try again later.";
        message.classList.add("error");
        submit.disabled = false;
        submit.textContent = "Submit review";
      });
    });
    container.appendChild(form);
  }

  function renderWidget(container, payload) {
    var kind = container.getAttribute("data-widget");
    var theme = container.getAttribute("data-theme");
    container.classList.add("otklik-widget");
    if (theme === "dark") container.classList.add("ow-dark");
    container.style.setProperty("--otklik-accent", payload.project.brandColor || "#617a58");
    if (kind === "reviews") {
      var limit = Number(container.getAttribute("data-limit") || 10);
      if (!Number.isInteger(limit)) limit = 10;
      renderReviewFeed(container, payload, Math.max(1, Math.min(50, limit)));
    } else if (kind === "badge") {
      renderBadge(container, payload);
    } else if (kind === "form") {
      renderForm(container, payload);
    } else if (kind === "all-in-one") {
      var badgeContainer = element("div", "otklik-widget");
      badgeContainer.setAttribute("data-format", "full");
      badgeContainer.style.setProperty("--otklik-accent", payload.project.brandColor || "#617a58");
      renderBadge(badgeContainer, payload);
      container.appendChild(badgeContainer);
      var feedContainer = element("div", "otklik-widget");
      feedContainer.setAttribute("data-show-response", "true");
      feedContainer.style.marginTop = "18px";
      feedContainer.style.setProperty("--otklik-accent", payload.project.brandColor || "#617a58");
      renderReviewFeed(feedContainer, payload, 4);
      container.appendChild(feedContainer);
      var formContainer = element("div", "otklik-widget");
      formContainer.style.marginTop = "18px";
      formContainer.style.setProperty("--otklik-accent", payload.project.brandColor || "#617a58");
      renderForm(formContainer, payload);
      container.appendChild(formContainer);
    }
  }

  function displayError(container, error) {
    container.classList.add("otklik-widget");
    container.appendChild(element("div", "ow-error", error || "Unable to load reviews."));
  }

  function loadWidgets() {
    var maxLimit = widgets.reduce(function (limit, widget) {
      return Math.max(limit, Number(widget.getAttribute("data-limit") || 10));
    }, 10);
    fetch(apiBase + "/api/v1/projects/" + encodeURIComponent(projectId) + "/reviews?limit=" + Math.min(50, maxLimit), {
      mode: "cors",
      headers: { Accept: "application/json" }
    }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error(body.error || "Unable to load reviews.");
        return body;
      });
    }).then(function (payload) {
      widgets.forEach(function (widget) { renderWidget(widget, payload); });
    }).catch(function (error) {
      widgets.forEach(function (widget) { displayError(widget, error.message); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadWidgets, { once: true });
  else loadWidgets();
})();
