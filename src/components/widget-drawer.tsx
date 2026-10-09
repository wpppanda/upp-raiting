"use client";

import { useEffect, useState } from "react";
import type { DashboardData, DashboardProject } from "@/lib/dashboard-data";
import GoogleG from "@/components/google-g";
import SidePanel from "@/components/side-panel";

export type PreviewKind = "reviews" | "form" | "badge" | "all-in-one" | "after";
type AfterSentiment = "positive" | "neutral" | "negative";

function Rating({ value = 5 }: { value?: number }) {
  return <span className="text-[13px] leading-none tracking-wider text-[#FBBC04]">{"★".repeat(Math.max(0, Math.min(5, Math.round(value))))}<span className="text-[#DADCE0]">{"★".repeat(Math.max(0, 5 - Math.round(value)))}</span></span>;
}
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "A"; }
function BadgePreview({ format, score, count }: { format: string; score: string; count: number }) {
  if (format === "banner") return <div className="flex w-full max-w-full items-center gap-3 rounded-lg border border-[#8f959c] px-4 py-3"><span className="flex items-center gap-2"><strong className="text-lg font-medium text-[#202124]">{score}</strong><Rating value={5} /></span><span className="h-6 w-px bg-[#dadce0]" /><span className="text-[11px] text-[#5f6368]">{count} verified reviews</span></div>;
  if (format === "number") return <div className="inline-flex items-center rounded-lg border border-[#8f959c] px-4 py-2"><strong className="text-lg font-medium text-[#202124]">{score}</strong></div>;
  if (format === "stars-only") return <div className="inline-flex items-center rounded-lg border border-[#8f959c] px-4 py-2"><span className="text-[17px] tracking-[2px] text-[#FBBC04]">★★★★★</span></div>;
  if (format === "stars") return <div className="inline-flex items-center gap-2 rounded-lg border border-[#8f959c] px-4 py-2"><strong className="text-lg font-medium text-[#202124]">{score}</strong><Rating value={5} /></div>;
  return <div className="inline-flex items-center gap-2 rounded-lg border border-[#8f959c] px-4 py-2"><strong className="text-lg font-medium text-[#202124]">{score}</strong><Rating value={5} /><span className="text-[10px] text-[#5f6368]">{count} reviews</span></div>;
}
function formatDate(value: string | Date | null) { return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : ""; }

export default function WidgetDrawer({ open, onClose, data, kind, onKind, onToast, projectOverride }: {
  open: boolean;
  onClose: () => void;
  data: DashboardData;
  kind: PreviewKind;
  onKind: (kind: PreviewKind) => void;
  onToast: (message: string) => void;
  projectOverride?: DashboardProject | null;
}) {
  const [afterSentiment, setAfterSentiment] = useState<AfterSentiment>("negative");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const p = projectOverride ?? data.project;
  const embedKind = kind === "after" ? "form" : kind;
  const snippet = `<script src="${origin}/widget.js" data-project-id="${p.id}" defer></script>\n<div data-widget="${embedKind}" data-limit="6" data-show-response="true"></div>`;
  const published = data.reviews.filter(review => review.status === "published").sort((a, b) => Number(b.pinned) - Number(a.pinned)).slice(0, 3);
  const afterContact = afterSentiment === "neutral" ? p.neutralSupportContact : p.negativeSupportContact;
  const afterChat = afterSentiment === "neutral" ? p.neutralSupportChat : p.negativeSupportChat;

  async function copy() {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      onToast("Widget code copied.");
      window.setTimeout(() => setCopied(false), 2200);
    } catch { setCopyError("Clipboard access was denied. Select the code and copy it manually."); }
  }

  const previewCard = (review: DashboardData["reviews"][number]) => {
    const displayName = review.isAnonymous ? "Anonymous" : p.publicShowName ? review.authorName : "";
    const showAvatar = p.publicShowAvatar;
    const meta = [p.publicShowCity && !review.isAnonymous ? review.authorCity : null, p.publicShowDate ? formatDate(review.publishedAt) : null].filter(Boolean).join(" · ");
    return <article key={review.id} className="rounded-lg border border-[#e8eaed] p-3">
      <div className="flex items-start gap-2.5">
        {showAvatar && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e8eff9] text-[10px] font-bold text-[#5476a1]">{review.isAnonymous ? "A" : initials(review.authorName)}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {displayName && <strong className="text-xs font-medium text-[#202124]">{displayName}</strong>}
            <Rating value={review.rating} />
          </div>
          {meta && <p className="mt-0.5 text-[10px] text-[#80868b]">{meta}</p>}
        </div>
      </div>
      {p.publicShowText && <p className={`mt-2 break-words text-xs leading-relaxed ${review.hiddenText ? "italic text-slate-400" : "text-slate-600"}`}>{review.hiddenText ? "Text hidden by the moderator" : review.content || "Rating only"}</p>}
      {review.companyReply && <div className="mt-2 border-l-2 bg-[#f8f9fa] p-2 text-[11px] text-slate-500" style={{ borderColor: p.brandColor }}><strong className="font-medium">Company reply: </strong>{review.companyReply}</div>}
    </article>;
  };

  return <SidePanel open={open} onClose={onClose} title="Widget preview" subtitle="Settings in Business reputation are applied below." closeLabel="Close widget preview" width={430} footer={<button type="button" onClick={() => void copy()} className="panel-primary-button w-full">{copied ? "Copied to clipboard" : "Copy embed code"}</button>}>
    <div className="sticky top-0 z-10 flex gap-1 border-b border-[#eaecf0] bg-white px-4 py-3" role="tablist" aria-label="Widget preview type">
      {([{ id: "reviews", label: "Feed" }, { id: "form", label: "Form" }, { id: "badge", label: "Badge" }, { id: "all-in-one", label: "All-in-one" }, { id: "after", label: "After submission" }] as { id: PreviewKind; label: string }[]).map(tab => <button type="button" key={tab.id} role="tab" aria-selected={kind === tab.id} onClick={() => onKind(tab.id)} className={`min-h-8 flex-1 rounded-md px-2 text-[10.5px] font-medium ${kind === tab.id ? "bg-[#1e293b] text-white" : "text-slate-500 hover:bg-slate-50"}`}>{tab.label}</button>)}
    </div>
    <div className="bg-[#f8fafc] p-4 sm:p-5">
      <div className="mb-3 rounded-md border border-[#e9edf2] bg-white px-3 py-2 text-[10px] leading-relaxed text-[#667085]">
        Showing: {p.publicShowAvatar ? "avatar" : "no avatar"} · {p.publicShowName ? "name" : "no name"} · {p.publicShowCity ? "city" : "no city"} · {p.publicShowDate ? "date" : "no date"} · {p.publicShowText ? "review text" : "rating only"}
      </div>
      <div className="overflow-hidden rounded-lg border border-[#e4e7ec] bg-white">
        <div className="flex items-center gap-1.5 border-b border-[#f2f4f7] bg-[#fcfcfd] px-3 py-2.5"><span className="h-2 w-2 rounded-full bg-[#ef9a8e]" /><span className="h-2 w-2 rounded-full bg-[#edcb7d]" /><span className="h-2 w-2 rounded-full bg-[#9bc4a1]" /><span className="ml-2 flex-1 truncate rounded bg-[#f2f4f7] px-2 py-1 text-[10px] text-slate-500">{p.domain}</span></div>
        <div className="p-4">
          <div className="mb-4 flex items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-xs font-semibold text-white" style={{ background: p.brandColor }}>{p.name.slice(0, 1).toUpperCase()}</span><span className="text-xs font-semibold text-[#344054]">{p.name}</span></div>
          {(kind === "badge" || kind === "all-in-one") && <div className="mb-4"><BadgePreview format={p.badgeFormat} score={data.metrics.averageRating.toFixed(1)} count={data.metrics.published} /></div>}
          {(kind === "reviews" || kind === "all-in-one") && <div className="space-y-2.5"><h3 className="text-[13px] font-semibold">What our customers say</h3>{!published.length && <p className="py-5 text-center text-xs text-slate-500">No published reviews yet.</p>}{published.map(previewCard)}</div>}
          {(kind === "form" || kind === "all-in-one") && <div className="mt-3 rounded-lg border border-[#e8eaed] p-3"><h3 className="mb-2 text-[13px] font-semibold">Share your experience</h3><Rating value={5} /><div className="mt-3 rounded-md border border-[#8f959c] bg-white px-2 py-2 text-[11px] text-slate-500">Your name</div><div className="mt-2 rounded-md border border-[#8f959c] bg-white px-2 py-2 text-[11px] text-slate-500">Email address (optional)</div><div className="mt-2 rounded-md border border-[#8f959c] bg-white px-2 py-2 text-[11px] text-slate-500">City (optional)</div>{(p.formFields ?? []).map(field => <div key={field.id} className="mt-2 rounded-md border border-[#8f959c] bg-white px-2 py-2 text-[11px] text-slate-500">{field.label}{field.required ? " *" : ""}{field.type === "select" ? " · select" : ""}</div>)}<div className="mt-2 h-16 rounded-md border border-[#8f959c] px-2 py-2 text-[11px] text-slate-500">{p.reviewTextRequired ? "Tell us about your experience…" : "Tell us more (optional)"}</div>{p.allowAnonymousReviews && <div className="mt-2 flex items-start gap-2 text-[10px] text-[#667085]"><span className="mt-0.5 h-3 w-3 rounded-sm border border-[#5f6368]" />Publish this review anonymously</div>}<div className="mt-2 rounded-md px-3 py-2.5 text-center text-xs font-medium text-white" style={{ background: p.brandColor }}>Submit review</div><p className="mt-2 text-[10px] text-slate-400">Preview only · no review will be submitted.</p></div>}
          {kind === "after" && <div><div className="mb-3 flex gap-1.5" aria-label="Preview sentiment">{(["positive", "neutral", "negative"] as const).map(sentiment => <button type="button" key={sentiment} onClick={() => setAfterSentiment(sentiment)} aria-pressed={afterSentiment === sentiment} className={`h-8 flex-1 rounded-md border text-[11px] capitalize ${afterSentiment === sentiment ? "border-[#1e293b] bg-[#1e293b] text-white" : "border-[#e4e7ec] text-slate-500"}`}>{sentiment}</button>)}</div><div className="rounded-lg border border-[#e8eaed] bg-[#fcfcfd] p-4 text-center"><span className="mx-auto mb-3 grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: p.brandColor }}>✓</span><h3 className="text-sm font-semibold">Thank you for your feedback!</h3>{afterSentiment === "positive" ? p.invitePositiveToExternal ? <div className="mt-3"><p className="mb-3 text-xs leading-relaxed text-slate-500">We would love it if you shared your experience on Google.</p>{p.googleReviewUrl ? <div className="flex items-center justify-center gap-2 rounded-full border border-[#dadce0] bg-white px-3 py-2.5 text-xs"><GoogleG size={16} /> Leave a review on Google</div> : <p className="text-[10px] text-amber-700">Google review link is missing in Protection & Settings.</p>}</div> : <p className="mt-3 text-xs text-slate-500">Google invitations are disabled.</p> : afterContact || afterChat ? <div className="mt-3"><p className="mb-3 text-xs leading-relaxed text-slate-500">{p.supportOfferText}</p><div className="space-y-2">{afterContact && !!p.supportEmail.trim() && <div className="rounded-md border border-[#d0d5dd] bg-white px-3 py-2.5 text-xs font-medium text-slate-600">Email customer support</div>}{afterChat && !!p.supportChatUrl.trim() && <div className="rounded-md px-3 py-2.5 text-xs font-medium text-white" style={{ background: p.brandColor }}>Chat with support</div>}</div>{((afterContact && !p.supportEmail) || (afterChat && !p.supportChatUrl)) && <p className="mt-2 text-[10px] leading-relaxed text-amber-700">Add support contact details in Protection & Settings to show these buttons to customers.</p>}</div> : <p className="mt-3 text-xs text-slate-500">Support suggestions are disabled for this category.</p>}</div></div>}
        </div>
      </div>
      {kind !== "after" ? (
        <div className="mt-4 rounded-lg border border-[#e9edf2] bg-white p-3">
          <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-semibold">Embed code</h3><button type="button" onClick={() => void copy()} className="rounded-md bg-blue-50 px-2.5 py-1 text-[11px] text-blue-600">{copied ? "Copied" : "Copy"}</button></div>
          <pre className="whitespace-pre-wrap break-all rounded-md bg-[#1e293b] p-3 font-mono text-[10px] leading-relaxed text-slate-200">{snippet}</pre>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">Allowed domains: <strong className="font-medium text-slate-700">{[p.domain, ...(p.allowedDomains ?? []).filter(Boolean)].join(", ")}</strong><br />The widget only loads on these domains. Manage the list in Business reputation → Protection &amp; Settings.{copyError && <><br /><span className="text-red-600">{copyError}</span></>}</p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-[#e9edf2] bg-white p-3"><p className="text-[11px] leading-relaxed text-slate-500">Allowed domains: <strong className="font-medium text-slate-700">{[p.domain, ...(p.allowedDomains ?? []).filter(Boolean)].join(", ")}</strong><br />The embed code and the step-by-step installation guide live on the Install page and the Widgets page.</p></div>
      )}
    </div>
</SidePanel>;
}
