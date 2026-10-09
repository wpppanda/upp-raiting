"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import type { DashboardReview, DashboardProject, DashboardData, ReviewAuthorKind } from "@/lib/dashboard-data";
import AppHeader from "@/components/app-header";
import ReputationHub from "@/components/reputation-hub";
import WidgetDrawer, { type PreviewKind } from "@/components/widget-drawer";
import StatsPanel from "@/components/stats-panel";
import ReviewActionsDrawer from "@/components/review-actions-drawer";
import type { ActionOptions, ActionResult, ReviewAction } from "@/components/review-actions";
import type { FollowUp } from "@/lib/follow-up";
import { compressImageFile, MAX_PHOTOS_LIMIT } from "@/lib/photo-upload";
import GoogleG from "@/components/google-g";

export type { DashboardReview, DashboardProject, DashboardData };

// --- Navigation Tabs & Subsections ---
const BADGE_SIZE_META = [
  { id: "small", name: "Small", padding: "6px 10px", gap: 6, score: 15, caption: 10, star: 12, bigStar: 15 },
  { id: "medium", name: "Medium", padding: "10px 14px", gap: 9, score: 19, caption: 11, star: 14, bigStar: 19 },
  { id: "large", name: "Large", padding: "15px 22px", gap: 13, score: 27, caption: 13, star: 18, bigStar: 26 },
] as const;
const BADGE_THEME_META = [
  { id: "light", name: "Light", border: "#dadce0", background: "#ffffff", score: "#202124", caption: "#5f6368", divider: "#dadce0" },
  { id: "dark", name: "Dark", border: "#5f6368", background: "#202124", score: "#ffffff", caption: "#bdc1c6", divider: "#5f6368" },
  { id: "brand", name: "Brand", border: "transparent", background: "#617a58", score: "#ffffff", caption: "#ffffff", divider: "rgba(255,255,255,.45)" },
] as const;
const BADGE_SHAPE_META = [
  { id: "rounded", name: "Rounded", radius: 10 },
  { id: "pill", name: "Pill", radius: 999 },
  { id: "square", name: "Square", radius: 3 },
] as const;
type BadgeLook = { size: string; theme: string; shape: string; showCount: boolean; label: string; brandColor: string };
function BadgeSample({ format, score, count, look }: { format: string; score: string; count: number; look: BadgeLook }) {
  const size = BADGE_SIZE_META.find(item => item.id === look.size) ?? BADGE_SIZE_META[1];
  const theme = BADGE_THEME_META.find(item => item.id === look.theme) ?? BADGE_THEME_META[0];
  const shape = BADGE_SHAPE_META.find(item => item.id === look.shape) ?? BADGE_SHAPE_META[0];
  const word = look.label.trim() || (format === "banner" ? "verified reviews" : "reviews");
  const shell: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: size.gap, padding: size.padding, border: `1px solid ${theme.border}`, borderRadius: shape.radius, background: theme.id === "brand" ? look.brandColor : theme.background };
  const scoreStyle: React.CSSProperties = { color: theme.score, fontSize: size.score, fontWeight: 600, lineHeight: 1.15 };
  const stars = <span className="tracking-wider" style={{ color: "#FBBC04", fontSize: size.star }}>★★★★★</span>;
  const bigStars = <span style={{ color: "#FBBC04", fontSize: size.bigStar, letterSpacing: 2 }}>★★★★★</span>;
  const caption = <span style={{ color: theme.caption, fontSize: size.caption }}>{count} {word}</span>;
  if (format === "banner") return <div style={{ ...shell, display: "flex", width: "100%", maxWidth: 420 }} data-badge-preview={format}><span style={{ display: "inline-flex", alignItems: "center", gap: Math.max(5, size.gap - 2) }}><strong style={scoreStyle}>{score}</strong>{stars}</span>{look.showCount && <span aria-hidden="true" style={{ width: 1, alignSelf: "stretch", background: theme.divider }} />}{look.showCount && caption}</div>;
  return <div style={shell} data-badge-preview={format}>{format !== "stars-only" && <strong style={scoreStyle}>{score}</strong>}{format !== "number" && (format === "stars-only" ? bigStars : stars)}{format === "full" && look.showCount && caption}</div>;
}

export type MainView =
  | "reviews"
  | "queue"
  | "install"
  | "badge"
  | "moderation"
  | "analytics"
  | "widgets"
  | "settings"
  | "reputation"
  | "overview"
  | "clients"
  | "channels"
  | "team"
  | "messages";

export type SettingsTab =
  | "account"
  | "company"
  | "api"
  | "naming"
  | "booking"
  | "qrcode";

export type AnalyticsTab = "usage" | "plan" | "payment" | "invoices";

export type ReviewFilterTab =
  | "all"
  | "draft"
  | "sent"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "spam";

// Icons for the exact slim sidebar from screenshots
function SidebarIcon({ name, active }: { name: string; active?: boolean }) {
  const color = active ? "#285E9D" : "#373737";
  switch (name) {
    case "home":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      );
    case "bell":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case "user":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "pin":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "people":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "dollar": // Active icon from screenshot 1
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
          <circle cx="12" cy="14" r="2" />
        </svg>
      );
    case "mail":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "document":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
      );
    case "split": // widgets icon
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="7" x="3" y="3" rx="1" />
          <rect width="18" height="7" x="3" y="14" rx="1" />
        </svg>
      );
    case "chat":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
        </svg>
      );
    case "gear":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "book":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case "star":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "plug":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * The standard thank-you screen shown after a review is submitted.
 * Its content depends on the rating level: a Google invitation for positive
 * reviews, support email / chat for neutral and negative ones.
 */
function WidgetThanksScreen({ followUp, status, project, onReset }: {
  followUp: FollowUp | null;
  status: string;
  project: DashboardProject;
  onReset: () => void;
}) {
  const pending = status === "pending";
  return (
    <div className="max-w-md bg-white p-6 rounded-xl border border-slate-200 text-center" data-widget-thanks>
      <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full text-lg text-white" style={{ background: project.brandColor }}>✓</span>
      <h3 className="text-sm font-bold text-slate-900">Thank you for your feedback!</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        {pending ? "Your review has been submitted for moderation." : "Thank you for your review!"}
      </p>
      {followUp?.google && (
        <div className="mt-4">
          <p className="mb-3 text-xs leading-relaxed text-slate-500">We would love it if you shared your experience on Google.</p>
          <a
            href={followUp.google.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#dadce0] bg-white px-4 py-2.5 text-xs font-medium text-slate-700"
          >
            <GoogleG size={16} /> Leave a review on Google
          </a>
        </div>
      )}
      {followUp?.support && (
        <div className="mt-4">
          {followUp.support.text && <p className="mb-3 text-xs leading-relaxed text-slate-500">{followUp.support.text}</p>}
          <div className="space-y-2">
            {followUp.support.contact && (
              <a
                href={`mailto:${followUp.support.email}?subject=${encodeURIComponent("Follow-up about my review")}`}
                className="block rounded-md border border-[#d0d5dd] bg-white px-3 py-2.5 text-xs font-medium text-slate-600"
              >
                Email customer support
              </a>
            )}
            {followUp.support.chat && (
              <a
                href={followUp.support.chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md px-3 py-2.5 text-xs font-medium text-white"
                style={{ background: project.brandColor }}
              >
                Chat with support
              </a>
            )}
          </div>
        </div>
      )}
      <button type="button" onClick={onReset} className="mt-5 text-xs font-semibold text-blue-600 hover:text-blue-800">
        Leave another review
      </button>
    </div>
  );
}

export default function Dashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [currentView, setCurrentView] = useState<MainView>("reviews");
  const [topTab, setTopTab] = useState<"invoices_out" | "invoices_in">("invoices_out");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilterTab>("all");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("booking");
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>("usage");

  // Selection & Actions
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Modals & Drawers
  const [newReviewModalOpen, setNewReviewModalOpen] = useState(false);
  const [replyModalReview, setReplyModalReview] = useState<DashboardReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [activeMenuRowId, setActiveMenuRowId] = useState<string | null>(null);


  // Settings Form State
  const [projectName, setProjectName] = useState(initialData.project.name);
  const [projectDomain, setProjectDomain] = useState(initialData.project.domain);
  const [brandColor, setBrandColor] = useState(initialData.project.brandColor);
  const [timezone, setTimezone] = useState(initialData.project.timezone);
  const [smartQueueEnabled, setSmartQueueEnabled] = useState(initialData.project.smartQueueEnabled);
  const [templateTheme, setTemplateTheme] = useState<"classic" | "standard" | "modern">("classic");

  // New Review Form State
  const [newAuthorName, setNewAuthorName] = useState("");
  const [newAuthorEmail, setNewAuthorEmail] = useState("");
  const [newAuthorCity, setNewAuthorCity] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newContent, setNewContent] = useState("");
  /**
   * An employee can enter a review manually — either as themselves or on behalf
   * of a customer — while the employee who typed it is always recorded.
   */
  const [newAuthorKind, setNewAuthorKind] = useState<ReviewAuthorKind>("customer");
  const [newAddedBy, setNewAddedBy] = useState("Administrator");
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [newPhotoNote, setNewPhotoNote] = useState("");
  const [newCustom, setNewCustom] = useState<Record<string, string>>({});
  const [badgeSelection, setBadgeSelection] = useState<string>(initialData.project.badgeFormat || "full");
  const [badgeLook, setBadgeLook] = useState<BadgeLook>({
    size: initialData.project.badgeSize || "medium",
    theme: initialData.project.badgeTheme || "light",
    shape: initialData.project.badgeShape || "rounded",
    showCount: initialData.project.badgeShowCount !== false,
    label: initialData.project.badgeLabel || "",
    brandColor: initialData.project.brandColor,
  });
  const [photosBusy, setPhotosBusy] = useState(false);

  // Widget preview sandbox + right drawer
  const [widgetType, setWidgetType] = useState<"reviews" | "form" | "badge" | "all-in-one">("reviews");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  // Install guide (sidebar page after the publication queue)
  const [installKind, setInstallKind] = useState<PreviewKind>("reviews");
  const [installCopied, setInstallCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKind, setPreviewKind] = useState<PreviewKind>("reviews");
  const [previewProject, setPreviewProject] = useState<DashboardProject | null>(null);
  // Standard thank-you screen of the widget sandbox, shown after a submission.
  const [previewThanks, setPreviewThanks] = useState<{ followUp: FollowUp | null; status: string } | null>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("review");
    if (id && initialData.reviews.some((review) => review.id === id)) setActiveMenuRowId(id);
  }, [initialData.reviews]);

  const selectedReview = data.reviews.find((review) => review.id === activeMenuRowId) ?? null;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const refreshData = useCallback(async () => {
    const res = await fetch("/api/dashboard", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Unable to refresh reviews.");
    setData(json as DashboardData);
  }, []);

  const handleReviewAction = async (
    id: string,
    action: ReviewAction,
    options?: ActionOptions,
  ): Promise<ActionResult> => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...options, ...(options?.text ? { reply: options.text } : {}) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Unable to save changes.");
      await refreshData();
      const messages: Record<ReviewAction, string> = {
        approve: "Review approved for publication.", reject: "Review rejected.", spam: "Review marked as spam.",
        reply: "Company reply published.", publish: "Review published on your website.", unpublish: "Review returned to moderation.",
        delay: "Publication delayed.", hide: "Review text hidden on your website.", show: "Review text is visible again.",
        pin: "Review pinned to the top of your feed.", unpin: "Review unpinned.", change_rating: "Rating and sentiment updated.",
      };
      showToast(messages[action]);
      setReplyModalReview(null);
      setReplyText("");
      return { ok: true, message: messages[action] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error. Please try again.";
      showToast(message);
      return { ok: false, message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocalAction = async (review: DashboardReview, actionId: string): Promise<string> => {
    const ref = `${window.location.origin}/?review=${encodeURIComponent(review.id)}`;
    if (actionId === "link" || actionId === "id") {
      try { await navigator.clipboard.writeText(actionId === "link" ? ref : review.id); }
      catch { throw new Error("Clipboard access was denied. Please try again or copy the review ID manually."); }
      return actionId === "link" ? "Review link copied." : "Review ID copied.";
    }
    if (actionId === "export") {
      const blob = new Blob([JSON.stringify(review, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `review-${review.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return "Review download started.";
    }
    if (["mail", "clarify", "support"].includes(actionId)) {
      const recipient = actionId === "support" ? data.project.supportEmail : review.authorEmail;
      if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error("A valid email address is required.");
      const subject = actionId === "support" ? `Review needs attention: ${review.authorName}` : `Your review of ${data.project.name}`;
      const message = actionId === "support"
        ? `Please help us follow up on this review.\n\nAuthor: ${review.authorName}\nRating: ${review.rating}\n\n${review.content}\n\n${ref}`
        : actionId === "clarify"
          ? `Hello ${review.authorName},\n\nThank you for your feedback. Could you share a few more details about your experience so we can help?\n\n${data.project.name}`
          : `Hello ${review.authorName},\n\nThank you for sharing your feedback.\n\n${data.project.name}`;
      window.location.href = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      return "Opening a draft in your email app. The message has not been sent.";
    }
    throw new Error("This action is not available.");
  };

  /** Photo rules of the current project, shared by the widget sandbox and Add review. */
  const photoRules = {
    allowPhotos: data.project.allowPhotos !== false,
    maxPhotos: Math.max(1, Math.min(MAX_PHOTOS_LIMIT, data.project.maxPhotos || 1)),
    maxPhotoSizeKb: Math.max(64, data.project.maxPhotoSizeKb || 64),
  };

  /** Compresses the picked files and adds them to the pending review. */
  const attachPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = photoRules.maxPhotos - newPhotos.length;
    if (room <= 0) {
      setNewPhotoNote(`You can attach up to ${photoRules.maxPhotos} photos.`);
      return;
    }
    setPhotosBusy(true);
    setNewPhotoNote("");
    let failure = "";
    const prepared: string[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        prepared.push(await compressImageFile(file, photoRules.maxPhotoSizeKb));
      } catch (error) {
        failure = error instanceof Error ? error.message : "This photo could not be added.";
      }
    }
    if (prepared.length) setNewPhotos((current) => [...current, ...prepared].slice(0, photoRules.maxPhotos));
    if (failure) setNewPhotoNote(failure);
    setPhotosBusy(false);
  };

  const photoField = (compact: boolean) => (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center gap-2">
        <label className={`block font-semibold text-slate-700 ${compact ? "text-[11px]" : "text-xs"}`}>
          Photos <span className="font-normal text-slate-400">(optional)</span>
        </label>
        {photosBusy && <span className="text-[11px] text-slate-400">Compressing…</span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {newPhotos.map((photo, index) => (
          <span key={`pending-photo-${index}`} className="relative block h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
            <img src={photo} alt={`Attached photo ${index + 1}`} className="h-16 w-16 object-cover" />
            <button
              type="button"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => setNewPhotos((current) => current.filter((_, i) => i !== index))}
              className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-slate-700/85 text-[11px] leading-none text-white"
            >✕</button>
          </span>
        ))}
        <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 text-slate-600 hover:bg-slate-50 ${compact ? "py-1.5 text-[11px]" : "py-2 text-xs"}`}>
          {newPhotos.length >= photoRules.maxPhotos ? "Photo limit reached" : "Add photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={photosBusy || newPhotos.length >= photoRules.maxPhotos}
            onChange={(event) => { void attachPhotos(event.target.files); event.target.value = ""; }}
          />
        </label>
      </div>
      <p className={`text-slate-400 ${newPhotoNote ? "text-rose-600" : compact ? "text-[10px]" : "text-[11px]"}`}>
        {newPhotoNote || `Up to ${photoRules.maxPhotos} photos, ${photoRules.maxPhotoSizeKb} KB each. Large photos are compressed automatically.`}
      </p>
    </div>
  );

  const customFieldsUI = (compact: boolean) => {
    const fields = data.project.formFields ?? [];
    if (!fields.length) return null;
    return (
      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        {fields.map((field) => (
          <div key={field.id}>
            <label className={`block font-semibold text-slate-700 ${compact ? "mb-0.5 text-[11px]" : "mb-1 text-xs"}`}>
              {field.label}
              {field.required ? <span className="text-rose-500"> *</span> : <span className="font-normal text-slate-400"> (optional)</span>}
            </label>
            {field.type === "select" ? (
              <select
                value={newCustom[field.id] ?? ""}
                onChange={(e) => setNewCustom((current) => ({ ...current, [field.id]: e.target.value }))}
                required={field.required}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
              >
                <option value="">Choose…</option>
                {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            ) : (
              <input
                type="text"
                maxLength={500}
                required={field.required}
                placeholder={field.label}
                value={newCustom[field.id] ?? ""}
                onChange={(e) => setNewCustom((current) => ({ ...current, [field.id]: e.target.value }))}
                className={`w-full rounded-lg border border-slate-300 text-slate-800 ${compact ? "p-2 text-xs" : "px-3 py-2 text-sm"}`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const BADGE_META = [
    { id: "number", name: "Number", description: "Just the score — the smallest footprint." },
    { id: "stars", name: "Stars", description: "Score plus a star row." },
    { id: "full", name: "Full", description: "Score, stars, and the review count." },
    { id: "stars-only", name: "Stars only", description: "Only the star row, no numbers." },
    { id: "banner", name: "Banner", description: "A wide strip for footers and hero sections." },
  ];

  const saveBadgeFormat = async (format: string) => {
    setBadgeSelection(format);
    await persistBadge({ badgeFormat: format }, "Badge kind saved.");
  };

  const persistBadge = async (patch: Record<string, unknown>, message: string) => {
    try {
      const res = await fetch("/api/project", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to save the badge settings.");
      setData((prev: DashboardData) => ({ ...prev, project: json.project }));
      showToast(message);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to save the badge settings.");
    }
  };

  const updateBadgeLook = (patch: Partial<BadgeLook>, message: string) => {
    setBadgeLook((current) => ({ ...current, ...patch }));
    // The API expects the persisted column names, not the local preview keys.
    const apiPatch: Record<string, unknown> = {};
    if (patch.size !== undefined) apiPatch.badgeSize = patch.size;
    if (patch.theme !== undefined) apiPatch.badgeTheme = patch.theme;
    if (patch.shape !== undefined) apiPatch.badgeShape = patch.shape;
    if (patch.showCount !== undefined) apiPatch.badgeShowCount = patch.showCount;
    if (patch.label !== undefined) apiPatch.badgeLabel = patch.label;
    void persistBadge(apiPatch, message);
  };

  // Submit New Review — from the widget sandbox (a customer) or from Add review (an employee)
  const handleCreateReview = async (e: React.FormEvent, origin: "widget" | "admin" = "widget") => {
    e.preventDefault();
    if (!newAuthorName.trim()) {
      showToast("Enter an author name.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: newAuthorName.trim(),
          authorEmail: newAuthorEmail.trim() || undefined,
          authorCity: newAuthorCity.trim() || undefined,
          rating: newRating,
          content: newContent.trim(),
          photos: newPhotos,
          customFields: newCustom,
          authorKind: origin === "admin" ? newAuthorKind : "customer",
          addedBy: origin === "admin" ? newAddedBy.trim() || undefined : undefined,
        }),
      });
      const result = await res.json().catch(() => ({} as Record<string, unknown>));
      if (res.ok) {
        await refreshData();
        // The sandbox behaves like the live widget: the standard thank-you
        // screen for the submitted rating level replaces the form.
        setPreviewThanks({
          followUp: (result.followUp as FollowUp | undefined) ?? null,
          status: String((result.review as { status?: string } | undefined)?.status ?? "pending"),
        });
        showToast("Review added successfully.");
        setNewReviewModalOpen(false);
        setNewAuthorName("");
        setNewAuthorEmail("");
        setNewAuthorCity("");
        setNewContent("");
        setNewRating(5);
        setNewPhotos([]);
        setNewPhotoNote("");
        setNewCustom({});
      } else {
        showToast(String(result.error ?? "") || "Unable to create the review.");
      }
    } catch {
      showToast("Connection failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/project", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          domain: projectDomain,
          brandColor,
          timezone,
          smartQueueEnabled,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.project) {
          setData((prev: DashboardData) => ({ ...prev, project: json.project }));
        }
        showToast("Settings saved successfully.");
      } else {
        const err = await res.json();
        showToast(err.error || "Unable to save changes.");
      }
    } catch {
      showToast("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // "Invoices out" — отзывы, уже опубликованные на сайте (вышли наружу).
  // "Invoices in" — всё, что поступило в систему, но ещё не опубликовано (входящий поток).
  const scopedReviews = useMemo(
    () =>
      data.reviews.filter((r: DashboardReview) =>
        topTab === "invoices_out" ? r.status === "published" : r.status !== "published",
      ),
    [data.reviews, topTab],
  );

  // Filtered reviews for Table
  const filteredReviews = useMemo(() => {
    return scopedReviews.filter((r: DashboardReview) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.authorName.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q) ||
        (r.authorEmail && r.authorEmail.toLowerCase().includes(q)) ||
        r.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filter Tab
      if (reviewFilter === "all") return true;
      if (reviewFilter === "draft") return r.status === "pending";
      if (reviewFilter === "sent") return r.status === "queued";
      if (reviewFilter === "paid") return r.sentiment === "positive";
      if (reviewFilter === "partially_paid") return r.sentiment === "neutral";
      if (reviewFilter === "overdue") return r.sentiment === "negative";
      if (reviewFilter === "spam") return r.status === "spam" || r.status === "rejected";
      return true;
    });
  }, [scopedReviews, searchQuery, reviewFilter]);

  // Counts for tabs (считаются в рамках текущего раздела — out/in)
  const tabCounts = useMemo(() => {
    return {
      all: scopedReviews.length,
      draft: scopedReviews.filter((r: DashboardReview) => r.status === "pending").length,
      sent: scopedReviews.filter((r: DashboardReview) => r.status === "queued").length,
      paid: scopedReviews.filter((r: DashboardReview) => r.sentiment === "positive").length,
      partially_paid: scopedReviews.filter((r: DashboardReview) => r.sentiment === "neutral").length,
      overdue: scopedReviews.filter((r: DashboardReview) => r.sentiment === "negative").length,
      spam: scopedReviews.filter((r: DashboardReview) => r.status === "spam" || r.status === "rejected").length,
    };
  }, [scopedReviews]);

  const switchTopTab = (tab: "invoices_out" | "invoices_in") => {
    setTopTab(tab);
    setReviewFilter("all");
  };

  // Table row select all
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedReviewIds(filteredReviews.map((r: DashboardReview) => r.id));
    } else {
      setSelectedReviewIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedReviewIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const renderStatusBadge = (review: DashboardReview) => {
    if (review.status === "pending") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
          Pending
        </span>
      );
    }
    if (review.status === "queued") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          Queued
        </span>
      );
    }
    if (review.status === "published") {
      if (review.sentiment === "positive") {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#DEF7EC] text-[#03543F]">
            Positive
          </span>
        );
      }
      if (review.sentiment === "neutral") {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#FEF08A] text-[#854D0E]">
            Neutral
          </span>
        );
      }
      if (review.sentiment === "negative") {
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#FDE8E8] text-[#9B1C1C]">
            Negative
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#DEF7EC] text-[#0E703C]">
          Published
        </span>
      );
    }
    if (review.status === "rejected") {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
        Spam
      </span>
    );
  };

  const widgetSnippet = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://otklik.ru";
    return `<script src="${origin}/widget.js" data-project-id="${data.project.id}" defer></script>\n<div data-widget="${widgetType}"></div>`;
  }, [data.project.id, widgetType]);

  const INSTALL_KINDS: Array<{ id: PreviewKind; label: string; description: string }> = [
    { id: "reviews", label: "Review feed", description: "The list of published reviews." },
    { id: "form", label: "Review form", description: "The form customers fill in, with the thank-you screen after submission." },
    { id: "badge", label: "Rating badge", description: "A compact rating summary." },
    { id: "all-in-one", label: "All-in-one", description: "Badge, feed, and form together." },
  ];
  const installSnippet = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://otklik.ru";
    return `<script src="${origin}/widget.js" data-project-id="${data.project.id}" defer></script>\n<div data-widget="${installKind}"></div>`;
  }, [data.project.id, installKind]);

  return (
    <div className="uppointment-shell min-h-screen bg-[#F7F7FC] flex flex-col font-sans">
      <AppHeader
        projectName={data.project.name}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        pendingCount={data.metrics.pending}
        onBell={() => setCurrentView("moderation")}
        onSettings={() => setCurrentView("reputation")}
        onLogo={() => setCurrentView("reviews")}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {/* =========================================================================
          MAIN CONTAINER WITH SLIM ICON SIDEBAR
      ========================================================================= */}
      <div className="flex-1 flex">
        {/* Left Icon-Only Sidebar (72px) matching Screenshots — сворачивается гамбургером из хэдера */}
        <aside
          className={`app-reference-navigation flex flex-col items-center border-r border-slate-200 bg-white py-6 shrink-0 select-none overflow-hidden transition-[width,opacity,padding] duration-200 ease-in-out ${
            sidebarOpen ? "w-[72px] gap-5 opacity-100" : "w-0 gap-0 px-0 opacity-0"
          }`}
        >
          {/* Nav Items */}
          <button
            onClick={() => setCurrentView("overview")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "overview" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Overview"
          >
            <SidebarIcon name="home" active={currentView === "overview"} />
          </button>

          <button
            onClick={() => setCurrentView("queue")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "queue" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Publication queue"
          >
            <SidebarIcon name="calendar" active={currentView === "queue"} />
          </button>

          <button
            onClick={() => setCurrentView("install")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "install" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Install guide — add the widget to your site"
          >
            <SidebarIcon name="book" active={currentView === "install"} />
          </button>

          <button
            onClick={() => setCurrentView("moderation")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "moderation" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Moderation"
          >
            <SidebarIcon name="bell" active={currentView === "moderation"} />
          </button>

          <button
            onClick={() => setCurrentView("clients")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "clients" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Review authors"
          >
            <SidebarIcon name="user" active={currentView === "clients"} />
          </button>

          <button
            onClick={() => setCurrentView("channels")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "channels" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Domains and channels"
          >
            <SidebarIcon name="pin" active={currentView === "channels"} />
          </button>

          <button
            onClick={() => setCurrentView("team")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "team" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Team"
          >
            <SidebarIcon name="people" active={currentView === "team"} />
          </button>

          {/* Main Active Icon: Dollar / Star / Reviews Table (Screenshot 1) */}
          <button
            onClick={() => setCurrentView("reviews")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "reviews" ? "bg-blue-100 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="All reviews"
          >
            <SidebarIcon name="dollar" active={currentView === "reviews"} />
          </button>

          {/* NEW: Бизнес-репутация — единый центр настроек и администрирования */}
          <button
            onClick={() => setCurrentView("reputation")}
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
              currentView === "reputation"
                ? "bg-[#101828] text-white shadow-[0_4px_12px_rgba(16,24,40,0.3)]"
                : "bg-[#FFFAEB] text-[#B54708] ring-1 ring-[#FEDF89] hover:bg-[#FEF0C7]"
            }`}
            title="Business reputation — all settings in one place"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={currentView === "reputation" ? "#FFC800" : "none"} stroke={currentView === "reputation" ? "#FFC800" : "#B54708"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.9 6.26 6.6.56-5 4.36 1.5 6.45L12 16.9 5.99 19.63l1.5-6.45-5-4.36 6.6-.56L12 2z" />
            </svg>
            <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[#1570EF] px-1.5 py-[1px] text-[8px] font-extrabold uppercase tracking-wide text-white">
              new
            </span>
          </button>

          <button
            onClick={() => setCurrentView("messages")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "messages" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Invitations and reminders"
          >
            <SidebarIcon name="mail" active={currentView === "messages"} />
          </button>

          <button
            onClick={() => setCurrentView("analytics")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "analytics" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Analytics and reports"
          >
            <SidebarIcon name="document" active={currentView === "analytics"} />
          </button>

          <button
            onClick={() => setCurrentView("widgets")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "widgets" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Widgets and embed code"
          >
            <SidebarIcon name="split" active={currentView === "widgets"} />
          </button>

          <button
            onClick={() => setCurrentView("badge")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "badge" ? "bg-blue-50 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Rating badge"
          >
            <SidebarIcon name="star" active={currentView === "badge"} />
          </button>

          <button
            onClick={() => {
              setCurrentView("settings");
              setSettingsTab("qrcode");
            }}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "settings" && settingsTab === "qrcode"
                ? "bg-blue-50 text-blue-600 shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Feedback and QR code"
          >
            <SidebarIcon name="chat" active={false} />
          </button>

          <div className="flex-1" />

          {/* Bottom Settings Icon → ведёт в единый центр «Бизнес-репутация» */}
          <button
            onClick={() => setCurrentView("reputation")}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
              currentView === "reputation" ? "bg-blue-100 text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}
            title="Business reputation settings"
          >
            <SidebarIcon name="gear" active={currentView === "reputation"} />
          </button>
        </aside>

        {/* Content Area */}
        <main className="min-w-0 flex-1 p-4 md:p-8 overflow-y-auto max-w-[1440px] mx-auto w-full">
          {/* =========================================================================
              VIEW 1: REVIEWS TABLE (Screenshot 1)
          ========================================================================= */}
          {currentView === "reviews" && (
            <div>
              {/* Top Navigation Row: Invoices Out, Invoices In, Filters, + Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Dark pill tab 'Invoices out' (опубликованные) vs 'Invoices in' (входящие, ещё не на сайте) */}
                  <button
                    onClick={() => switchTopTab("invoices_out")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      topTab === "invoices_out"
                        ? "bg-[#1E293B] text-white shadow-sm"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Published
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${topTab === "invoices_out" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {data.reviews.filter((r) => r.status === "published").length}
                    </span>
                  </button>
                  <button
                    onClick={() => switchTopTab("invoices_in")}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      topTab === "invoices_in"
                        ? "bg-[#1E293B] text-white shadow-sm"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Incoming
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${topTab === "invoices_in" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {data.reviews.filter((r) => r.status !== "published").length}
                    </span>
                  </button>

                  {/* Filters Button with count '3' and close icon 'x' */}
                  <button
                    onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span>Filters</span>
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </span>
                    <span className="text-slate-400 hover:text-slate-600 ml-0.5">×</span>
                  </button>
                </div>

                {/* Статистика + Primary Blue '+' Action Button */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStatsVisible((v) => !v)}
                    className={`flex h-10 items-center gap-2 rounded-lg border px-4 text-[13px] font-semibold transition-colors ${
                      statsVisible
                        ? "border-[#1E293B] bg-[#1E293B] text-white hover:bg-[#314155]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      {statsVisible ? (
                        <>
                          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                          <path d="M3 3l18 18" />
                        </>
                      ) : (
                        <>
                          <path d="M3 3v18h18" />
                          <path d="M7 15l4-5 4 3 5-7" />
                        </>
                      )}
                    </svg>
                    {statsVisible ? "Hide statistics" : "Show statistics"}
                  </button>
                  <button
                    onClick={() => setNewReviewModalOpen(true)}
                    className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center font-bold text-lg shadow-sm transition-colors"
                    title="Add review"
                  >
                    +
                  </button>
                </div>
              </div>

              <p className="mb-4 text-xs text-slate-400">
                {topTab === "invoices_out"
                  ? "Published — reviews currently visible on your website."
                  : "Incoming — reviews awaiting moderation, queued, rejected, or marked as spam."}
              </p>

              {/* Статистика отзывов — показывается/скрывается кнопкой выше */}
              {statsVisible && (
                <div className="mb-6">
                  <StatsPanel data={data} />
                </div>
              )}

              {/* Sub-tabs row: All (6), Draft (5), Sent (5), Paid (1), Partially paid (1), Overdue (1) */}
              <div className="bg-white rounded-xl border border-slate-200 p-2 mb-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-2 border-b border-slate-100 pb-3">
                  {/* Left Tabs with Blue Counter Badges */}
                  <div className="flex max-w-full items-center gap-6 overflow-x-auto whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setReviewFilter("all")}
                      className={`flex items-center gap-2 pb-2 -mb-3 transition-colors ${
                        reviewFilter === "all"
                          ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>All</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs">
                        {tabCounts.all}
                      </span>
                    </button>

                    <button
                      onClick={() => setReviewFilter("draft")}
                      className={`flex items-center gap-2 pb-2 -mb-3 transition-colors ${
                        reviewFilter === "draft"
                          ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Pending</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                        {tabCounts.draft}
                      </span>
                    </button>

                    <button
                      onClick={() => setReviewFilter("sent")}
                      className={`flex items-center gap-2 pb-2 -mb-3 transition-colors ${
                        reviewFilter === "sent"
                          ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Queued</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                        {tabCounts.sent}
                      </span>
                    </button>

                    <button
                      onClick={() => setReviewFilter("paid")}
                      className={`flex items-center gap-2 pb-2 -mb-3 transition-colors ${
                        reviewFilter === "paid"
                          ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Positive</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                        {tabCounts.paid}
                      </span>
                    </button>

                    <button
                      onClick={() => setReviewFilter("partially_paid")}
                      className={`flex items-center gap-2 pb-2 -mb-3 transition-colors ${
                        reviewFilter === "partially_paid"
                          ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Neutral</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                        {tabCounts.partially_paid}
                      </span>
                    </button>

                    <button
                      onClick={() => setReviewFilter("overdue")}
                      className={`flex items-center gap-2 pb-2 -mb-3 transition-colors ${
                        reviewFilter === "overdue"
                          ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span>Negative</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                        {tabCounts.overdue}
                      </span>
                    </button>
                  </div>

                  {/* Right side search + icons */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" x2="16.65" y1="21" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 w-48"
                      />
                    </div>

                    <button
                      onClick={() => {
                        const csvContent =
                          "data:text/csv;charset=utf-8," +
                          ["ID,Author,Date,Rating,Sentiment,Status,Content"]
                            .concat(
                              filteredReviews.map(
                                (r: DashboardReview) =>
                                  `"${r.id}","${r.authorName}","${r.createdAt}","${r.rating}","${r.sentiment}","${r.status}","${r.content.replace(/"/g, '""')}"`
                              )
                            )
                            .join("\n");
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "reviews_export.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showToast("CSV download started.");
                      }}
                      className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                      title="Export as CSV"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
                      title="Print"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect width="12" height="8" x="6" y="14" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4 w-10">
                          <input
                            type="checkbox"
                            onChange={handleSelectAll}
                            checked={
                              filteredReviews.length > 0 &&
                              selectedReviewIds.length === filteredReviews.length
                            }
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="py-3.5 px-4 font-semibold">Author</th>
                        <th className="py-3.5 px-4 font-semibold min-w-[280px]">Review</th>
                        <th className="py-3.5 px-4 font-semibold">Date</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                        <th className="py-3.5 px-4 font-semibold">Rating</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReviews.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            No reviews match your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredReviews.map((review: DashboardReview) => {
                          const isSelected = selectedReviewIds.includes(review.id);
                          const formattedDate = new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }).format(new Date(review.createdAt));
                          const reviewText = review.hiddenText ? "Text hidden by the moderator" : review.content;

                          return (
                            <tr
                              key={review.id}
                              className={`hover:bg-slate-50 transition-colors ${
                                isSelected ? "bg-blue-50/50" : ""
                              }`}
                            >
                              <td className="py-3.5 px-4 align-top">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleSelectRow(review.id)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>

                              <td className="py-3.5 px-4 align-top">
                                <div className="font-medium text-slate-800">{review.authorName}</div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {review.authorEmail && <span className="text-xs text-slate-400">{review.authorEmail}</span>}
                                  {review.authorCity && <span className="text-xs text-slate-400">{review.authorCity}</span>}
                                  {review.isAnonymous && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Publicly anonymous</span>}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 align-top max-w-[420px]">
                                <p className={`text-[13px] leading-snug text-slate-700 line-clamp-2 ${review.hiddenText ? "italic text-slate-400" : ""}`}>
                                  {reviewText}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  {(review.photos ?? []).length > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600" title="Attached photos">
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                                      {(review.photos ?? []).length}
                                    </span>
                                  )}
                                  {review.authorKind === "employee" && <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">Employee review</span>}
                                  {review.addedBy && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">Added by {review.addedBy}</span>}
                                </div>
                                {review.companyReply && (
                                  <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                                    <span className="font-semibold text-slate-600">Reply:</span> {review.companyReply}
                                  </p>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-slate-600 align-top whitespace-nowrap">{formattedDate}</td>

                              <td className="py-3.5 px-4 align-top">{renderStatusBadge(review)}</td>

                              <td className="py-3.5 px-4 align-top">
                                <div className="text-[13px] text-[#FBBC04] flex items-center gap-1">
                                  <span>{"★".repeat(review.rating)}</span>
                                  <span className="text-slate-400">({review.rating}/5)</span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right align-top">
                                <button
                                  type="button"
                                  onClick={() => { setPreviewOpen(false); setActiveMenuRowId(review.id); }}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-300"
                                  aria-label={`Open actions for ${review.authorName}`}
                                  aria-haspopup="dialog"
                                  aria-expanded={activeMenuRowId === review.id}
                                  title="Review actions"
                                  data-review-id={review.id}
                                >
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer matching screenshot 1 */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>10 of {filteredReviews.length} reviews per page</span>
                    <select className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none">
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-700">«</button>
                    <button className="text-slate-400 hover:text-slate-700">‹</button>
                    <span>Page</span>
                    <select className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none">
                      <option>1</option>
                      <option>2</option>
                      <option>3</option>
                      <option>4</option>
                    </select>
                    <span>of 4</span>
                    <button className="text-slate-400 hover:text-slate-700">›</button>
                    <button className="text-slate-400 hover:text-slate-700">»</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 2: BILLING & ANALYTICS (Screenshot 2 & 3)
          ========================================================================= */}
          {currentView === "analytics" && (
            <div>
              {/* Header Title & Top Tabs */}
              <h1 className="text-xl font-bold text-slate-900 mb-4">Billing</h1>

              {/* Top Tabs: Usage, Your plan, Payment, Invoices */}
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => setAnalyticsTab("usage")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    analyticsTab === "usage"
                      ? "bg-[#1E293B] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Usage
                </button>
                <button
                  onClick={() => setAnalyticsTab("plan")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    analyticsTab === "plan"
                      ? "bg-[#1E293B] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Your plan
                </button>
                <button
                  onClick={() => setAnalyticsTab("payment")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    analyticsTab === "payment"
                      ? "bg-[#1E293B] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Payment
                </button>
                <button
                  onClick={() => setAnalyticsTab("invoices")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    analyticsTab === "invoices"
                      ? "bg-[#1E293B] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Invoices
                </button>
              </div>

              {/* Section 1: Email manager statistic (3 cards with blue trend) */}
              <div className="mb-8">
                <div className="mb-3">
                  <h2 className="text-base font-bold text-slate-900">Email manager statistic</h2>
                  <p className="text-xs text-slate-400">Total</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1 */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Total emails for 30 days</div>
                        <div className="text-2xl font-bold text-slate-900">2906</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 text-xs font-semibold flex items-center gap-1">
                      ↗ 20%
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Open for 30 days</div>
                        <div className="text-2xl font-bold text-slate-900">2906</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-orange-50 text-orange-600 text-xs font-semibold flex items-center gap-1">
                      ↘ 20%
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 3l7 17 3-7 7-3L3 3z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Click for 30 days</div>
                        <div className="text-2xl font-bold text-slate-900">2906</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 text-xs font-semibold flex items-center gap-1">
                      ↗ 20%
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Web hosting statistic (Yellow Bar Chart + Month Sidebar) */}
              <div className="mb-8">
                <div className="mb-3">
                  <h2 className="text-base font-bold text-slate-900">Web hosting statistic</h2>
                  <p className="text-xs text-slate-400">Total</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row gap-6">
                  {/* Left month sub-panel */}
                  <div className="w-full md:w-64 border-r border-slate-100 pr-6 shrink-0">
                    <div className="space-y-4">
                      {/* Active Month */}
                      <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-2">
                          <span>May 2023</span>
                          <span className="text-slate-400 cursor-pointer">×</span>
                        </div>
                        <div className="space-y-1 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span>Emails</span>
                            <span className="font-semibold text-slate-900">23</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Opened</span>
                            <span className="font-semibold text-slate-900">1200</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Clicks</span>
                            <span className="font-semibold text-slate-900">4</span>
                          </div>
                        </div>
                      </div>

                      {/* Inactive Months */}
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700 py-1.5 border-b border-slate-100">
                        <span>April 2023</span>
                        <span className="text-slate-400">+</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700 py-1.5 border-b border-slate-100">
                        <span>March 2023</span>
                        <span className="text-slate-400">+</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700 py-1.5 border-b border-slate-100">
                        <span>February 2023</span>
                        <span className="text-slate-400">+</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700 py-1.5">
                        <span>Last year</span>
                        <span className="text-slate-400">+</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Yellow Bar Chart */}
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="h-48 w-full flex items-end gap-2 border-b border-l border-slate-200 pl-2 pb-1 relative">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                        <div className="border-b border-slate-400 w-full"></div>
                        <div className="border-b border-slate-400 w-full"></div>
                        <div className="border-b border-slate-400 w-full"></div>
                        <div className="border-b border-slate-400 w-full"></div>
                      </div>

                      {/* Bar columns */}
                      {[5, 1, 1, 6, 11, 1, 18, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map(
                        (val, index) => {
                          const heightPct = val > 0 ? (val / 18) * 100 : 0;
                          return (
                            <div
                              key={index}
                              className="flex-1 flex flex-col items-center justify-end h-full z-10 group"
                            >
                              {val > 0 && (
                                <div
                                  className="w-full rounded-t bg-amber-500 hover:bg-amber-600 transition-all cursor-pointer"
                                  style={{ height: `${heightPct}%` }}
                                  title={`Value: ${val}`}
                                ></div>
                              )}
                              <span className="text-[9px] text-slate-400 mt-2 -rotate-45 origin-top-left">
                                {`05/${index + 1 < 10 ? "0" + (index + 1) : index + 1}`}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Website Visits (Blue Bar Chart) */}
              <div className="mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-base font-bold text-slate-900">Website Visits</h2>
                    <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium">
                      <span>📅 Last 30 days</span>
                      <span>⌄</span>
                    </div>
                  </div>

                  {/* Solid Blue Bar Chart */}
                  <div className="h-56 w-full flex items-end gap-2 border-b border-l border-slate-200 pl-4 pb-2 relative">
                    {/* Y-axis labels */}
                    <div className="absolute -left-10 top-0 bottom-6 flex flex-col justify-between text-[10px] text-slate-400">
                      <span>4500</span>
                      <span>3500</span>
                      <span>2500</span>
                      <span>1500</span>
                      <span>500</span>
                      <span>0</span>
                    </div>

                    {/* Bars */}
                    {[
                      400, 450, 500, 1400, 600, 1200, 1600, 2600, 2000, 3200, 1500, 3200, 3600, 3200, 2000,
                      1500, 3600, 2500, 4100, 3600, 4600,
                    ].map((val, index) => {
                      const heightPct = (val / 4600) * 100;
                      const isLow = val < 600;
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                          <div
                            className={`w-full rounded-t transition-all cursor-pointer ${
                              isLow ? "bg-blue-200 hover:bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                            }`}
                            style={{ height: `${heightPct}%` }}
                            title={`Visits: ${val}`}
                          ></div>
                          <span className="text-[9px] text-slate-400 mt-2 -rotate-45 origin-top-left">
                            {`05/${index + 1 < 10 ? "0" + (index + 1) : index + 1}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Section 4: Web forms (3 stat cards) */}
              <div className="mb-8">
                <div className="mb-3">
                  <h2 className="text-base font-bold text-slate-900">Web forms</h2>
                  <p className="text-xs text-slate-400">Total</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect width="20" height="14" x="2" y="3" rx="2" />
                          <line x1="8" x2="16" y1="21" y2="21" />
                          <line x1="12" x2="12" y1="17" y2="21" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Total forms for 30 days</div>
                        <div className="text-2xl font-bold text-slate-900">2906</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 text-xs font-semibold">
                      ↗ 20%
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Open for 30 days</div>
                        <div className="text-2xl font-bold text-slate-900">2906</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-orange-50 text-orange-600 text-xs font-semibold">
                      ↘ 20%
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Answers for 30 days</div>
                        <div className="text-2xl font-bold text-slate-900">2906</div>
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 text-xs font-semibold">
                      ↗ 20%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 3: SETTINGS (Screenshot 5 & 6)
          ========================================================================= */}
          {currentView === "settings" && (
            <div>
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3">
                <div className="text-[12.5px] text-[#93370D]">
                  <span className="font-bold">Settings have moved.</span> Manage all reputation settings in Business reputation.
                </div>
                <button onClick={() => setCurrentView("reputation")} className="h-9 shrink-0 rounded-lg bg-[#101828] px-4 text-[12.5px] font-bold text-white">
                  Open Business reputation →
                </button>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-4">Settings</h1>

              {/* Sub-tabs: Account settings, Company information, API, Naming, Booking/Rating, QR code */}
              <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
                {[
                  { id: "account", label: "Account settings" },
                  { id: "company", label: "Company information" },
                  { id: "api", label: "API" },
                  { id: "naming", label: "Naming" },
                  { id: "booking", label: "Booking & Policy" },
                  { id: "qrcode", label: "QR code" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id as SettingsTab)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      settingsTab === tab.id
                        ? "bg-[#1E293B] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* QR Code Tab View (Screenshot 4) */}
              {settingsTab === "qrcode" ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm max-w-3xl">
                  <h2 className="text-base font-bold text-slate-900 mb-1">QR code</h2>
                  <p className="text-xs text-slate-500 mb-6">
                    Use this QR code to share your review collection page — you can copy or download it
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-8">
                    {/* Big QR Code Vector Card */}
                    <div className="w-56 h-56 bg-white border-2 border-slate-900 rounded-2xl p-4 flex items-center justify-center shrink-0 shadow-sm">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Clean geometric QR Code illustration */}
                        <rect x="5" y="5" width="28" height="28" fill="#0F172A" rx="4" />
                        <rect x="11" y="11" width="16" height="16" fill="#FFFFFF" rx="2" />
                        <rect x="15" y="15" width="8" height="8" fill="#0F172A" />

                        <rect x="67" y="5" width="28" height="28" fill="#0F172A" rx="4" />
                        <rect x="73" y="11" width="16" height="16" fill="#FFFFFF" rx="2" />
                        <rect x="77" y="15" width="8" height="8" fill="#0F172A" />

                        <rect x="5" y="67" width="28" height="28" fill="#0F172A" rx="4" />
                        <rect x="11" y="73" width="16" height="16" fill="#FFFFFF" rx="2" />
                        <rect x="15" y="77" width="8" height="8" fill="#0F172A" />

                        <rect x="40" y="8" width="6" height="14" fill="#0F172A" />
                        <rect x="50" y="8" width="8" height="6" fill="#0F172A" />
                        <rect x="40" y="26" width="18" height="6" fill="#0F172A" />
                        <rect x="8" y="40" width="14" height="6" fill="#0F172A" />
                        <rect x="26" y="40" width="8" height="18" fill="#0F172A" />
                        <rect x="40" y="40" width="20" height="20" fill="#0F172A" rx="2" />
                        <rect x="46" y="46" width="8" height="8" fill="#FFFFFF" />
                        <rect x="67" y="40" width="12" height="6" fill="#0F172A" />
                        <rect x="85" y="40" width="10" height="14" fill="#0F172A" />
                        <rect x="40" y="67" width="6" height="28" fill="#0F172A" />
                        <rect x="52" y="67" width="16" height="8" fill="#0F172A" />
                        <rect x="74" y="67" width="21" height="8" fill="#0F172A" />
                        <rect x="52" y="82" width="43" height="13" fill="#0F172A" />
                      </svg>
                    </div>

                    {/* Right Download & Action Buttons */}
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => showToast("SVG download requested.")}
                          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
                        >
                          Download SVG
                        </button>
                        <button
                          onClick={() => showToast("PNG download requested.")}
                          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
                        >
                          Download PNG
                        </button>
                        <button
                          onClick={() => showToast("SVG copy requested.")}
                          className="py-2.5 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
                        >
                          Copy SVG
                        </button>
                        <button
                          onClick={() => showToast("PNG copy requested.")}
                          className="py-2.5 px-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors text-center"
                        >
                          Copy PNG
                        </button>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                          <span>🔗</span>
                          <span>{`https://uppointment.com/review/${data.project.domain || "company"}`}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Updated 07 May 02:30, 2025 · File: 512 x 512 px
                        </div>
                      </div>

                      {/* Scan stats pill */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-medium">
                        <span>👁 128 scans</span>
                        <div className="w-4 h-4 rounded-full bg-slate-300"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Main Settings Form Cards */
                <div className="space-y-6 max-w-4xl">
                  {/* Card 1: Invoices / Templates */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 mb-1">Invoices / Layout Templates</h2>
                    <p className="text-xs text-slate-500 mb-4">Select template</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      {/* Classic */}
                      <div
                        onClick={() => setTemplateTheme("classic")}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          templateTheme === "classic"
                            ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/10"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="aspect-[3/4] bg-slate-50 border border-slate-200 rounded p-2 mb-3 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="w-12 h-2 bg-slate-300 rounded"></div>
                            <div className="w-8 h-1.5 bg-slate-200 rounded"></div>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                            <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="template"
                            checked={templateTheme === "classic"}
                            onChange={() => setTemplateTheme("classic")}
                            className="text-blue-600"
                          />
                          <span>Classic</span>
                        </label>
                      </div>

                      {/* Standart */}
                      <div
                        onClick={() => setTemplateTheme("standard")}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          templateTheme === "standard"
                            ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/10"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="aspect-[3/4] bg-slate-50 border border-slate-200 rounded p-2 mb-3 flex flex-col justify-between">
                          <div className="flex justify-between items-center">
                            <div className="w-8 h-2 bg-slate-300 rounded"></div>
                            <div className="w-6 h-2 bg-amber-400 rounded"></div>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                            <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="template"
                            checked={templateTheme === "standard"}
                            onChange={() => setTemplateTheme("standard")}
                            className="text-blue-600"
                          />
                          <span>Standart</span>
                        </label>
                      </div>

                      {/* Modern */}
                      <div
                        onClick={() => setTemplateTheme("modern")}
                        className={`border rounded-xl p-4 cursor-pointer transition-all ${
                          templateTheme === "modern"
                            ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/10"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="aspect-[3/4] bg-slate-50 border border-slate-200 rounded p-2 mb-3 flex flex-col justify-between">
                          <div className="w-full h-3 bg-blue-600 rounded-sm mb-2"></div>
                          <div className="space-y-1">
                            <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                            <div className="w-full h-1.5 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                          <input
                            type="radio"
                            name="template"
                            checked={templateTheme === "modern"}
                            onChange={() => setTemplateTheme("modern")}
                            className="text-blue-600"
                          />
                          <span>Modern</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                        <span>Display logo</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="w-5 h-5 rounded border-0 cursor-pointer p-0"
                        />
                        <span>Accent color ({brandColor})</span>
                      </label>
                    </div>
                  </div>

                  {/* Card 2: Default Options (Шкала оценок и классификация) */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 mb-1">Default Options</h2>
                    <p className="text-xs text-slate-500 mb-4">Enter information</p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="Title"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          You can change on each invoice / widget.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Subheading</label>
                        <input
                          type="text"
                          defaultValue="Share your experience"
                          placeholder="Subheading"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          This will be displayed on each invoice / widget header.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Standard memo / Terms
                        </label>
                        <textarea
                          rows={3}
                          defaultValue="Your review will be published according to our moderation policy."
                          className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          Appears on each invoice. You can choose to override it when you create an invoice.
                        </span>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                        <span>Customer must agree with terms before submitting</span>
                      </label>
                    </div>
                  </div>

                  {/* Card 3: Reminder Settings (Smart Queue Rules) matching screenshot 5 */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 mb-1">Reminder Settings & Cancellation Rules</h2>
                    <p className="text-xs text-slate-500 mb-4">
                      Uppointment will follow up on overdue items by sending gentle editable reminders
                    </p>

                    <div className="space-y-3 mb-4">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                        <span>3 calendar days after due date</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span>1 week after due date</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input type="checkbox" className="rounded text-blue-600" />
                        <span>2 week after due date</span>
                      </label>
                    </div>

                    {/* Smart Queue Toggle & Rules matching Screenshot 5 */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">
                            Smart queue rules
                          </span>
                          <input
                            type="checkbox"
                            checked={smartQueueEnabled}
                            onChange={(e) => setSmartQueueEnabled(e.target.checked)}
                            className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <button className="text-xs text-slate-500 border border-slate-200 rounded px-2 py-1">
                          📄 Document
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">
                        Set the cancellation policy, including time limits and refund percentages for penalties
                      </p>

                      <div className="space-y-2 text-xs text-slate-700">
                        <div className="flex items-center gap-3">
                          <span>1. If negative review is approved</span>
                          <span className="text-blue-600 font-semibold">then publish positive immediately</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>2. If rating drops below 4.5</span>
                          <span className="text-rose-600 font-semibold">then delay negative for review</span>
                        </div>
                      </div>
                    </div>

                    {/* Pink notice callout matching screenshot */}
                    <div className="mt-4 p-3 bg-red-50/70 border border-red-100 rounded-lg text-xs text-red-800 flex items-center gap-2">
                      <span>ℹ</span>
                      <span>You can send individual reminders on any invoices or reviews anytime.</span>
                    </div>
                  </div>

                  {/* Card 4: Payment method & Domain Security */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900 mb-1">Payment method & Domain Security</h2>
                    <p className="text-xs text-slate-500 mb-4">
                      Uppointment will follow up on overdue invoices by sending gentle editable reminders
                    </p>

                    {/* Payment / Channel Pills matching screenshot */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        "By check",
                        "Wire transfer",
                        "Zelle",
                        "Credit card",
                        "Google Pay",
                        "Paypal",
                        "Amazon Pay",
                      ].map((item, idx) => (
                        <button
                          key={item}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            idx === 1
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>

                    {/* Pink attention warning matching screenshot */}
                    <div className="p-3 bg-red-50/70 border border-red-100 rounded-lg text-xs text-red-800 flex items-center gap-2 mb-4">
                      <span>ℹ</span>
                      <span>
                        <strong>Attention:</strong> Avoid giving out your banking details to businesses or people you do not know or expect money from.
                      </span>
                    </div>

                    {/* Domain binding */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Allowed domain
                        </label>
                        <input
                          type="text"
                          value={projectDomain}
                          onChange={(e) => setProjectDomain(e.target.value)}
                          placeholder="example.com"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          The widget always loads on this domain. Extra allowed domains are set in Business reputation → Protection &amp; Settings.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="Europe/Moscow">Europe/Moscow (UTC+3)</option>
                          <option value="Europe/London">Europe/London</option>
                          <option value="America/New_York">America/New_York</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Save Action Button matching screenshot */}
                  <div className="flex justify-center gap-3 pt-4">
                    <button
                      onClick={handleSaveSettings}
                      disabled={isSubmitting}
                      className="px-16 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-md transition-colors"
                    >
                      {isSubmitting ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPreviewProject(null); setPreviewKind("form"); setPreviewOpen(true); }}
                      className="px-6 py-3 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Preview &amp; insert
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              VIEW 4: WIDGETS & EMBED SDK (Screenshot 4)
          ========================================================================= */}
          {currentView === "widgets" && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 mb-2">Widgets & Embed SDK</h1>
                  <p className="text-xs text-slate-500">
                    Add a review form, review feed, or rating badge to your website with a small embed snippet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView("install")}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                  Installation guide
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView("badge")}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l2.9 6.26 6.6.56-5 4.36 1.5 6.45L12 16.9 5.99 19.63l1.5-6.45-5-4.36 6.6-.56L12 2z" /></svg>
                  Badge settings
                </button>
              </div>

              {/* Widget Type Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "reviews", label: "Review feed", desc: "Display published customer feedback" },
                  { id: "form", label: "Review form", desc: "Collect ratings and comments" },
                  { id: "badge", label: "Rating badge", desc: "Show a compact rating summary" },
                  { id: "all-in-one", label: "All-in-one", desc: "Feed, form, and rating badge" },
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => {
                      setWidgetType(w.id as any);
                      setPreviewThanks(null);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      widgetType === w.id
                        ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-600/10"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="font-semibold text-sm text-slate-800">{w.label}</div>
                    <div className="text-xs text-slate-400 mt-1">{w.desc}</div>
                  </button>
                ))}
              </div>

              {/* Code Snippet Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-slate-800">HTML embed code</h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(widgetSnippet);
                      setCopiedSnippet(true);
                      setTimeout(() => setCopiedSnippet(false), 2000);
                      showToast("Embed code copied.");
                    }}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSnippet ? "✓ Copied" : "Copy code"}
                  </button>
                </div>
                <pre className="p-4 bg-slate-900 text-slate-100 text-xs rounded-lg overflow-x-auto font-mono">
                  <code>{widgetSnippet}</code>
                </pre>
              </div>

              {/* Allowed domains — the widget only loads on these origins */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                  <h2 className="text-sm font-bold text-slate-800">Allowed domains for the widget</h2>
                  <button
                    onClick={() => setCurrentView("reputation")}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Manage domains →
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  The widget and its API answer requests only from these domains. Every other origin is rejected, so the snippet cannot be reused on a third-party site.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                    {data.project.domain}
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700">primary</span>
                  </span>
                  {(data.project.allowedDomains ?? []).filter(Boolean).map((domain) => (
                    <span key={domain} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                      {domain}
                    </span>
                  ))}
                  {!(data.project.allowedDomains ?? []).filter(Boolean).length && (
                    <span className="text-xs text-slate-400 self-center">No extra domains yet — add them in Business reputation → Protection &amp; Settings.</span>
                  )}
                </div>
              </div>

              {/* Live Interactive Sandbox Preview */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800 mb-4">Interactive widget preview</h2>
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl">
                  {widgetType === "badge" && (
                    <div className={`flex items-center gap-3 rounded-xl border p-4 ${badgeLook.theme === "dark" ? "border-slate-700 bg-[#17181a]" : "border-slate-300 bg-white"}`}>
                      <BadgeSample format={data.project.badgeFormat} score={data.metrics.averageRating.toFixed(1)} count={data.metrics.published} look={badgeLook} />
                      <button type="button" onClick={() => setCurrentView("badge")} className="text-[11px] font-semibold text-blue-600 hover:underline">Badge settings</button>
                    </div>
                  )}

                  {widgetType === "reviews" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="font-bold text-slate-800">What our customers say</div>
                        <div className="text-amber-500 font-semibold text-sm">
                          ★ {data.metrics.averageRating.toFixed(1)} / 5
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.reviews
                          .filter((r: DashboardReview) => r.status === "published")
                          .slice(0, 4)
                          .map((r: DashboardReview) => (
                            <div key={r.id} className="p-3 bg-white rounded-lg border border-slate-200">
                              <div className="flex justify-between items-center text-xs mb-1">
                                <span className="font-semibold text-slate-800">{r.authorName}</span>
                                <span className="text-amber-400">{"★".repeat(r.rating)}</span>
                              </div>
                              <p className="text-xs text-slate-600">{r.content}</p>
                              {r.companyReply && (
                                <div className="mt-2 p-2 bg-blue-50/50 rounded text-[11px] text-blue-800 border-l-2 border-blue-600">
                                  <strong>Reply:</strong> {r.companyReply}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {(widgetType === "form" || widgetType === "all-in-one") && previewThanks && (
                    <WidgetThanksScreen
                      followUp={previewThanks.followUp}
                      status={previewThanks.status}
                      project={data.project}
                      onReset={() => setPreviewThanks(null)}
                    />
                  )}

                  {(widgetType === "form" || widgetType === "all-in-one") && !previewThanks && (
                    <form onSubmit={(event) => void handleCreateReview(event, "widget")} className="max-w-md bg-white p-5 rounded-xl border border-slate-200 space-y-3">
                      <div className="font-bold text-slate-900 text-sm">Leave a review</div>
                      <div>
                        <div className="flex gap-1 text-xl text-amber-400 cursor-pointer mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              onClick={() => setNewRating(star)}
                              className={star <= newRating ? "text-amber-400" : "text-slate-200"}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Your name"
                        value={newAuthorName}
                        onChange={(e) => setNewAuthorName(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                        required
                      />
                      {data.project.formShowEmail !== false && (
                        <input
                          type="email"
                          placeholder="Email (optional)"
                          value={newAuthorEmail}
                          onChange={(e) => setNewAuthorEmail(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                        />
                      )}
                      {data.project.formShowComment !== false && (
                        <textarea
                          placeholder="Tell us more (optional)"
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          rows={3}
                          maxLength={2000}
                          className="w-full border border-slate-200 rounded-lg p-2 text-xs"
                        />
                      )}
                      {customFieldsUI(true)}
                      {photoRules.allowPhotos && photoField(true)}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                      >
                        {isSubmitting ? "Submitting…" : "Submit review"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 5: QUEUE & SMART AUTOMATION
          ========================================================================= */}
          {currentView === "queue" && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 mb-1">Publication queue</h1>
                  <p className="text-xs text-slate-500">
                    Manage queued reviews and publish according to your smart queue rules.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">Smart queue:</span>
                  <button
                    onClick={() => {
                      setSmartQueueEnabled(!smartQueueEnabled);
                      handleSaveSettings();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      smartQueueEnabled
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {smartQueueEnabled ? "✓ Enabled" : "Disabled"}
                  </button>
                </div>
              </div>

              {/* Queue items */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h2 className="text-sm font-bold text-slate-800">Queued reviews</h2>
                {data.reviews.filter((r: DashboardReview) => r.status === "queued").length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    There are no reviews waiting in the queue.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.reviews
                      .filter((r: DashboardReview) => r.status === "queued")
                      .map((r: DashboardReview) => (
                        <div key={r.id} className="py-3 flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-800">{r.authorName}</span>
                              <span className="text-amber-400 text-xs">{"★".repeat(r.rating)}</span>
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                                Queued
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 max-w-xl">{r.content}</p>
                          </div>
                          <button
                            onClick={() => handleReviewAction(r.id, "publish")}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
                          >
                            Publish now
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === "moderation" && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-1">Moderation</h1>
                <p className="text-xs text-slate-500">Review feedback that needs approval before appearing on your website.</p>
              </div>
              <div className="space-y-4">
                {data.reviews.filter((r: DashboardReview) => r.status === "pending").length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
                    <div className="text-2xl mb-2">🎉</div>
                    <div className="font-bold text-slate-800 text-sm">All reviews have been checked!</div>
                    <div className="text-xs text-slate-400 mt-1">New reviews awaiting moderation will appear here.</div>
                  </div>
                ) : (
                  data.reviews
                    .filter((r: DashboardReview) => r.status === "pending")
                    .map((r: DashboardReview) => (
                      <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{r.authorName}</span>
                            <span className="text-amber-400">{"★".repeat(r.rating)}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                r.sentiment === "positive"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : r.sentiment === "neutral"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {r.sentiment.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString("en-US")}</span>
                        </div>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{r.content}</p>
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => {
                              setReplyModalReview(r);
                              setReplyText("");
                            }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            Reply to the customer
                          </button>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleReviewAction(r.id, "reject")} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold">
                              Reject
                            </button>
                            <button onClick={() => handleReviewAction(r.id, "spam")} className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold">
                              Mark as spam
                            </button>
                            <button onClick={() => handleReviewAction(r.id, "approve")} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">
                              Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {currentView === "overview" && (
            <div className="space-y-6 max-w-4xl">
              <h1 className="text-xl font-bold text-slate-900 mb-1">Reputation overview</h1>
              <p className="text-xs text-slate-500 mb-4">Key metrics for customer satisfaction and review publication.</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs text-slate-400 font-medium">Total reviews</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{data.metrics.total}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs text-slate-400 font-medium">Average rating</div>
                  <div className="text-2xl font-bold text-amber-500 mt-1">★ {data.metrics.averageRating.toFixed(1)}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs text-slate-400 font-medium">Published</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{data.metrics.published}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-xs text-slate-400 font-medium">Pending moderation</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{data.metrics.pending}</div>
                </div>
              </div>
            </div>
          )}

          {currentView === "install" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">Install the widget on your website</h1>
                    <p className="mt-1 text-sm text-slate-500">Four steps: allow your domain, choose the block, paste the code, and check the result.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPreviewProject(null); setPreviewKind(installKind); setPreviewOpen(true); }}
                    className="shrink-0 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
                  >Preview &amp; insert</button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" aria-label="Step 1: allow your domain">
                  <h2 className="text-sm font-bold text-slate-800"><span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[11px] text-white">1</span>Allow your domain</h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">The widget only loads on the domains connected to the project. Add every domain and subdomain where it will be shown.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800">
                      {data.project.domain}<span className="text-[10px] font-semibold uppercase">primary</span>
                    </span>
                    {(data.project.allowedDomains ?? []).filter(Boolean).map((domain) => (
                      <span key={domain} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700">{domain}</span>
                    ))}
                    {!(data.project.allowedDomains ?? []).filter(Boolean).length && (
                      <span className="text-xs text-slate-400 self-center">No extra domains yet.</span>
                    )}
                  </div>
                  <button type="button" className="rep-link mt-3 text-xs font-semibold text-blue-700 hover:underline" onClick={() => setCurrentView("reputation")}>
                    Manage domains in Business reputation →
                  </button>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" aria-label="Step 2: choose the block">
                  <h2 className="text-sm font-bold text-slate-800"><span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[11px] text-white">2</span>Choose what to show</h2>
                  <div className="mt-3 grid gap-2">
                    {INSTALL_KINDS.map((kind) => (
                      <label key={kind.id} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors ${installKind === kind.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                        <input type="radio" name="install-kind" className="mt-0.5" checked={installKind === kind.id} onChange={() => setInstallKind(kind.id)} />
                        <span>
                          <span className="block text-xs font-semibold text-slate-800">{kind.label}</span>
                          <span className="block text-[11px] text-slate-500">{kind.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm lg:col-span-2" aria-label="Step 3: paste the code">
                  <h2 className="text-sm font-bold text-slate-800"><span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[11px] text-white">3</span>Paste the code before <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">&lt;/body&gt;</code></h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">Add both lines to the page template. The script loads the widget, the <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">div</code> marks where it appears. Add as many <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">div</code> blocks as you need.</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-[12px] leading-relaxed text-slate-100"><code>{installSnippet}</code></pre>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      onClick={() => { navigator.clipboard.writeText(installSnippet); setInstallCopied(true); window.setTimeout(() => setInstallCopied(false), 2000); }}
                    >{installCopied ? "✓ Copied" : "Copy code"}</button>
                    <button type="button" className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors" onClick={() => setCurrentView("widgets")}>
                      Open Widgets &amp; Embed SDK
                    </button>
                  </div>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" aria-label="Step 4: check the widget">
                  <h2 className="text-sm font-bold text-slate-800"><span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-[11px] text-white">4</span>Check the result</h2>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-600">
                    <li>Save the page template and publish it.</li>
                    <li>Open the page in a private window and reload it without cache.</li>
                    <li>Submit a test review — it appears in Moderation or the queue depending on your publication rules.</li>
                    <li>Check the thank-you screen: positive reviews invite to Google, neutral and negative ones offer support.</li>
                  </ol>
                  <button
                    type="button"
                    onClick={() => { setPreviewProject(null); setPreviewKind(installKind); setPreviewOpen(true); }}
                    className="mt-3 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
                  >Open preview &amp; insert</button>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm" aria-label="Troubleshooting">
                  <h2 className="text-sm font-bold text-slate-800">If the widget does not appear</h2>
                  <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
                    <li><span className="font-semibold text-slate-800">“This domain is not connected to the project.”</span> — the page domain is missing from the allow-list. Add it in step 1.</li>
                    <li><span className="font-semibold text-slate-800">The script is blocked</span> — check the Content-Security-Policy of your site: it must allow <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">script-src</code> and <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">connect-src</code> for this domain.</li>
                    <li><span className="font-semibold text-slate-800">The feed is empty</span> — only published reviews are shown. Approve a review in Moderation first.</li>
                    <li><span className="font-semibold text-slate-800">No photo field in the form</span> — enable photos in Business reputation → Review form.</li>
                  </ul>
                </section>

                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm lg:col-span-2" aria-label="API for a custom integration">
                  <h2 className="text-sm font-bold text-slate-800">Building your own front end?</h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">The same data the widget uses is available over a public JSON API. Requests are accepted only from the allowed domains.</p>
                  <div className="mt-3 grid gap-2 text-[12px] sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="font-semibold text-slate-800">GET /api/v1/projects/{data.project.id.slice(0, 8)}…/reviews</div>
                      <p className="mt-1 text-[11px] text-slate-500">Published reviews, the rating summary, and the form settings.</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="font-semibold text-slate-800">POST /api/v1/projects/{data.project.id.slice(0, 8)}…/reviews</div>
                      <p className="mt-1 text-[11px] text-slate-500">Submit a review, with photos when they are enabled. Returns the thank-you follow-up.</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {currentView === "badge" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h1 className="text-lg font-bold text-slate-900">Rating badge</h1>
                    <p className="mt-1 max-w-xl text-sm text-slate-500">Pick one of the five kinds and tune how it looks. Everything here is saved and used wherever the widget renders a <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">{'data-widget="badge"'}</code> block.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPreviewProject(null); setPreviewKind("badge"); setPreviewOpen(true); }}
                    className="shrink-0 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
                  >Preview &amp; insert</button>
                </div>
                <div className={`mt-4 flex flex-wrap items-center gap-4 rounded-lg border p-4 ${badgeLook.theme === "dark" ? "border-slate-700 bg-[#17181a]" : "border-slate-200 bg-slate-50"}`}>
                  <BadgeSample format={badgeSelection} score={data.metrics.averageRating.toFixed(1)} count={data.metrics.published} look={badgeLook} />
                  <span className={`text-[11px] ${badgeLook.theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Live preview — {data.metrics.averageRating.toFixed(1)} from {data.metrics.published} published reviews</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800">Badge kind</h2>
                <p className="mt-1 text-[11px] text-slate-500">Every card is rendered with the appearance settings below.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {BADGE_META.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => void saveBadgeFormat(variant.id)}
                      className={`rounded-xl border p-4 text-left transition-colors ${badgeSelection === variant.id ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">{variant.name}</span>
                        {badgeSelection === variant.id && <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Active</span>}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{variant.description}</p>
                      <div className="mt-3 flex min-h-[46px] items-center"><BadgeSample format={variant.id} score={data.metrics.averageRating.toFixed(1)} count={data.metrics.published} look={badgeLook} /></div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800">Appearance</h2>
                <p className="mt-1 text-[11px] text-slate-500">Applied to every kind, to the badge inside the widget preview, and to the code you embed.</p>
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">Size</span>
                      <div className="flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label="Badge size">
                        {BADGE_SIZE_META.map((option) => (
                          <button key={option.id} type="button" aria-pressed={badgeLook.size === option.id} onClick={() => updateBadgeLook({ size: option.id }, "Badge size saved.")} className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${badgeLook.size === option.id ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{option.name}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">Corners</span>
                      <div className="flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label="Badge corners">
                        {BADGE_SHAPE_META.map((option) => (
                          <button key={option.id} type="button" aria-pressed={badgeLook.shape === option.id} onClick={() => updateBadgeLook({ shape: option.id }, "Badge corners saved.")} className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${badgeLook.shape === option.id ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>{option.name}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">Theme</span>
                      <div className="flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label="Badge theme">
                        {BADGE_THEME_META.map((option) => (
                          <button key={option.id} type="button" aria-pressed={badgeLook.theme === option.id} onClick={() => updateBadgeLook({ theme: option.id }, "Badge theme saved.")} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors ${badgeLook.theme === option.id ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-[3px] border border-slate-300" style={{ background: option.id === "brand" ? data.project.brandColor : option.background }} />
                            {option.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={badgeLook.showCount} onChange={(event) => updateBadgeLook({ showCount: event.target.checked }, "Review count setting saved.")} />
                    Show the review count
                    <span className="text-[11px] text-slate-400">— used by the Full and Banner kinds</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="badge-caption" className="text-xs font-semibold text-slate-700">Caption after the number</label>
                    <input id="badge-caption" className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-xs" value={badgeLook.label} maxLength={48} placeholder="reviews" onChange={(event) => setBadgeLook((current) => ({ ...current, label: event.target.value }))} onBlur={(event) => void persistBadge({ badgeLabel: event.target.value.trim() }, "Badge caption saved.")} />
                    <span className="text-[11px] text-slate-400">Leave empty for “reviews” (Full) or “verified reviews” (Banner).</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h2 className="text-sm font-bold text-slate-800">Embed the badge</h2>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-[12px] leading-relaxed text-slate-100"><code>{`<script src="${typeof window !== "undefined" ? window.location.origin : ""}/widget.js" data-project-id="${data.project.id}" defer></script>\n<div data-widget="badge" data-format="${badgeSelection}"></div>`}</code></pre>
                <button
                  type="button"
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  onClick={() => { navigator.clipboard.writeText(`<script src="${window.location.origin}/widget.js" data-project-id="${data.project.id}" defer></script>\n<div data-widget="badge" data-format="${badgeSelection}"></div>`); showToast("Badge code copied."); }}
                >Copy code</button>
                <p className="mt-2 text-[11px] text-slate-400">The same badge appears in the widget preview and on the Widgets page. Control where it can load in Business reputation → Protection &amp; Settings.</p>
              </div>
            </div>
          )}

          {currentView === "reputation" && (
            <ReputationHub
              project={data.project}
              onSaved={(p) => {
                setData((prev: DashboardData) => ({ ...prev, project: p }));
                setPreviewProject(p);
              }}
              onToast={showToast}
              metrics={{ averageRating: data.metrics.averageRating, published: data.metrics.published }}
              onPreview={(draft) => {
                setActiveMenuRowId(null);
                setPreviewProject(draft ?? data.project);
                setPreviewOpen(true);
              }}
            />
          )}

          {["clients", "channels", "team", "messages"].includes(currentView) && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-2xl shadow-sm">
              <h2 className="text-base font-bold text-slate-900 capitalize mb-1">{currentView}</h2>
              <p className="text-xs text-slate-500 mb-4">Manage customer feedback and project channels in your reputation workspace.</p>
              <button onClick={() => setCurrentView("reviews")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
                Back to reviews
              </button>
            </div>
          )}
        </main>
      </div>

      <ReviewActionsDrawer
        key={activeMenuRowId ?? "closed"}
        review={selectedReview}
        project={data.project}
        busy={isSubmitting}
        onClose={() => setActiveMenuRowId(null)}
        onAction={handleReviewAction}
        onLocal={handleLocalAction}
      />

      <WidgetDrawer
        open={previewOpen}
        onClose={() => { setPreviewOpen(false); setPreviewProject(null); }}
        data={data}
        projectOverride={previewProject}
        kind={previewKind}
        onKind={setPreviewKind}
        onToast={showToast}
      />

      {newReviewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Add a review</h2>
              <button onClick={() => setNewReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>
            <form onSubmit={(event) => void handleCreateReview(event, "admin")} className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">Who is the author?</span>
                <div className="flex gap-2" role="radiogroup" aria-label="Review author">
                  {([["customer", "Customer"], ["employee", "Me (employee)"]] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={newAuthorKind === value}
                      onClick={() => setNewAuthorKind(value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${newAuthorKind === value ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >{label}</button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {newAuthorKind === "employee"
                    ? "The review is published under your employee name. Use it for feedback received by phone, in chat, or on paper."
                    : "Enter the review on behalf of a customer — their name is shown publicly."}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {newAuthorKind === "employee" ? "Employee name *" : "Customer name *"}
                </label>
                <input type="text" required placeholder={newAuthorKind === "employee" ? "For example, Maria (manager)" : "For example, Alex P."} value={newAuthorName} onChange={(e) => setNewAuthorName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" />
              </div>
              {(data.project.formShowEmail !== false || data.project.formShowCity !== false) && (
                <div className="grid grid-cols-2 gap-3">
                  {data.project.formShowEmail !== false && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                      <input type="email" placeholder="alex@example.com" value={newAuthorEmail} onChange={(e) => setNewAuthorEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" />
                    </div>
                  )}
                  {data.project.formShowCity !== false && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                      <input type="text" placeholder="Amsterdam" value={newAuthorCity} onChange={(e) => setNewAuthorCity(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" />
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rating *</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button type="button" key={star} onClick={() => setNewRating(star)} className={`text-2xl ${star <= newRating ? "text-amber-400" : "text-slate-200"}`}>★</button>
                  ))}
                  <span className="text-xs text-slate-500 ml-2">({newRating} out of 5)</span>
                </div>
              </div>
              {data.project.formShowComment !== false && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Review text <span className="font-normal text-slate-400">(optional)</span></label>
                  <textarea rows={4} maxLength={2000} placeholder="Describe the customer experience (optional)…" value={newContent} onChange={(e) => setNewContent(e.target.value)} className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-800" />
                </div>
              )}
              {customFieldsUI(false)}
              {photoRules.allowPhotos
                ? photoField(false)
                : <p className="text-[11px] text-slate-400">Photo attachments are turned off in Business reputation → Review form.</p>}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Added by</label>
                <input type="text" maxLength={120} placeholder="Administrator" value={newAddedBy} onChange={(e) => setNewAddedBy(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" />
                <p className="mt-1 text-[11px] text-slate-400">The employee who enters this review. Visible in the review panel and in exports.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setNewReviewModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
                  {isSubmitting ? "Saving…" : "Add review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {replyModalReview && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Reply to {replyModalReview.authorName}</h2>
              <button onClick={() => setReplyModalReview(null)} className="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-100">
              <div className="font-semibold text-slate-900 mb-1">{"★".repeat(replyModalReview.rating)} — {replyModalReview.authorName}</div>
              <p>{replyModalReview.content}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Public company reply</label>
              <textarea rows={4} placeholder="Thank you for sharing your feedback…" value={replyText} onChange={(e) => setReplyText(e.target.value)} className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-800" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setReplyModalReview(null)} className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={() => handleReviewAction(replyModalReview.id, "reply", { reply: replyText })} disabled={isSubmitting || !replyText.trim()} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">
                {isSubmitting ? "Submitting…" : "Publish reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div role="status" className="fixed bottom-6 left-1/2 max-w-[calc(100vw-24px)] -translate-x-1/2 bg-[#1E293B] text-white px-5 py-3 rounded-xl z-[80] text-xs font-semibold flex items-center gap-2 toast-slide-up">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}