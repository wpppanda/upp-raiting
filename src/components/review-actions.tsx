"use client";

import type { ReactNode } from "react";
import type { DashboardReview } from "@/lib/dashboard-data";

export type ReviewAction = "approve" | "publish" | "unpublish" | "reject" | "spam" | "reply" | "delay" | "hide" | "show" | "pin" | "unpin" | "change_rating";
export type ActionOptions = { reply?: string; text?: string; minutes?: number; rating?: number };
export type ActionResult = { ok: boolean; message: string };
export type MenuAction =
  | ({ kind: "api"; action: ReviewAction } & ActionOptions)
  | { kind: "reply" }
  | { kind: "local"; id: string };

function Row({ icon, label, hint, tone = "default", disabled = false, onClick }: {
  icon: ReactNode; label: string; hint: string; tone?: "default" | "danger" | "success";
  disabled?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`review-action-row ${tone}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${tone === "danger" ? "bg-[#fff1ef] text-[#cb493b]" : tone === "success" ? "bg-[#ecf9f3] text-[#16815d]" : "bg-[#f1f5fb] text-[#6582a7]"}`} aria-hidden="true">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[13px] font-medium ${tone === "danger" ? "text-[#b94235]" : "text-[#344054]"}`}>{label}</span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-[#98A2B3]">{hint}</span>
      </span>
      <svg className="shrink-0 text-[#b5c0cf]" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <section className="review-action-group"><h3 className="mb-1 px-3.5 text-[10px] font-semibold uppercase tracking-[.09em] text-slate-400">{title}</h3>{children}</section>;
}

const icon = (d: string) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export default function ReviewActions({ review, busy, onMenuAction, onReply, onLocal, canContactSupport = false }: {
  review: DashboardReview;
  busy: boolean;
  onMenuAction: (menu: MenuAction) => void;
  onReply: () => void;
  onLocal: (id: string) => void;
  canContactSupport?: boolean;
}) {
  const call = (menu: MenuAction) => () => onMenuAction(menu);
  return (
    <div className="w-full bg-white py-1 text-left">
      <Group title="Publication">
        {review.status === "pending" && <Row icon={icon("m5 13 4 4L19 7")} label="Approve review" hint="Publish according to your project rules" tone="success" disabled={busy} onClick={call({ kind: "api", action: "approve" })} />}
        {review.status !== "published"
          ? <Row icon={icon("M5 12h14M13 6l6 6-6 6")} label="Publish now" hint="Make this review visible on your website" tone="success" disabled={busy} onClick={call({ kind: "api", action: "publish" })} />
          : <Row icon={icon("M9 15 3 9l6-6M3 9h12a6 6 0 0 1 6 6v3")} label="Unpublish review" hint="Remove from your website and return to moderation" disabled={busy} onClick={call({ kind: "api", action: "unpublish" })} />}
        <Row icon={icon("M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z")} label="Delay by 30 minutes" hint="Move to the publication queue" disabled={busy} onClick={call({ kind: "api", action: "delay", minutes: 30 })} />
        <Row icon={icon("M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z")} label="Delay by 24 hours" hint="Move to the queue for publication in 24 hours" disabled={busy} onClick={call({ kind: "api", action: "delay", minutes: 1440 })} />
      </Group>
      <Group title="Moderation">
        {(review.status === "rejected" || review.status === "spam") && <Row icon={icon("M3 11a9 9 0 1 1 3 7M3 4v7h7")} label="Return to moderation" hint="Restore this review for another check" disabled={busy} onClick={call({ kind: "api", action: "unpublish" })} />}
        <Row icon={icon("M4 12s3-7 8-7 8 7 8 7-3 7-8 7-8-7-8-7ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z")} label={review.hiddenText ? "Show review text" : "Hide review text"} hint={review.hiddenText ? "Make the comment visible again" : "Keep the rating visible; hide the comment on your website"} disabled={busy} onClick={call({ kind: "api", action: review.hiddenText ? "show" : "hide" })} />
        <Row icon={icon("M12 17v5M9 3h6l1 7 4 3H4l4-3 1-7Z")} label={review.pinned ? "Unpin review" : "Pin to top"} hint={review.pinned ? "Return to the standard feed order" : "Keep this review at the top of the feed"} disabled={busy} onClick={call({ kind: "api", action: review.pinned ? "unpin" : "pin" })} />
        <Row icon={icon("m6 6 12 12M18 6 6 18")} label="Reject review" hint="Exclude this review from publication" tone="danger" disabled={busy || review.status === "rejected"} onClick={call({ kind: "api", action: "reject" })} />
        <Row icon={icon("M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM6 6l12 12")} label="Mark as spam" hint="Flag as unwanted or suspicious feedback" tone="danger" disabled={busy || review.status === "spam"} onClick={call({ kind: "api", action: "spam" })} />
      </Group>
      <Group title="Customer communication">
        <Row icon={icon("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z")} label={review.companyReply ? "Edit company reply" : "Reply as company"} hint="Write a public reply below this review" disabled={busy} onClick={onReply} />
        <Row icon={icon("M4 4h16v12H7l-3 3V4ZM8 9h8M8 12h5")} label="Use a reply template" hint="Review a suggested response before publishing" disabled={busy} onClick={() => onLocal("template")} />
        <Row icon={icon("M3 5h18v14H3V5Zm0 2 9 6 9-6")} label="Email the author" hint={review.authorEmail ? "Open a private email draft" : "No email address provided by this author"} disabled={busy || !review.authorEmail} onClick={() => onLocal("mail")} />
        <Row icon={icon("M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5Z")} label="Ask for more details" hint={review.authorEmail ? "Prepare an email requesting clarification" : "An author email address is required"} disabled={busy || !review.authorEmail} onClick={() => onLocal("clarify")} />
        <Row icon={icon("M4 13v-1a8 8 0 0 1 16 0v5a4 4 0 0 1-4 4h-3M4 12H2v6h4v-6H4Zm16 0h2v6h-4v-6h2Z")} label="Contact support about this review" hint={canContactSupport ? "Prepare an email with the review details" : "Add a support email in Business reputation settings"} disabled={busy || !canContactSupport} onClick={() => onLocal("support")} />
      </Group>
      <Group title="Rating & classification">
        <Row icon={icon("m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3Z")} label="Change rating" hint="Choose a score; sentiment is recalculated automatically" disabled={busy} onClick={() => onLocal("rating")} />
      </Group>
      <Group title="Tools">
        <Row icon={icon("M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7L12 5M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19")} label="Copy review link" hint="Share a link to this review in your dashboard" disabled={busy} onClick={() => onLocal("link")} />
        <Row icon={icon("M8 3h8v4H8V3ZM5 7h14v14H5V7ZM9 12h6M9 16h6")} label="Copy review ID" hint={review.id} disabled={busy} onClick={() => onLocal("id")} />
        <Row icon={icon("M12 3v12M7 10l5 5 5-5M5 18v3h14v-3")} label="Download review" hint="Export the review and company reply as JSON" disabled={busy} onClick={() => onLocal("export")} />
      </Group>
    </div>
  );
}
