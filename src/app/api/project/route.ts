import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, type NotifyChannelKey, type NotifyChannels, type Reminder, type ReminderChannelKey } from "@/db/schema";
import { ensureProject } from "@/lib/dashboard-data";
import { parseFormFields } from "@/lib/custom-fields";
import { MAX_PHOTOS_LIMIT, MAX_PHOTO_SIZE_LIMIT_KB } from "@/lib/photo-upload";
import { BADGE_FORMATS } from "@/db/schema";
import { parseAllowedDomains } from "@/lib/widget-domains";

export const dynamic = "force-dynamic";

const PUBLISH_MODES = ["instant", "delayed", "manual"];
const REMINDER_CHANNELS = ["email", "whatsapp", "sms"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s().-]{5,19}$/;

const CHANNEL_LABELS: Record<NotifyChannelKey, string> = {
  email: "email",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

function asInt(v: unknown) {
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
}

/** Validates { email, whatsapp, sms } → { enabled, value }. Returns an error string when invalid. */
function parseNotifyChannels(raw: unknown): NotifyChannels | string {
  if (!raw || typeof raw !== "object") return "Invalid notification channels.";
  const out = {} as NotifyChannels;
  for (const key of ["email", "whatsapp", "sms"] as const) {
    const item = (raw as Record<string, unknown>)[key];
    if (!item || typeof item !== "object") return "Invalid notification channels.";
    const enabled = (item as Record<string, unknown>).enabled;
    const value = String((item as Record<string, unknown>).value ?? "").trim().slice(0, 254);
    if (typeof enabled !== "boolean") return "Invalid notification channels.";
    if (value) {
      if (key === "email" && !EMAIL_RE.test(value)) return "Enter a valid email address for email notifications.";
      if (key !== "email" && !PHONE_RE.test(value)) {
        return `Enter a valid phone number for ${CHANNEL_LABELS[key]} notifications (digits, spaces, and an optional leading +).`;
      }
    }
    out[key] = { enabled, value };
  }
  return out;
}

export async function GET() {
  try {
    return Response.json({ project: await ensureProject() });
  } catch (error) {
    console.error("Project settings error:", error);
    return Response.json({ error: "Unable to load settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  let project;
  try {
    project = await ensureProject();
  } catch (error) {
    console.error("Project lookup error:", error);
    return Response.json({ error: "Unable to load the project." }, { status: 500 });
  }

  const values: Partial<typeof projects.$inferInsert> = {};
  const fail = (error: string) => Response.json({ error }, { status: 400 });

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 180) {
      return fail("Project name must contain 2 to 180 characters.");
    }
    values.name = body.name.trim();
  }
  if (body.domain !== undefined) {
    const domain = typeof body.domain === "string" ? body.domain.trim().toLowerCase() : "";
    if (!/^(\*\.)?[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
      return fail("Enter a valid domain, for example example.com.");
    }
    values.domain = domain;
  }
  if (body.allowedDomains !== undefined) {
    const parsed = parseAllowedDomains(body.allowedDomains);
    if (typeof parsed === "string") return fail(parsed);
    values.allowedDomains = parsed;
  }
  if (body.brandColor !== undefined) {
    if (typeof body.brandColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(body.brandColor)) {
      return fail("Enter a color in #RRGGBB format.");
    }
    values.brandColor = body.brandColor;
  }
  if (body.timezone !== undefined) {
    if (typeof body.timezone !== "string" || body.timezone.length > 80) {
      return fail("Enter a valid time zone.");
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: body.timezone });
    } catch {
      return fail("This time zone is not supported.");
    }
    values.timezone = body.timezone;
  }

  // ── Rating scale is always 5 stars; thresholds split 1–5 into positive / neutral / negative ──
  if (body.ratingScale !== undefined && body.ratingScale !== "stars") {
    return fail("Only the 5-star rating scale is supported.");
  }
  if (body.ratingScale !== undefined) values.ratingScale = "stars";
  const positiveThreshold = body.positiveThreshold === undefined ? project.positiveThreshold : asInt(body.positiveThreshold);
  const neutralThreshold = body.neutralThreshold === undefined ? project.neutralThreshold : asInt(body.neutralThreshold);
  if (
    !Number.isInteger(positiveThreshold) ||
    !Number.isInteger(neutralThreshold) ||
    positiveThreshold < 1 ||
    positiveThreshold > 5 ||
    neutralThreshold < 1 ||
    neutralThreshold > 5 ||
    neutralThreshold > positiveThreshold
  ) {
    return fail("Rating ranges must use whole star values from 1 to 5, and neutral cannot start above positive.");
  }
  if (body.positiveThreshold !== undefined || body.neutralThreshold !== undefined) {
    values.positiveThreshold = positiveThreshold;
    values.neutralThreshold = neutralThreshold;
  }

  // ── Publication mode per category: instant / delayed / manual ──
  for (const key of ["positivePublishMode", "neutralPublishMode", "negativePublishMode"] as const) {
    if (body[key] !== undefined) {
      const v = String(body[key]);
      if (!PUBLISH_MODES.includes(v)) return fail("Invalid publication mode.");
      values[key] = v;
    }
  }
  for (const key of ["positiveDelayMinutes", "neutralDelayMinutes", "negativeDelayMinutes"] as const) {
    if (body[key] !== undefined) {
      const n = asInt(body[key]);
      if (!Number.isInteger(n) || n < 0 || n > 10080) return fail("Delay must be between 0 and 10,080 minutes.");
      values[key] = n;
    }
  }

  // ── Notification channels (email / WhatsApp / SMS), one set per category ──
  for (const key of ["positiveNotifyChannels", "neutralNotifyChannels", "negativeNotifyChannels"] as const) {
    if (body[key] !== undefined) {
      const parsed = parseNotifyChannels(body[key]);
      if (typeof parsed === "string") return fail(parsed);
      values[key] = parsed;
    }
  }

  // ── Boolean flags ──
  const boolKeys = [
    "smartQueueEnabled",
    "positiveNotify",
    "neutralNotify",
    "negativeNotify",
    "positiveAutoReplyEnabled",
    "neutralAutoReplyEnabled",
    "negativeAutoReplyEnabled",
    "replyRequiredNegative",
    "invitePositiveToExternal",
    "allowAnonymousReviews",
    "reviewTextRequired",
    "allowPhotos",
    "publicShowCity",
    "publicShowDate",
    "publicShowName",
    "publicShowText",
    "publicShowAvatar",
    "randomizeOrder",
    "primeTimeBoost",
    "hideNegativeText",
    "neutralSupportContact",
    "neutralSupportChat",
    "negativeSupportContact",
    "negativeSupportChat",
    "neutralBoostPositive",
    "negativeLookbackEnabled",
  ] as const;
  for (const key of boolKeys) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "boolean") return fail(`Field ${key} must be true or false.`);
      values[key] = body[key];
    }
  }

  // ── Reminders: any number of follow-up rules (delay + channel + contact + message) ──
  if (body.reminders !== undefined) {
    if (!Array.isArray(body.reminders)) return fail("Reminders must be a list.");
    // No fixed reminder-count limit: every rule is validated individually below.
    const reminders: Reminder[] = [];
    const seen = new Set<string>();
    for (const raw of body.reminders) {
      if (!raw || typeof raw !== "object") return fail("Invalid reminder.");
      const item = raw as Record<string, unknown>;
      const delayMinutes = asInt(item.delayMinutes);
      if (!Number.isInteger(delayMinutes) || delayMinutes < 0 || delayMinutes > 525600) {
        return fail("Reminder delay must be between 0 and 525,600 minutes.");
      }
      const channel = String(item.channel);
      if (!REMINDER_CHANNELS.includes(channel)) return fail("Invalid reminder channel.");
      const message = typeof item.message === "string" ? item.message.trim().slice(0, 2000) : "";
      if (!message) return fail("Enter the reminder message text.");
      const enabled = item.enabled === undefined ? true : item.enabled;
      if (typeof enabled !== "boolean") return fail("Invalid reminder.");
      let id = typeof item.id === "string" ? item.id.trim().slice(0, 40) : "";
      if (id) {
        if (seen.has(id)) return fail("Reminder IDs must be unique.");
        seen.add(id);
      } else {
        id = `rem-${Math.random().toString(36).slice(2, 10)}`;
      }
      reminders.push({
        id,
        delayMinutes,
        channel: channel as ReminderChannelKey,
        target: String(item.target ?? "").trim().slice(0, 254),
        message,
        enabled,
      });
    }
    reminders.sort((a, b) => a.delayMinutes - b.delayMinutes);
    values.reminders = reminders;
  }

  const textKeys = [
    "positiveAutoReplyTemplate",
    "neutralAutoReplyTemplate",
    "negativeAutoReplyTemplate",
    "stopWords",
    "replySignature",
    "supportOfferText",
  ] as const;
  for (const key of textKeys) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "string") return fail(`Field ${key} must be a string.`);
      values[key] = String(body[key]).slice(0, 2000);
    }
  }

  // ── Links: Google reviews and support chat (http/https only) ──
  for (const [key, label] of [
    ["googleReviewUrl", "Google review URL"],
    ["supportChatUrl", "Support chat URL"],
  ] as const) {
    if (body[key] !== undefined) {
      const v = String(body[key]).trim().slice(0, 500);
      if (v) {
        try {
          const u = new URL(v);
          if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocol");
        } catch {
          return fail(`${label}: enter a valid URL starting with https://`);
        }
      }
      values[key] = v;
    }
  }
  if (body.supportEmail !== undefined) {
    const v = String(body.supportEmail).trim().slice(0, 254);
    if (v && !EMAIL_RE.test(v)) return fail("Enter a valid support email address.");
    values.supportEmail = v;
  }
  if (body.negativeLookbackCount !== undefined) {
    const n = asInt(body.negativeLookbackCount);
    if (!Number.isInteger(n) || n < 1 || n > 5) return fail("The negative review lookback window must be between 1 and 5.");
    values.negativeLookbackCount = n;
  }

  if (body.replySlaHours !== undefined) {
    const n = asInt(body.replySlaHours);
    if (!Number.isInteger(n) || n < 1 || n > 720) return fail("Response target must be between 1 and 720 hours.");
    values.replySlaHours = n;
  }
  if (body.minReviewLength !== undefined) {
    const n = asInt(body.minReviewLength);
    if (!Number.isInteger(n) || n < 0 || n > 2000) return fail("Minimum review length must be between 0 and 2,000.");
    values.minReviewLength = n;
  }
  if (body.maxPhotos !== undefined) {
    const n = asInt(body.maxPhotos);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PHOTOS_LIMIT) return fail(`Photos per review must be between 1 and ${MAX_PHOTOS_LIMIT}.`);
    values.maxPhotos = n;
  }
  if (body.badgeFormat !== undefined) {
    const format = String(body.badgeFormat);
    if (!BADGE_FORMATS.includes(format as (typeof BADGE_FORMATS)[number])) return fail("Unknown badge format.");
    values.badgeFormat = format;
  }
  if (body.formFields !== undefined) {
    const parsed = parseFormFields(body.formFields);
    if (parsed.error) return fail(parsed.error);
    values.formFields = parsed.formFields;
  }
  if (body.maxPhotoSizeKb !== undefined) {
    const n = asInt(body.maxPhotoSizeKb);
    if (!Number.isInteger(n) || n < 64 || n > MAX_PHOTO_SIZE_LIMIT_KB) return fail(`Photo size limit must be between 64 and ${MAX_PHOTO_SIZE_LIMIT_KB} KB.`);
    values.maxPhotoSizeKb = n;
  }
  if (body.maxReviewsPerIp !== undefined) {
    const n = asInt(body.maxReviewsPerIp);
    if (!Number.isInteger(n) || n < 1 || n > 100) return fail("IP limit must be between 1 and 100 reviews per day.");
    values.maxReviewsPerIp = n;
  }
  if (body.minIntervalMinutes !== undefined) {
    const n = asInt(body.minIntervalMinutes);
    if (!Number.isInteger(n) || n < 0 || n > 1440) return fail("Interval must be between 0 and 1,440 minutes.");
    values.minIntervalMinutes = n;
  }
  if (body.maxPerHour !== undefined) {
    const n = asInt(body.maxPerHour);
    if (!Number.isInteger(n) || n < 1 || n > 500) return fail("Hourly limit must be between 1 and 500.");
    values.maxPerHour = n;
  }
  if (body.maxPerDay !== undefined) {
    const n = asInt(body.maxPerDay);
    if (!Number.isInteger(n) || n < 1 || n > 2000) return fail("Daily limit must be between 1 and 2,000.");
    values.maxPerDay = n;
  }
  if (body.maxNegativeShare !== undefined) {
    const n = asInt(body.maxNegativeShare);
    if (!Number.isInteger(n) || n < 0 || n > 100) return fail("Negative share must be between 0 and 100%.");
    values.maxNegativeShare = n;
  }

  try {
    const [updated] = await db.update(projects).set(values).where(eq(projects.id, project.id)).returning();
    return Response.json({ project: updated });
  } catch (error) {
    console.error("Project update error:", error);
    return Response.json({ error: "Unable to save project settings." }, { status: 500 });
  }
}
