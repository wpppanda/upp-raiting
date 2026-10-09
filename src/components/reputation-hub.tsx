"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { DashboardProject, NotifyChannelKey, NotifyChannels, Reminder, ReminderChannelKey } from "@/lib/dashboard-data";
import GoogleG from "@/components/google-g";
import SidePanel from "@/components/side-panel";
import type { CustomFormField } from "@/db/schema";
import { MAX_CUSTOM_FIELDS } from "@/db/schema";
import { MAX_PHOTOS_LIMIT, MAX_PHOTO_SIZE_LIMIT_KB } from "@/lib/photo-upload";
import { MAX_ALLOWED_DOMAINS } from "@/lib/widget-domains";

type Sentiment = "positive" | "neutral" | "negative";
type SectionKey = "reviews" | "form" | "reminders" | "queue" | "install" | "badge" | "protection";
type ReminderUnit = "minutes" | "hours" | "days" | "weeks";

const MENU: Array<{ id: SectionKey; label: string }> = [
  { id: "protection", label: "Protection & Settings" },
  { id: "reviews", label: "Reviews" },
  { id: "form", label: "Review form" },
  { id: "reminders", label: "Reminders" },
  { id: "queue", label: "Queue" },
  { id: "install", label: "Installation" },
  { id: "badge", label: "Rating badge" },
];
const PAGE_COPY: Record<SectionKey, { title: string; description: string }> = {
  reviews: { title: "Reviews", description: "Choose how customer reviews are classified, published, and answered." },
  form: { title: "Review form", description: "Set up the form customers fill in: photos, required fields, and privacy options." },
  reminders: { title: "Reminders", description: "Set up automatic review invitations after a customer visit or order." },
  queue: { title: "Publication queue", description: "Control publication limits and priority rules for queued reviews." },
  install: { title: "Installation", description: "How to add the widget to your website: domains, code, and verification." },
  badge: { title: "Rating badge", description: "Pick one of the five badge kinds and tune how it looks on your site." },
  protection: { title: "Protection & Settings", description: "Control the widget domains, public widget fields, form privacy, Google reviews, and spam filters." },
};
const COLORS = {
  positive: { label: "Positive", dot: "#2bb67c", bg: "#f0faf5", border: "#c9e9d7", text: "#33976b" },
  neutral: { label: "Neutral", dot: "#e7a63b", bg: "#fffaf0", border: "#efe0bc", text: "#b08737" },
  negative: { label: "Negative", dot: "#dd7065", bg: "#fdf4f2", border: "#efd1ca", text: "#bd6257" },
} as const;
const FIELDS = {
  positive: { mode: "positivePublishMode", delay: "positiveDelayMinutes", notify: "positiveNotify", channels: "positiveNotifyChannels", autoOn: "positiveAutoReplyEnabled", autoTpl: "positiveAutoReplyTemplate" },
  neutral: { mode: "neutralPublishMode", delay: "neutralDelayMinutes", notify: "neutralNotify", channels: "neutralNotifyChannels", autoOn: "neutralAutoReplyEnabled", autoTpl: "neutralAutoReplyTemplate" },
  negative: { mode: "negativePublishMode", delay: "negativeDelayMinutes", notify: "negativeNotify", channels: "negativeNotifyChannels", autoOn: "negativeAutoReplyEnabled", autoTpl: "negativeAutoReplyTemplate" },
} as const;
const MODE_HINTS: Record<string, string> = {
  instant: "Publish immediately after submission.",
  delayed: "Publish automatically when the delay ends.",
  manual: "A moderator approves the review before it is published.",
};
const CHANNELS: Array<{ key: NotifyChannelKey; label: string; type: string; placeholder: string; noun: string }> = [
  { key: "email", label: "Email", type: "email", placeholder: "admin@company.com", noun: "address" },
  { key: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "+1 555 000 0000", noun: "number" },
  { key: "sms", label: "SMS", type: "tel", placeholder: "+1 555 000 0000", noun: "number" },
];
const UNITS: Array<{ id: ReminderUnit; label: string; multiplier: number }> = [
  { id: "minutes", label: "Minutes", multiplier: 1 },
  { id: "hours", label: "Hours", multiplier: 60 },
  { id: "days", label: "Calendar days", multiplier: 1440 },
  { id: "weeks", label: "Weeks", multiplier: 10080 },
];
const REMINDER_MESSAGE = "Hello {name}! We would love to hear about your experience. Leave a review here: {link}";

function inferUnit(minutes: number): ReminderUnit {
  if (minutes > 0 && minutes % 10080 === 0) return "weeks";
  if (minutes > 0 && minutes % 1440 === 0) return "days";
  if (minutes > 0 && minutes % 60 === 0) return "hours";
  return "minutes";
}
function multiplier(unit: ReminderUnit) { return UNITS.find(item => item.id === unit)!.multiplier; }
function rangeText(low: number, high: number) { return low > high ? "None" : low === high ? `${low} ★` : `${low}–${high} ★`; }
function classify(rating: number, positive: number, neutral: number): Sentiment { return rating >= positive ? "positive" : rating >= neutral ? "neutral" : "negative"; }
function getRange(kind: Sentiment, positive: number, neutral: number): [number, number] { return kind === "positive" ? [positive, 5] : kind === "neutral" ? [neutral, positive - 1] : [1, neutral - 1]; }

function Help({ text, label = "setting" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <span className="rep-help-wrap" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button
      type="button"
      className="rep-help"
      aria-label={`Help: ${label}`}
      aria-expanded={open}
      aria-describedby={open ? id : undefined}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen(true)}
      onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}
    >?</button>
    {open && <span id={id} role="tooltip" className="rep-tooltip">{text}</span>}
  </span>;
}
function EditIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" /></svg>; }
function Section({ title, description, icon, action, children, id }: { title: string; description?: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; id?: string }) {
  return <section className="rep-section" id={id}>
    <div className="rep-section-header"><div><div className="rep-section-title">{icon}<h3>{title}</h3>{description && <Help label={title} text={description} />}</div>{description && <p className="rep-section-description">{description}</p>}</div>{action}</div>
    {children}
  </section>;
}
const SETTING_HELP: Record<string, string> = {
  "Publication mode": "Choose instant publication, publication after a delay, or manual moderator approval.",
  "Google review link": "The invitation is shown only when its Google Business Profile review link is filled in.",
  "Allow anonymous reviews": "The submitted name, city and email remain visible to moderators. Website visitors see Anonymous instead of the author's name.",
  "Require written review text": "Turn off to allow a customer to submit a star rating without a comment.",
  "Show avatar": "Display a generated avatar beside each publicly visible review.",
  "Show name": "Display the review author's name unless the author requested anonymity.",
  "Show city": "Display the city submitted by the reviewer when one is available.",
  "Show publication date": "Display the date on which the review was published.",
  "Show review text": "Hide or show the written comment for all published reviews. The star rating remains visible.",
  "Daily reviews per IP address": "Set the number of reviews a single IP address can submit in a 24-hour period.",
  "Blocked words": "Separate words with commas. Matching comments are routed to moderation.",
  "Minimum interval, minutes": "Minimum time between automatic review publications.",
  "Maximum per hour": "Limit the number of reviews published automatically within one hour.",
  "Maximum per day": "Limit the number of reviews published automatically within one day.",
  "Daily negative review limit, %": "Set the target share of negative reviews in the daily publication flow.",
  "After a neutral review → publish the next positive review now": "When a neutral review is published, release the next positive review from the queue immediately.",
  "Recent negative review → publish the next positive review now": "If one of the latest published reviews is negative, accelerate the next positive review.",
};
function SettingRow({ label, htmlFor, help, description, hint, className = "", children }: { label: string; htmlFor?: string; help?: string; description?: string; hint?: string; className?: string; children: ReactNode }) {
  const tooltip = help || description || hint || SETTING_HELP[label] || `Configure ${label.toLowerCase()} for your review project.`;
  return <div className={`rep-row ${className}`}>
    <div className="rep-label"><label htmlFor={htmlFor}>{label}</label><Help text={tooltip} label={label} />{description && <span className="rep-label-description">{description}</span>}</div>
    <div className="rep-control">{children}{hint && <p className="rep-hint">{hint}</p>}</div>
  </div>;
}
function Switch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" className="rep-switch" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}><span className="rep-switch-track" aria-hidden="true" /><span className="rep-switch-thumb" aria-hidden="true" /></button>;
}
function SwitchRow({ label, checked, onChange, description, help }: { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string; help?: string }) {
  return <SettingRow label={label} description={description} help={help} className="rep-switch-row"><Switch label={label} checked={checked} onChange={onChange} /></SettingRow>;
}
const BADGE_KINDS = [
  { id: "number", name: "Number", description: "Only the score — the smallest footprint." },
  { id: "stars", name: "Stars", description: "Score plus a star row." },
  { id: "full", name: "Full", description: "Score, stars and the review count." },
  { id: "stars-only", name: "Stars only", description: "Only the star row, without numbers." },
  { id: "banner", name: "Banner", description: "A wide strip for footers and hero sections." },
] as const;
const BADGE_SIZES = [
  { id: "small", name: "Small", padding: "6px 10px", gap: 6, score: 15, caption: 10, star: 12, bigStar: 15 },
  { id: "medium", name: "Medium", padding: "10px 14px", gap: 9, score: 19, caption: 11, star: 14, bigStar: 19 },
  { id: "large", name: "Large", padding: "15px 22px", gap: 13, score: 27, caption: 13, star: 18, bigStar: 26 },
] as const;
const BADGE_THEMES = [
  { id: "light", name: "Light", border: "#dadce0", background: "#ffffff", score: "#202124", caption: "#5f6368", divider: "#dadce0" },
  { id: "dark", name: "Dark", border: "#5f6368", background: "#202124", score: "#ffffff", caption: "#bdc1c6", divider: "#5f6368" },
  { id: "brand", name: "Brand", border: "transparent", background: "#617a58", score: "#ffffff", caption: "#ffffff", divider: "rgba(255,255,255,.45)" },
] as const;
const BADGE_SHAPES = [
  { id: "rounded", name: "Rounded", radius: 10 },
  { id: "pill", name: "Pill", radius: 999 },
  { id: "square", name: "Square", radius: 3 },
] as const;
type BadgeSettings = { size: string; theme: string; shape: string; showCount: boolean; label: string; brandColor: string };
function BadgeMark({ format, score, count, settings }: { format: string; score: string; count: number; settings: BadgeSettings }) {
  const size = BADGE_SIZES.find(item => item.id === settings.size) ?? BADGE_SIZES[1];
  const theme = BADGE_THEMES.find(item => item.id === settings.theme) ?? BADGE_THEMES[0];
  const shape = BADGE_SHAPES.find(item => item.id === settings.shape) ?? BADGE_SHAPES[0];
  const word = settings.label.trim() || (format === "banner" ? "verified reviews" : "reviews");
  const shell: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: size.gap, padding: size.padding, border: `1px solid ${theme.border}`, borderRadius: shape.radius, background: theme.id === "brand" ? settings.brandColor : theme.background };
  const scoreStyle: React.CSSProperties = { color: theme.score, fontSize: size.score, fontWeight: 600, lineHeight: 1.15 };
  const stars = <span aria-hidden="true" style={{ color: "#FBBC04", fontSize: size.star, letterSpacing: 1 }}>★★★★★</span>;
  const bigStars = <span aria-hidden="true" style={{ color: "#FBBC04", fontSize: size.bigStar, letterSpacing: 2 }}>★★★★★</span>;
  const caption = <span style={{ color: theme.caption, fontSize: size.caption }}>{count} {word}</span>;
  if (format === "banner") return <div style={{ ...shell, display: "flex", width: "100%", maxWidth: 420 }} data-badge-preview={format}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.max(5, size.gap - 2) }}><strong style={scoreStyle}>{score}</strong>{stars}</span>
    {settings.showCount && <span aria-hidden="true" style={{ width: 1, alignSelf: "stretch", background: theme.divider }} />}
    {settings.showCount && caption}
  </div>;
  return <div style={shell} data-badge-preview={format}>
    {format !== "stars-only" && <strong style={scoreStyle}>{score}</strong>}
    {format !== "number" && (format === "stars-only" ? bigStars : stars)}
    {format === "full" && settings.showCount && caption}
  </div>;
}
function CategoryIcon({ kind }: { kind: Sentiment }) {
  return <svg className="rep-choice-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 9h.01M16 9h.01" strokeWidth="2.7" />{kind === "positive" ? <path d="M7.5 13.5c1.2 2.1 2.7 3 4.5 3s3.3-.9 4.5-3" /> : kind === "neutral" ? <path d="M8 15h8" /> : <path d="M7.5 16c1.2-1.8 2.7-2.7 4.5-2.7s3.3.9 4.5 2.7" />}</svg>;
}
function Categories({ selected, positive, neutral, onSelect }: { selected: Sentiment; positive: number; neutral: number; onSelect: (kind: Sentiment) => void }) {
  return <SettingRow label="Review category" help="Each category has independent publication, notification, and response rules.">
    <div className="rep-choice-grid" role="radiogroup" aria-label="Review category">
      {(["positive", "neutral", "negative"] as const).map((kind, index) => <button key={kind} type="button" className="rep-choice" role="radio" aria-label={COLORS[kind].label} aria-checked={kind === selected} tabIndex={kind === selected ? 0 : -1} onClick={() => onSelect(kind)} onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const next = (index + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : 2)) % 3;
        onSelect((["positive", "neutral", "negative"] as const)[next]);
        const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
        buttons?.[next]?.focus();
      }}>
        <span className="rep-choice-radio" aria-hidden="true">{kind === selected && <i />}</span>
        <CategoryIcon kind={kind} /><span className="rep-choice-label">{COLORS[kind].label}</span><span className="rep-choice-range">{rangeText(...getRange(kind, positive, neutral))}</span>
      </button>)}
    </div>
  </SettingRow>;
}
function RatingRange({ kind, positive, neutral, onChange }: { kind: Sentiment; positive: number; neutral: number; onChange: (positive: number, neutral: number) => void }) {
  const hasNone = kind === "neutral" ? neutral >= positive : kind === "negative" ? neutral <= 1 : false;
  return <SettingRow label={`${COLORS[kind].label} ratings`} help={kind === "negative" ? "Choose the highest rating that should count as negative." : `Choose the lowest rating that should count as ${kind}.`}>
    <div className="rep-star-picker" role="group" aria-label={`${COLORS[kind].label} rating range`}>
      {[1, 2, 3, 4, 5].map(rating => {
        const current = classify(rating, positive, neutral);
        const own = current === kind;
        return <button type="button" className="rep-star-option" key={rating} disabled={kind !== "positive" && rating >= positive} aria-pressed={own} aria-label={`${rating} ${rating === 1 ? "star" : "stars"}, currently ${current}`} onClick={() => {
          if (kind === "positive") onChange(rating, Math.min(neutral, rating));
          else if (kind === "neutral") onChange(positive, rating);
          else onChange(positive, rating + 1);
        }} style={own ? { background: COLORS[kind].bg, borderColor: COLORS[kind].border, color: COLORS[kind].text } : undefined}><span>{rating}</span><b aria-hidden="true">★</b></button>;
      })}
    </div>
    <div className="rep-range-summary">{(["positive", "neutral", "negative"] as const).map(category => <span key={category}><i style={{ background: COLORS[category].dot }} /><strong>{COLORS[category].label}:</strong>{rangeText(...getRange(category, positive, neutral))}</span>)}</div>
    {hasNone && <p className="rep-hint rep-warning">No ratings are {kind}. Select a star above to assign a range.</p>}
  </SettingRow>;
}
function DomainList({ primary, domains, onChange }: { primary: string; domains: string[]; onChange: (domains: string[]) => void }) {
  const update = (index: number, value: string) => onChange(domains.map((item, position) => (position === index ? value : item)));
  return <SettingRow
    label="Allowed domains for the widget"
    help="The widget and its API answer requests only from the primary domain and from the domains listed here. Add *.example.com to allow every sub-domain."
    hint="Requests from any other domain are rejected with an error, so the widget cannot be copied to a third-party site."
  >
    <div className="rep-domain-list">
      <div className="rep-domain-chip is-primary"><span>{primary || "—"}</span><em>primary</em></div>
      {domains.map((domain, index) => <div className="rep-domain-chip" key={`rep-domain-${index}`}>
        <input
          type="text"
          inputMode="url"
          spellCheck={false}
          aria-label={`Allowed widget domain ${index + 1}`}
          placeholder="example.com"
          value={domain}
          onChange={event => update(index, event.target.value)}
        />
        <button type="button" className="rep-domain-remove" aria-label={`Remove domain ${index + 1}`} onClick={() => onChange(domains.filter((_, position) => position !== index))}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>)}
    </div>
    <button type="button" className="rep-link" style={{ marginTop: 9 }} disabled={domains.length >= MAX_ALLOWED_DOMAINS} onClick={() => onChange([...domains, ""])}>+ Add domain</button>
    {domains.length >= MAX_ALLOWED_DOMAINS && <p className="rep-hint">You can allow up to {MAX_ALLOWED_DOMAINS} extra domains.</p>}
  </SettingRow>;
}
function NotificationChannels({ channels, onChange }: { channels: NotifyChannels; onChange: (channels: NotifyChannels) => void }) {
  return <SettingRow label="Notification channel" help="Enter a separate destination for each channel you enable.">
    {CHANNELS.map(channel => {
      const item = channels[channel.key];
      return <div className="rep-channel-row" key={channel.key}>
        <label htmlFor={`rep-notify-${channel.key}`}>{channel.label}</label>
        <input id={`rep-notify-${channel.key}`} aria-label={`${channel.label} ${channel.noun}`} className="rep-input" type={channel.type} value={item.value} disabled={!item.enabled} placeholder={channel.placeholder} onChange={event => onChange({ ...channels, [channel.key]: { ...item, value: event.target.value } })} />
        <Switch label={`Enable ${channel.label} notifications`} checked={item.enabled} onChange={enabled => onChange({ ...channels, [channel.key]: { ...item, enabled } })} />
      </div>;
    })}
    {!CHANNELS.some(channel => channels[channel.key].enabled && channels[channel.key].value.trim()) && <p className="rep-hint">Enable a channel and enter the recipient address or number.</p>}
  </SettingRow>;
}

export default function ReputationHub({ project, onSaved, onToast, onPreview, metrics }: { project: DashboardProject; onSaved: (project: DashboardProject) => void; onToast: (message: string) => void; onPreview: (project?: DashboardProject) => void; metrics?: { averageRating: number; published: number } }) {
  const [section, setSection] = useState<SectionKey>("protection");
  const [category, setCategory] = useState<Sentiment>("positive");
  const [form, setForm] = useState(project);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<Record<string, ReminderUnit>>(() => Object.fromEntries(project.reminders.map(item => [item.id, inferUnit(item.delayMinutes)])));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [embedCopied, setEmbedCopied] = useState(false);

  useEffect(() => { setForm(project); }, [project]);
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(project), [form, project]);
  const set = <K extends keyof DashboardProject>(key: K, value: DashboardProject[K]) => setForm(current => ({ ...current, [key]: value }));
  const updateReminder = (id: string, patch: Partial<Reminder>) => setForm(current => ({ ...current, reminders: current.reminders.map(item => item.id === id ? { ...item, ...patch } : item) }));
  const editingReminder = form.reminders.find(item => item.id === editingId) ?? null;
  const copy = PAGE_COPY[section];

  async function save() {
    setSaving(true);
    try {
      // These values are managed by the application's general settings, not this workspace.
      const { id, name, domain, brandColor, timezone, createdAt, ...reputationSettings } = form;
      void id; void name; void domain; void brandColor; void timezone; void createdAt;
      const allowedDomains = (reputationSettings.allowedDomains ?? [])
        .map((domain: string) => domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+.*$/, ""))
        .filter((domain: string, index: number, all: string[]) => domain.length > 0 && all.indexOf(domain) === index);
      const response = await fetch("/api/project", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...reputationSettings, allowedDomains, ratingScale: "stars" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save changes.");
      setForm(result.project);
      onSaved(result.project);
      onToast("Reputation settings saved.");
    } catch (error) { onToast(error instanceof Error ? error.message : "Unable to save changes. Please try again."); }
    finally { setSaving(false); }
  }

  function addReminder() {
    const id = `rem-${crypto.randomUUID()}`;
    const reminder: Reminder = { id: id.slice(0, 40), delayMinutes: 3 * 1440, channel: "email", target: "", message: REMINDER_MESSAGE, enabled: true };
    setForm(current => ({ ...current, reminders: [...current.reminders, reminder] }));
    setUnits(current => ({ ...current, [reminder.id]: "days" }));
  }

  function reviewSettings() {
    const fields = FIELDS[category];
    const mode = form[fields.mode] === "instant" || form[fields.mode] === "manual" ? form[fields.mode] : "delayed";
    const contactKey = category === "neutral" ? "neutralSupportContact" : "negativeSupportContact";
    const chatKey = category === "neutral" ? "neutralSupportChat" : "negativeSupportChat";
    return <>
      <section className="rep-section" aria-label="Review classification">
        <Categories selected={category} positive={form.positiveThreshold} neutral={form.neutralThreshold} onSelect={setCategory} />
        <RatingRange kind={category} positive={form.positiveThreshold} neutral={form.neutralThreshold} onChange={(positiveThreshold, neutralThreshold) => setForm(current => ({ ...current, positiveThreshold, neutralThreshold }))} />
      </section>
      <Section title="Publication" description={`Set when ${category} reviews appear on your website.`}>
        <SettingRow label="Publication mode" htmlFor="rep-publication-mode" hint={MODE_HINTS[mode]}>
          <select id="rep-publication-mode" className="rep-select medium" value={mode} onChange={event => set(fields.mode, event.target.value)}><option value="instant">Instantly</option><option value="delayed">With a delay</option><option value="manual">Manual approval</option></select>
        </SettingRow>
        {mode === "delayed" && <SettingRow label="Delay, minutes" htmlFor="rep-publication-delay" help="The review will wait for this many minutes before publication." hint="0 = no delay. Maximum: 10,080 minutes."><input id="rep-publication-delay" type="number" min={0} max={10080} step={1} className="rep-input short" value={form[fields.delay]} onChange={event => set(fields.delay, Number(event.target.value))} /></SettingRow>}
      </Section>
      <Section title="Notifications" description="Choose how to receive new review alerts.">
        <SwitchRow label="Notify the administrator" checked={form[fields.notify]} onChange={value => set(fields.notify, value)} help="Notify for new reviews in this category." />
        {form[fields.notify] && <NotificationChannels channels={form[fields.channels]} onChange={value => set(fields.channels, value)} />}
      </Section>
      <Section title="Company response" description={`Configure responses to ${category} customer feedback.`}>
        <SwitchRow label="Automatic company reply" checked={form[fields.autoOn]} onChange={value => set(fields.autoOn, value)} help="Use the response template for this category." />
        {form[fields.autoOn] && <SettingRow label="Automatic reply template" htmlFor="rep-auto-reply" hint="Personalization variable: {name}"><textarea id="rep-auto-reply" className="rep-textarea" rows={3} maxLength={2000} value={form[fields.autoTpl]} onChange={event => set(fields.autoTpl, event.target.value)} /></SettingRow>}
        {category === "negative" && <>
          <SwitchRow label="Require a reply" checked={form.replyRequiredNegative} onChange={value => set("replyRequiredNegative", value)} help="Set a response requirement for negative feedback." />
          <SettingRow label="Response target, hours" htmlFor="rep-response-target"><input id="rep-response-target" type="number" min={1} max={720} className="rep-input short" value={form.replySlaHours} onChange={event => set("replySlaHours", Number(event.target.value))} /></SettingRow>
          <SettingRow label="Reply signature" htmlFor="rep-reply-signature"><input id="rep-reply-signature" className="rep-input" value={form.replySignature} maxLength={180} onChange={event => set("replySignature", event.target.value)} /></SettingRow>
        </>}
      </Section>
      {category === "positive" ? <Section title="Google review invitation" icon={<GoogleG size={16} />} description="Invite happy customers to share their experience on Google.">
        <SwitchRow label="Show the Leave a review on Google button" checked={form.invitePositiveToExternal} onChange={value => set("invitePositiveToExternal", value)} />
        {!form.googleReviewUrl.trim() && <p className="rep-warning rep-settings-note">Google review link is missing. Add it in Protection & Settings before this invitation is shown to customers.</p>}
      </Section> : <Section title="Support after submission" description="Let customers contact your support team after sharing their review.">
        <SwitchRow label="Offer to email customer support" checked={form[contactKey]} onChange={value => set(contactKey, value)} />
        <SwitchRow label="Offer to chat with customer support" checked={form[chatKey]} onChange={value => set(chatKey, value)} help="Link to your existing support chat." />
        <SettingRow label="Support contacts" help="One shared support email and chat URL are used for both neutral and negative reviews.">
          <button type="button" className="rep-link" onClick={() => {
            setSection("protection");
            window.setTimeout(() => document.getElementById("rep-support-contacts")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
          }}>
            Configure support email and chat URL in Protection &amp; Settings →
          </button>
          {((form[contactKey] && !form.supportEmail.trim()) || (form[chatKey] && !form.supportChatUrl.trim())) &&
            <p className="rep-hint rep-warning">Add the contact details in Protection &amp; Settings to show the enabled support button to customers.</p>}
        </SettingRow>
        {(form[contactKey] && form[chatKey]) &&
          <SettingRow label="Support message" htmlFor="rep-support-message" help="Shown after a neutral or negative review when both email and chat support options are enabled.">
            <textarea id="rep-support-message" className="rep-textarea" rows={3} maxLength={2000} value={form.supportOfferText} onChange={event => set("supportOfferText", event.target.value)} />
          </SettingRow>}
      </Section>}
    </>;
  }

  function formSettings() {
    return <>
      <Section title="Photos in reviews" description="Let customers attach photos of their experience.">
        <SwitchRow label="Allow photos in reviews" checked={form.allowPhotos} onChange={value => set("allowPhotos", value)} help="When off, the photo field disappears from the widget form and the API rejects attachments." />
        {form.allowPhotos
          ? <>
            <SettingRow label="Photos per review" htmlFor="rep-max-photos" help="Photos are stored with the review, so keep the number small." hint={`1–${MAX_PHOTOS_LIMIT} photos.`}>
              <input id="rep-max-photos" type="number" min={1} max={MAX_PHOTOS_LIMIT} className="rep-input short" value={form.maxPhotos} onChange={event => set("maxPhotos", Number(event.target.value))} />
            </SettingRow>
            <SettingRow label="Maximum photo size, KB" htmlFor="rep-photo-size" help="The widget compresses every photo to fit this limit before uploading." hint={`64–${MAX_PHOTO_SIZE_LIMIT_KB} KB.`}>
              <input id="rep-photo-size" type="number" min={64} max={MAX_PHOTO_SIZE_LIMIT_KB} step={64} className="rep-input short" value={form.maxPhotoSizeKb} onChange={event => set("maxPhotoSizeKb", Number(event.target.value))} />
            </SettingRow>
          </>
          : <p className="rep-settings-note">Photo attachments are disabled: customers can submit a rating and a comment only.</p>}
      </Section>
      <Section title="Custom fields" description={`Add up to ${MAX_CUSTOM_FIELDS} extra questions to the review form. Answers are stored on each review.`}>
        {(() => {
          const fields = form.formFields ?? [];
          const update = (id: string, patch: Partial<CustomFormField>) => set("formFields", fields.map(field => field.id === id ? { ...field, ...patch } : field));
          const add = () => set("formFields", [...fields, { id: `cf-${Math.random().toString(36).slice(2, 8)}`, label: `Question ${fields.length + 1}`, type: "text", options: [], required: false, showPublic: false }]);
          const remove = (id: string) => set("formFields", fields.filter(field => field.id !== id));
          return <>
            {fields.length === 0 && <p className="rep-settings-note">No custom fields yet. Add a question to collect extra details from customers.</p>}
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border border-[#e4e7ec] bg-white p-3">
                  <div className="flex items-center justify-between gap-2 border-b border-[#f2f4f7] pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Field {index + 1}</span>
                    <button type="button" className="rep-table-delete" title="Remove field" aria-label={`Remove field ${index + 1}`} onClick={() => remove(field.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></svg>
                    </button>
                  </div>
                  <div className="mt-2 grid items-end gap-2 sm:grid-cols-[1fr_150px]">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-slate-600">Label</span>
                      <input className="rep-input" maxLength={80} placeholder="For example: Table number" value={field.label} onChange={event => update(field.id, { label: event.target.value })} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium text-slate-600">Type</span>
                      <select className="rep-select medium" value={field.type} onChange={event => update(field.id, { type: event.target.value as CustomFormField["type"], options: event.target.value === "select" && field.options.length < 2 ? ["Option 1", "Option 2"] : field.options })}>
                        <option value="text">Text</option>
                        <option value="select">Select</option>
                      </select>
                    </label>
                  </div>
                  {field.type === "select" && (
                    <label className="mt-2 block">
                      <span className="mb-1 block text-[11px] font-medium text-slate-600">Options <span className="font-normal text-slate-400">· comma separated, 2–20</span></span>
                      <input className="rep-input" value={field.options.join(", ")} onChange={event => update(field.id, { options: event.target.value.split(",").map(option => option.trim()).filter(Boolean).slice(0, 20) })} />
                    </label>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <span className="flex items-center gap-2 text-[11px] font-medium text-slate-600">Required <Switch label={`Field ${index + 1} required`} checked={field.required} onChange={value => update(field.id, { required: value })} /></span>
                    <span className="flex items-center gap-2 text-[11px] font-medium text-slate-600">Show in the public feed <Switch label={`Field ${index + 1} public`} checked={field.showPublic} onChange={value => update(field.id, { showPublic: value })} /></span>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="rep-button mt-3" disabled={fields.length >= MAX_CUSTOM_FIELDS} onClick={add}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16" /></svg>Add field
            </button>
            {fields.length >= MAX_CUSTOM_FIELDS && <p className="rep-hint">You have reached the maximum of {MAX_CUSTOM_FIELDS} custom fields.</p>}
          </>;
        })()}
      </Section>
      <Section title="Form fields" description="Control what customers can submit through your widget.">
        <SwitchRow label="Allow anonymous reviews" checked={form.allowAnonymousReviews} onChange={value => set("allowAnonymousReviews", value)} help="The company keeps the submitted details in the admin panel, while the public review is shown as Anonymous." />
        <SwitchRow label="Show the email field" checked={form.formShowEmail} onChange={value => set("formShowEmail", value)} help="Hide it to collect only a name and a rating; the email stays optional when shown." />
        <SwitchRow label="Show the city field" checked={form.formShowCity} onChange={value => set("formShowCity", value)} help="Turn off to stop asking customers for their city." />
        <SwitchRow label="Show the comment field" checked={form.formShowComment} onChange={value => set("formShowComment", value)} help="Turn off to accept a rating without a text box. “Require written review text” then has no effect." />
        <SwitchRow label="Require written review text" checked={form.reviewTextRequired} onChange={value => set("reviewTextRequired", value)} help="When off, customers can submit only a star rating. Any non-empty comment still follows the minimum length below." />
        <SettingRow label="Minimum review length" htmlFor="rep-min-length" hint={form.reviewTextRequired ? "Required comments must meet this length." : "Optional comments must meet this length when provided."}><input id="rep-min-length" type="number" min={0} max={2000} className="rep-input short" value={form.minReviewLength} onChange={event => set("minReviewLength", Number(event.target.value))} /></SettingRow>
        <SettingRow label="Preview and install" help="Check how the form looks on your website and copy the embed code.">
          <button type="button" className="rep-link" onClick={() => onPreview(form)}>Open preview &amp; insert →</button>
        </SettingRow>
      </Section>
    </>;
  }

  function reminderSettings() {
    return <>
      <Section title="Reminder schedule" description="Choose when reminders are sent automatically." action={<button type="button" className="rep-button" onClick={addReminder}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16" /></svg>Add reminder</button>}>
        <div className="rep-reminder-table-wrap">
          <table className="rep-reminder-table" aria-label="Reminder schedule">
            <thead><tr><th scope="col">Time</th><th scope="col">Unit</th><th scope="col">Channel</th><th scope="col">Recipient</th><th scope="col">Message</th><th scope="col" style={{ textAlign: "center" }}>Active</th><th scope="col"><span className="sr-only">Delete</span></th></tr></thead>
            <tbody>{form.reminders.length === 0 ? <tr><td colSpan={7}><p className="rep-empty">No reminders yet. Add your first review invitation.</p></td></tr> : form.reminders.map((reminder, index) => {
              const unit = units[reminder.id] ?? inferUnit(reminder.delayMinutes);
              const amount = Math.round(reminder.delayMinutes / multiplier(unit));
              return <tr key={reminder.id} data-reminder-id={reminder.id} className={reminder.enabled === false ? "is-disabled" : ""}>
                <td><input type="number" min={0} max={Math.floor(525600 / multiplier(unit))} aria-label={`Reminder ${index + 1} delay time`} className="rep-table-input" value={amount} onChange={event => updateReminder(reminder.id, { delayMinutes: Math.max(0, Math.round(Number(event.target.value) || 0)) * multiplier(unit) })} /></td>
                <td><select className="rep-table-select" aria-label={`Reminder ${index + 1} delay unit`} value={unit} onChange={event => { const nextUnit = event.target.value as ReminderUnit; setUnits(current => ({ ...current, [reminder.id]: nextUnit })); updateReminder(reminder.id, { delayMinutes: amount * multiplier(nextUnit) }); }}>{UNITS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></td>
                <td><select className="rep-table-select" aria-label={`Reminder ${index + 1} channel`} value={reminder.channel} onChange={event => updateReminder(reminder.id, { channel: event.target.value as ReminderChannelKey })}>{CHANNELS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></td>
                <td><input className="rep-table-input recipient" aria-label={`Reminder ${index + 1} recipient`} placeholder={reminder.channel === "email" ? "customer@email.com" : "+1 555 000 0000"} value={reminder.target} onChange={event => updateReminder(reminder.id, { target: event.target.value })} /></td>
                <td><button type="button" className="rep-link" aria-label={`Edit reminder ${index + 1} message`} title={reminder.message} onClick={() => { setEditingId(reminder.id); setMessageDraft(reminder.message); }}><EditIcon />Edit</button></td>
                <td className="toggle-cell"><Switch label={`Reminder ${index + 1} active`} checked={reminder.enabled !== false} onChange={enabled => updateReminder(reminder.id, { enabled })} /></td>
                <td><button type="button" className="rep-table-delete" aria-label={`Delete reminder ${index + 1}`} onClick={() => setForm(current => ({ ...current, reminders: current.reminders.filter(item => item.id !== reminder.id) }))}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></svg></button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <p className="rep-settings-note">The time and unit set the delay after a customer visit or order. Changes apply when you save.</p>
      </Section>
    </>;
  }

  function queueSettings() {
    return <>
      <Section title="Publication limits" description="Set the pace for reviews in the publication queue.">
        <SwitchRow label="Enable the smart queue" checked={form.smartQueueEnabled} onChange={value => set("smartQueueEnabled", value)} help="Apply the priority rules below to queued reviews." />
        <SettingRow label="Minimum interval, minutes" htmlFor="rep-min-interval"><input id="rep-min-interval" type="number" min={0} max={1440} className="rep-input short" value={form.minIntervalMinutes} onChange={event => set("minIntervalMinutes", Number(event.target.value))} /></SettingRow>
        <SettingRow label="Maximum per hour" htmlFor="rep-max-hour"><input id="rep-max-hour" type="number" min={1} max={500} className="rep-input short" value={form.maxPerHour} onChange={event => set("maxPerHour", Number(event.target.value))} /></SettingRow>
        <SettingRow label="Maximum per day" htmlFor="rep-max-day"><input id="rep-max-day" type="number" min={1} max={2000} className="rep-input short" value={form.maxPerDay} onChange={event => set("maxPerDay", Number(event.target.value))} /></SettingRow>
        <SettingRow label="Daily negative review limit, %" htmlFor="rep-negative-share"><input id="rep-negative-share" type="number" min={0} max={100} className="rep-input short" value={form.maxNegativeShare} onChange={event => set("maxNegativeShare", Number(event.target.value))} /></SettingRow>
      </Section>
      <Section title="Positive review priority" description="Release the next positive review without waiting for its delay to end.">
        <SwitchRow label="After a neutral review → publish the next positive review now" checked={form.neutralBoostPositive} onChange={value => set("neutralBoostPositive", value)} />
        <SwitchRow label="Recent negative review → publish the next positive review now" checked={form.negativeLookbackEnabled} onChange={value => set("negativeLookbackEnabled", value)} />
        <SettingRow label="Number of recent reviews to check" help="If any of the last selected number of published reviews is negative, release the next queued positive review." hint="Check the last 1–5 published reviews."><div className="rep-rule-buttons">{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} aria-pressed={value === form.negativeLookbackCount} disabled={!form.negativeLookbackEnabled} onClick={() => set("negativeLookbackCount", value)}>{value}</button>)}</div></SettingRow>
        {!form.smartQueueEnabled && <p className="rep-hint rep-warning">Enable the smart queue to activate these priority rules.</p>}
      </Section>
    </>;
  }

  function badgeSettings() {
    const score = (metrics?.averageRating ?? 4.8).toFixed(1);
    const count = metrics?.published ?? 0;
    const settings: BadgeSettings = { size: form.badgeSize, theme: form.badgeTheme, shape: form.badgeShape, showCount: form.badgeShowCount, label: form.badgeLabel, brandColor: form.brandColor };
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<script src="${origin}/widget.js" data-project-id="${form.id}" defer></script>\n<div data-widget="badge"></div>`;
    const segmented = <K extends "badgeSize" | "badgeTheme" | "badgeShape">(key: K, options: ReadonlyArray<{ id: string; name: string; radius?: number; background?: string; border?: string }>) =>
      <div className="rep-rule-buttons" role="group" aria-label={key}>
        {options.map(option => <button key={option.id} type="button" aria-pressed={form[key] === option.id} onClick={() => set(key, option.id as DashboardProject[K])}>
          {(option.background || option.border) && <span aria-hidden="true" style={{ display: "inline-block", width: 12, height: 12, marginRight: 6, verticalAlign: -2, border: `1px solid ${option.border ?? "#d4d7e0"}`, borderRadius: option.radius ?? 3, background: option.background ?? "#fff" }} />}
          {option.name}
        </button>)}
      </div>;
    return <>
      <Section title="Badge kind" description="Five layouts for the same rating. Previews use your live score and review count.">
        <div className="rep-badge-grid" role="radiogroup" aria-label="Badge kind">
          {BADGE_KINDS.map(kind => <button key={kind.id} type="button" role="radio" aria-checked={form.badgeFormat === kind.id} className="rep-badge-card" onClick={() => set("badgeFormat", kind.id)}>
            <span className="rep-badge-card-head"><strong>{kind.name}</strong>{form.badgeFormat === kind.id && <span className="rep-badge-flag">Active</span>}</span>
            <span className="rep-badge-card-note">{kind.description}</span>
            <span className="rep-badge-card-sample"><BadgeMark format={kind.id} score={score} count={count} settings={settings} /></span>
          </button>)}
        </div>
      </Section>
      <Section title="Appearance" description="These settings apply to the active kind, to the badge inside the widget preview, and to the code you embed.">
        <SettingRow label="Size" help="Small fits sidebars, Medium is the default, Large suits footers and hero sections.">{segmented("badgeSize", BADGE_SIZES)}</SettingRow>
        <SettingRow label="Theme" help="Light is a white card, Dark is near black, Brand fills the badge with your brand colour.">{segmented("badgeTheme", BADGE_THEMES.map(theme => ({ ...theme, background: theme.id === "brand" ? form.brandColor : theme.background })))}</SettingRow>
        <SettingRow label="Corners" help="Choose how the badge is clipped.">{segmented("badgeShape", BADGE_SHAPES)}</SettingRow>
        <SwitchRow label="Show the review count" checked={form.badgeShowCount} onChange={value => set("badgeShowCount", value)} help="Applies to the Full and Banner kinds; the other kinds never show a count." />
        <SettingRow label="Caption after the number" hint="Leave empty for “reviews” (Full) or “verified reviews” (Banner).">
          <input className="rep-input" value={form.badgeLabel} maxLength={48} placeholder="reviews" aria-label="Caption after the number" onChange={event => set("badgeLabel", event.target.value)} />
        </SettingRow>
        <SettingRow label="Live preview" hint="How the badge will look on your website.">
          <div className="rep-badge-stage" data-theme={form.badgeTheme}><BadgeMark format={form.badgeFormat} score={score} count={count} settings={settings} /></div>
        </SettingRow>
      </Section>
      <Section title="Embed the badge" description="Add both lines before the closing body tag; the badge picks up the kind and appearance saved here.">
        <pre className="rep-embed-pre">{snippet}</pre>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className="rep-button" onClick={() => { void navigator.clipboard.writeText(snippet).then(() => { setEmbedCopied(true); window.setTimeout(() => setEmbedCopied(false), 2000); }); }}>{embedCopied ? "✓ Copied" : "Copy badge code"}</button>
          <button type="button" className="rep-button quiet" onClick={() => onPreview(form)}>Open preview &amp; insert</button>
        </div>
        <p className="rep-settings-note">Need a different kind in one place only? Add <code>{'data-format="banner"'}</code> to that div — it overrides the saved kind for that block alone.</p>
      </Section>
    </>;
  }

  function installSettings() {
    const domains = [form.domain, ...(form.allowedDomains ?? []).filter(Boolean)];
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<script src="${origin}/widget.js" data-project-id="${form.id}" defer></script>\n<div data-widget="reviews" data-limit="6" data-show-response="true"></div>`;
    return <>
      <Section title="Allow your domains" description="The widget only loads on the domains connected to the project.">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#c9e9d7] bg-[#f0faf5] px-2.5 py-1.5 text-xs text-[#33976b]">{form.domain}<span className="text-[10px] font-semibold uppercase">primary</span></span>
          {(form.allowedDomains ?? []).filter(Boolean).map((domain) => <span key={domain} className="inline-flex items-center rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-1.5 text-xs text-slate-700">{domain}</span>)}
        </div>
        <button type="button" className="rep-link mt-3" onClick={() => setSection("protection")}>Manage domains in Protection &amp; Settings →</button>
      </Section>
      <Section title="Paste the code" description="Add both lines before the closing body tag of your page template.">
        <pre className="rep-embed-pre">{snippet}</pre>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className="rep-button" onClick={() => { void navigator.clipboard.writeText(snippet).then(() => { setEmbedCopied(true); window.setTimeout(() => setEmbedCopied(false), 2000); }); }}>{embedCopied ? "✓ Copied" : "Copy code"}</button>
          <button type="button" className="rep-button quiet" onClick={() => onPreview(form)}>Open preview &amp; insert</button>
        </div>
        <p className="rep-settings-note">Allowed domains: {domains.join(", ")}. Add as many div blocks as you need — one per widget.</p>
      </Section>
      <Section title="Verify the result" description="A quick checklist after publishing the page.">
        <ol className="rep-install-list">
          <li>Publish the page and open it in a private window without cache.</li>
          <li>Submit a test review — it lands in Moderation or the queue by your rules.</li>
          <li>Check the thank-you screen for positive, neutral, and negative ratings.</li>
        </ol>
      </Section>
      <Section title="If the widget does not appear" description="The usual causes and fixes.">
        <ul className="rep-install-list">
          <li><strong>“This domain is not connected to the project.”</strong> — add the page domain above.</li>
          <li><strong>Script blocked</strong> — allow the domain in your Content-Security-Policy (script-src and connect-src).</li>
          <li><strong>Empty feed</strong> — only published reviews are shown; approve one in Moderation.</li>
        </ul>
      </Section>
    </>;
  }

  function protectionSettings() {
    return <>
      <Section title="Widget domains" description="The widget only loads on the primary domain and on the extra domains you allow here.">
        <DomainList primary={form.domain} domains={form.allowedDomains ?? []} onChange={value => set("allowedDomains", value)} />
      </Section>
      <Section title="Google reviews" icon={<GoogleG size={16} />} description="Configure the link used by the Google review invitation for positive customers.">
        <SettingRow label="Google review link" htmlFor="rep-google-url" hint="Copy it from Google Business Profile → Ask for reviews.">
          <input id="rep-google-url" className="rep-input" placeholder="https://g.page/r/…/review" value={form.googleReviewUrl} onChange={event => set("googleReviewUrl", event.target.value)} />
          {!form.googleReviewUrl.trim() && <p className="rep-hint rep-warning">Required: add the Google review link to display the Google invitation to customers.</p>}
        </SettingRow>
      </Section>
      <Section id="rep-support-contacts" title="Customer support contacts" description="Shared contact details for both neutral and negative review follow-ups.">
        <SettingRow label="Support email" htmlFor="rep-support-email" help="Enter the email address used by the Email customer support button." hint="The email button stays hidden until an address is provided.">
          <input id="rep-support-email" className="rep-input" type="email" placeholder="support@company.com" value={form.supportEmail} onChange={event => set("supportEmail", event.target.value)} />
        </SettingRow>
        <SettingRow label="Support chat URL" htmlFor="rep-support-url" help="Enter the URL for the existing customer support chat, for example WhatsApp or Intercom." hint="The chat button stays hidden until a valid link is provided.">
          <input id="rep-support-url" className="rep-input" type="url" placeholder="https://wa.me/15550000000" value={form.supportChatUrl} onChange={event => set("supportChatUrl", event.target.value)} />
        </SettingRow>
      </Section>
      <Section title="Review form settings" description="Photos, required fields, and privacy options live on the Review form page.">
        <SettingRow label="Review form" help="Photo attachments, anonymous reviews, and required review text are configured on a dedicated page.">
          <button type="button" className="rep-link" onClick={() => setSection("form")}>Open Review form settings →</button>
        </SettingRow>
      </Section>
      <Section title="Public review card" description="Choose what website visitors can see in each review.">
        <SwitchRow label="Show avatar" checked={form.publicShowAvatar} onChange={value => set("publicShowAvatar", value)} />
        <SwitchRow label="Show name" checked={form.publicShowName} onChange={value => set("publicShowName", value)} help="Anonymous reviews always show Anonymous instead of the submitted name." />
        <SwitchRow label="Show city" checked={form.publicShowCity} onChange={value => set("publicShowCity", value)} />
        <SwitchRow label="Show publication date" checked={form.publicShowDate} onChange={value => set("publicShowDate", value)} />
        <SwitchRow label="Show review text" checked={form.publicShowText} onChange={value => set("publicShowText", value)} help="When off, visitors see the rating only." />
      </Section>
      <Section title="Spam filters" description="Review matching feedback before it appears on your website.">
        <SettingRow label="Daily reviews per IP address" htmlFor="rep-ip-limit"><input id="rep-ip-limit" type="number" min={1} max={100} className="rep-input short" value={form.maxReviewsPerIp} onChange={event => set("maxReviewsPerIp", Number(event.target.value))} /></SettingRow>
        <SettingRow label="Blocked words" htmlFor="rep-blocked-words" hint="Comma-separated. Reviews containing these words are sent to moderation."><textarea id="rep-blocked-words" className="rep-textarea" rows={3} placeholder="blocked word, another phrase, …" value={form.stopWords} onChange={event => set("stopWords", event.target.value)} /></SettingRow>
      </Section>
    </>;
  }

  return <div className="reputation-ref">
    <div className="rep-top"><h1>Business reputation</h1><div className="rep-top-actions"><button type="button" className="rep-button small quiet" onClick={() => onPreview(form)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>Preview &amp; insert</button></div></div>
    <div className="rep-layout">
      <nav className="rep-navigation" aria-label="Business reputation sections">{MENU.map(item => <button type="button" key={item.id} aria-current={section === item.id ? "page" : undefined} onClick={() => setSection(item.id)}>{item.label}</button>)}</nav>
      <div className="rep-sheet">
        <header className="rep-sheet-header"><h2>{copy.title}</h2><p>{copy.description}</p></header>
        {section === "reviews" && reviewSettings()}
        {section === "form" && formSettings()}
        {section === "reminders" && reminderSettings()}
        {section === "queue" && queueSettings()}
        {section === "install" && installSettings()}
        {section === "badge" && badgeSettings()}
        {section === "protection" && protectionSettings()}
        <div className="rep-footer"><span aria-live="polite">{dirty ? "You have unsaved changes" : "All settings are up to date"}</span><div className="rep-footer-actions"><button type="button" className="rep-button quiet" onClick={() => onPreview(form)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>Preview &amp; insert</button>{dirty && <button type="button" className="rep-button quiet" disabled={saving} onClick={() => { setForm(project); setUnits(Object.fromEntries(project.reminders.map(item => [item.id, inferUnit(item.delayMinutes)]))); }}>Discard changes</button>}<button type="button" className="rep-button primary" disabled={saving || !dirty} onClick={() => void save()}>{saving ? "Saving…" : "Save changes"}</button></div></div>
      </div>
    </div>
    <SidePanel open={!!editingReminder} onClose={() => setEditingId(null)} title="Edit reminder message" subtitle="Write the message customers will receive." closeLabel="Close message editor" width={480} footer={<div className="rep-message-footer"><button type="button" className="rep-button quiet" onClick={() => setEditingId(null)}>Cancel</button><button type="button" className="rep-button primary" disabled={!messageDraft.trim()} onClick={() => { if (editingReminder) updateReminder(editingReminder.id, { message: messageDraft.trim() }); setEditingId(null); }}>Save message</button></div>}>
      {editingReminder && <div className="rep-message-editor"><p>Reminder {form.reminders.findIndex(item => item.id === editingReminder.id) + 1} · {editingReminder.channel === "whatsapp" ? "WhatsApp" : editingReminder.channel === "sms" ? "SMS" : "Email"}</p><label htmlFor="rep-reminder-message">Message text</label><textarea id="rep-reminder-message" className="rep-textarea" value={messageDraft} rows={6} maxLength={2000} onChange={event => setMessageDraft(event.target.value)} placeholder="Hello {name}, tell us how we did: {link}" /><p>Personalization variables: {"{name}"}, {"{link}"}</p><p>Save the reputation settings to apply this change.</p></div>}
    </SidePanel>
  </div>;
}
