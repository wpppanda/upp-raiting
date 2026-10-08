"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardProject, DashboardReview } from "@/lib/dashboard-data";
import SidePanel from "@/components/side-panel";
import ReviewActions from "@/components/review-actions";
import type { ActionOptions, ActionResult, MenuAction, ReviewAction } from "@/components/review-actions";

const statusLabels: Record<DashboardReview["status"], string> = {
  published: "Published", pending: "Pending moderation", queued: "In queue", rejected: "Rejected", spam: "Spam",
};
const sentimentLabels: Record<DashboardReview["sentiment"], string> = { positive: "Positive", neutral: "Neutral", negative: "Negative" };
const sentimentColors = { positive: "bg-[#eaf8f1] text-[#17865e]", neutral: "bg-[#fff6e3] text-[#b68022]", negative: "bg-[#fff0ed] text-[#bc5446]" };
const sourceLabels: Record<string, string> = { "Виджет сайта": "Website widget", "Форма сбора отзывов": "Review form" };

function formatDate(value: string | Date | null, timeZone: string) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone }).format(date);
}

export default function ReviewActionsDrawer({ review, project, busy, onClose, onAction, onLocal }: {
  review: DashboardReview | null;
  project: DashboardProject;
  busy: boolean;
  onClose: () => void;
  onAction: (id: string, action: ReviewAction, options?: ActionOptions) => Promise<ActionResult>;
  onLocal: (review: DashboardReview, action: string) => Promise<string>;
}) {
  const [mode, setMode] = useState<"reply" | "rating" | null>(null);
  const [draftReply, setDraftReply] = useState(review?.companyReply ?? "");
  const [draftRating, setDraftRating] = useState(review?.rating ?? 5);
  const [confirm, setConfirm] = useState<Extract<MenuAction, { kind: "api" }> | null>(null);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const scale = project.ratingScale;
  const maximum = scale === "nps" ? 10 : scale === "binary" ? 1 : 5;
  const minimum = scale === "binary" || scale === "nps" ? 0 : 1;

  useEffect(() => {
    if (mode || confirm) editorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (mode === "reply") replyRef.current?.focus({ preventScroll: true });
  }, [mode, confirm]);

  const execute = async (action: ReviewAction, options?: ActionOptions) => {
    if (!review || busy) return;
    setNotice(null);
    try {
      const result = await onAction(review.id, action, options);
      setNotice(result);
      if (result.ok) { setMode(null); setConfirm(null); }
    } catch {
      setNotice({ ok: false, message: "Unable to save changes. Please try again." });
    }
  };

  const openReply = (template = false) => {
    if (!review) return;
    setConfirm(null);
    setNotice(null);
    setDraftReply(template
      ? review.sentiment === "negative"
        ? "Thank you for your feedback. We are sorry about your experience. Please contact our support team so we can make it right."
        : review.sentiment === "neutral"
          ? "Thank you for sharing your experience. We appreciate your suggestions and would love to know how we can improve."
          : "Thank you for your kind words! We are delighted you enjoyed your experience and look forward to welcoming you back."
      : review.companyReply ?? "");
    setMode("reply");
  };

  const handleLocal = async (action: string) => {
    if (!review || busy) return;
    if (action === "template") { openReply(true); return; }
    if (action === "rating") { setMode("rating"); setConfirm(null); setNotice(null); setDraftRating(review.rating); return; }
    try { setNotice({ ok: true, message: await onLocal(review, action) }); }
    catch (error) { setNotice({ ok: false, message: error instanceof Error ? error.message : "Unable to complete this action." }); }
  };

  return (
    <SidePanel open={!!review} onClose={onClose} title="Review actions" subtitle="Manage publication, moderation, and replies." closeLabel="Close review actions" width={460}>
      {review && <>
        {notice && <div role={notice.ok ? "status" : "alert"} className={`sticky top-0 z-10 border-b px-5 py-3 text-xs leading-relaxed ${notice.ok ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-rose-100 bg-rose-50 text-rose-800"}`}>{notice.message}</div>}
        {busy && <div role="status" className="sticky top-0 z-10 border-b border-blue-100 bg-blue-50 px-5 py-3 text-xs text-blue-700">Saving changes…</div>}
        <div className="border-b border-[#e9edf2] bg-[#f8fafc] px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e8eff9] text-[13px] font-semibold text-[#5074a5]" aria-hidden="true">{review.authorName.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#344054]">{review.authorName}</p>
              <p className="mt-1 text-[10px] text-slate-400">{formatDate(review.createdAt, project.timezone)}</p>
            </div>
            <span className="shrink-0 text-xs text-[#d8a023]" aria-label={`Rating ${review.rating} out of ${maximum}`}>
              {scale === "stars" ? <>{"★".repeat(Math.max(0, Math.min(5, review.rating)))}<span className="text-slate-200">{"★".repeat(Math.max(0, 5 - review.rating))}</span></> : scale === "binary" ? review.rating ? "Yes" : "No" : `${review.rating}/${maximum}`}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-[#dae4f2] bg-[#f0f5fc] px-2 py-0.5 text-[10px] text-[#58779f]">{statusLabels[review.status]}</span>
            <span className={`rounded px-2 py-0.5 text-[10px] ${sentimentColors[review.sentiment]}`}>{sentimentLabels[review.sentiment]}</span>
            {review.isAnonymous && <span className="rounded bg-[#fff7e7] px-2 py-0.5 text-[10px] text-[#9b6b1e]">Publicly anonymous</span>}
            {review.pinned && <span className="rounded bg-[#eef0ff] px-2 py-0.5 text-[10px] text-[#7169a4]">Pinned</span>}
          </div>
          <p className="review-details-text mt-3 text-[13px] leading-[1.7] text-[#475467]">{review.content}</p>
          {review.hiddenText && <p className="mt-2 text-[11px] text-amber-700">The comment is hidden on your website. Moderators can still read it here.</p>}
          {review.companyReply && <div className="mt-3 border-l-2 border-[#a7c3e9] pl-3"><p className="text-[10px] font-semibold text-[#6d88aa]">Company reply</p><p className="review-details-text mt-1 text-xs leading-relaxed text-[#78879a]">{review.companyReply}</p></div>}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
            <span>{sourceLabels[review.source] ?? review.source}</span>
            {review.authorCity && <span>City · {review.authorCity}</span>}
            {review.authorEmail && <span>Email · {review.authorEmail}</span>}
            <span title={review.id}>ID · {review.id.slice(0, 8)}</span>
          </div>
          {review.scheduledAt && review.status === "queued" && <p className="mt-2 text-[11px] text-[#607c9f]">Publishes: {formatDate(review.scheduledAt, project.timezone)}</p>}
        </div>

        {(mode || confirm) && <div ref={editorRef} className="border-b border-[#e9edf2] px-5 py-4">
          {mode === "reply" && <form onSubmit={event => { event.preventDefault(); void execute("reply", { reply: draftReply.trim() }); }}>
            <label htmlFor="drawer-company-reply" className="mb-2 block text-[13px] font-semibold text-[#344054]">{review.companyReply ? "Edit company reply" : "Write a company reply"}</label>
            <textarea id="drawer-company-reply" ref={replyRef} value={draftReply} onChange={event => setDraftReply(event.target.value)} rows={5} minLength={2} maxLength={2000} required disabled={busy} className="w-full resize-y rounded-md border border-[#d0d5dd] p-3 text-[13px] leading-relaxed text-[#475467]" placeholder="Thank you for sharing your feedback…" />
            <p className="mt-1 text-[10px] text-slate-400">Your reply will be public. {draftReply.length}/2,000 characters</p>
            <div className="mt-3 flex justify-end gap-2"><button type="button" className="panel-secondary-button" disabled={busy} onClick={() => setMode(null)}>Cancel</button><button type="submit" className="panel-primary-button" disabled={busy || draftReply.trim().length < 2}>{busy ? "Saving…" : "Publish reply"}</button></div>
          </form>}
          {mode === "rating" && <form onSubmit={event => { event.preventDefault(); void execute("change_rating", { rating: draftRating }); }}>
            <label htmlFor="drawer-review-rating" className="mb-2 block text-[13px] font-semibold text-[#344054]">Change review rating</label>
            <select id="drawer-review-rating" className="h-10 w-full rounded-md border border-[#d0d5dd] bg-white px-3 text-[13px]" value={draftRating} onChange={event => setDraftRating(Number(event.target.value))} disabled={busy}>{Array.from({ length: maximum - minimum + 1 }, (_, i) => i + minimum).map(value => <option key={value} value={value}>{scale === "binary" ? value ? "Yes" : "No" : `${value} / ${maximum}`}</option>)}</select>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">This changes the author’s score. Sentiment will be recalculated using your project thresholds.</p>
            <div className="mt-3 flex justify-end gap-2"><button type="button" className="panel-secondary-button" disabled={busy} onClick={() => setMode(null)}>Cancel</button><button type="submit" className="panel-primary-button" disabled={busy || draftRating === review.rating}>Save rating</button></div>
          </form>}
          {confirm && <div role="alert"><h3 className="text-[13px] font-semibold text-[#344054]">{confirm.action === "spam" ? "Mark this review as spam?" : "Reject this review?"}</h3><p className="mt-2 text-xs leading-relaxed text-slate-500">It will no longer appear on your website. You can return it to moderation later.</p><div className="mt-3 flex justify-end gap-2"><button type="button" className="panel-secondary-button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button><button type="button" disabled={busy} className="rounded-md bg-[#c7473a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" onClick={() => void execute(confirm.action, confirm)}>{confirm.action === "spam" ? "Mark as spam" : "Reject review"}</button></div></div>}
        </div>}

        <div className="px-2 pb-5 pt-4 sm:px-3">
          <ReviewActions review={review} busy={busy} canContactSupport={!!project.supportEmail} onReply={() => openReply()} onLocal={action => void handleLocal(action)} onMenuAction={menu => {
            if (menu.kind !== "api") return;
            if (menu.action === "reject" || menu.action === "spam") { setMode(null); setConfirm(menu); setNotice(null); }
            else void execute(menu.action, menu);
          }} />
        </div>
      </>}
    </SidePanel>
  );
}
