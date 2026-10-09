import { and, asc, desc, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { decryptEmail } from "@/lib/pii";
import { releaseBoostedPositives } from "@/lib/publish-rules";
import { DEFAULT_MAX_PHOTOS, DEFAULT_MAX_PHOTO_SIZE_KB, projects, reviews, type CustomFieldAnswer, type CustomFormField, type NotifyChannels, type Reminder, type ReviewAuthorKind, type ReviewSentiment, type ReviewStatus } from "@/db/schema";

export type { CustomFormField, CustomFieldAnswer } from "@/db/schema";
export { MAX_CUSTOM_FIELDS } from "@/db/schema";

export type { Reminder, ReminderChannelKey } from "@/db/schema";

export type { ReviewAuthorKind } from "@/db/schema";

export type { NotifyChannels, NotifyChannelKey } from "@/db/schema";

export type DashboardReview = {
  id: string;
  projectId: string;
  authorName: string;
  authorEmail: string | null;
  authorCity: string | null;
  isAnonymous: boolean;
  rating: number;
  sentiment: ReviewSentiment;
  content: string;
  source: string;
  status: ReviewStatus;
  createdAt: Date;
  scheduledAt: Date | null;
  publishedAt: Date | null;
  companyReply: string | null;
  replyAt: Date | null;
  hiddenText: boolean;
  pinned: boolean;
  /** Photo attachments as data URLs, in the order the author added them. */
  photos: string[];
  authorKind: ReviewAuthorKind;
  /** Employee who entered the review manually in the admin panel. */
  addedBy: string | null;
  /** Snapshot of the custom form answers. */
  customFields: CustomFieldAnswer[];
};

export type DashboardProject = {
  id: string;
  name: string;
  domain: string;
  /** Extra origins where the widget is allowed to run, next to the primary domain. */
  allowedDomains: string[];
  brandColor: string;
  timezone: string;
  ratingScale: string;
  positiveThreshold: number;
  neutralThreshold: number;
  positiveDelayMinutes: number;
  smartQueueEnabled: boolean;
  positivePublishMode: string;
  neutralPublishMode: string;
  negativePublishMode: string;
  neutralDelayMinutes: number;
  negativeDelayMinutes: number;
  positiveNotifyChannels: NotifyChannels;
  neutralNotifyChannels: NotifyChannels;
  negativeNotifyChannels: NotifyChannels;
  positiveNotify: boolean;
  neutralNotify: boolean;
  negativeNotify: boolean;
  positiveAutoReplyEnabled: boolean;
  neutralAutoReplyEnabled: boolean;
  negativeAutoReplyEnabled: boolean;
  positiveAutoReplyTemplate: string;
  neutralAutoReplyTemplate: string;
  negativeAutoReplyTemplate: string;
  replySlaHours: number;
  replyRequiredNegative: boolean;
  replySignature: string;
  reminders: Reminder[];
  invitePositiveToExternal: boolean;
  googleReviewUrl: string;
  allowAnonymousReviews: boolean;
  reviewTextRequired: boolean;
  /** Customers may attach photos to a review through the widget form. */
  allowPhotos: boolean;
  maxPhotos: number;
  maxPhotoSizeKb: number;
  formShowEmail: boolean;
  formShowCity: boolean;
  formShowComment: boolean;
  formFields: CustomFormField[];
  badgeFormat: string;
  badgeSize: string;
  badgeTheme: string;
  badgeShape: string;
  badgeShowCount: boolean;
  badgeLabel: string;
  publicShowCity: boolean;
  publicShowDate: boolean;
  publicShowName: boolean;
  publicShowText: boolean;
  publicShowAvatar: boolean;
  neutralSupportContact: boolean;
  neutralSupportChat: boolean;
  negativeSupportContact: boolean;
  negativeSupportChat: boolean;
  supportEmail: string;
  supportChatUrl: string;
  supportOfferText: string;
  neutralBoostPositive: boolean;
  negativeLookbackEnabled: boolean;
  negativeLookbackCount: number;
  stopWords: string;
  minReviewLength: number;
  maxReviewsPerIp: number;
  minIntervalMinutes: number;
  maxPerHour: number;
  maxPerDay: number;
  maxNegativeShare: number;
  randomizeOrder: boolean;
  primeTimeBoost: boolean;
  hideNegativeText: boolean;
  createdAt: Date;
};

export type DashboardData = {
  project: DashboardProject;
  reviews: DashboardReview[];
  metrics: {
    total: number;
    published: number;
    pending: number;
    queued: number;
    averageRating: number;
    positiveShare: number;
  };
  ratingDistribution: Array<{ rating: number; count: number }>;
  weekly: Array<{ date: string; label: string; count: number; average: number | null }>;
};

type DemoReview = {
  authorName: string;
  rating: number;
  sentiment: ReviewSentiment;
  content: string;
  status: ReviewStatus;
  hoursAgo: number;
  reply?: string;
  previousAuthorName?: string;
  previousContent?: string;
  previousReply?: string;
};

const DEMO_CITIES: Record<string, string> = {
  "Valeria M.": "New York",
  "Artem S.": "Chicago",
  "Anna K.": "Boston",
  "Maria R.": "Seattle",
  "Pavel T.": "Austin",
  "Polina D.": "Portland",
  "Sergey V.": "Denver",
  "Kristina L.": "San Diego",
  "Ivan K.": "Miami",
  "Marina B.": "Los Angeles",
  "Roman F.": "Dallas",
  "Olga N.": "Philadelphia",
};

const demoReviews: DemoReview[] = [
  {
    authorName: "Valeria M.",
    rating: 5,
    sentiment: "positive",
    content: "Such a cozy spot — the matcha and the pour-over are love. I will definitely come back!",
    status: "published",
    hoursAgo: 0.6,
    reply: "Valeria, thank you for the warm words! We look forward to seeing you again ☕",
    previousAuthorName: "Валерия М.",
    previousContent: "Очень уютное место, матча и фильтр-кофе — любовь. Вернусь обязательно!",
    previousReply: "Валерия, спасибо за такие тёплые слова! Будем ждать снова ☕",
  },
  {
    authorName: "Artem S.",
    rating: 5,
    sentiment: "positive",
    content: "The best cappuccino in the city. The barista helped me pick a bean, and now I come here first.",
    status: "published",
    hoursAgo: 4,
    reply: "Artem, glad we helped you find your taste. See you soon!",
    previousAuthorName: "Артём С.",
    previousContent: "Лучший капучино в городе, бариста помог с выбором зерна. Теперь только к вам.",
    previousReply: "Артём, рады, что помогли найти ваш вкус. До встречи!",
  },
  {
    authorName: "Anna K.",
    rating: 4,
    sentiment: "neutral",
    content: "Delicious and atmospheric, but we waited a bit long for the order. Otherwise everything was great.",
    status: "published",
    hoursAgo: 26,
    reply: "Anna, thanks for the feedback — we have already discussed serving speed with the team.",
    previousAuthorName: "Анна К.",
    previousContent: "Вкусно и атмосферно, но немного долго ждали заказ. В остальном всё супер.",
    previousReply: "Анна, спасибо за обратную связь — уже обсудили скорость подачи с командой.",
  },
  {
    authorName: "Maria R.",
    rating: 5,
    sentiment: "positive",
    content: "Zerna has become my new Sunday tradition. Thank you for the cozy atmosphere and great coffee!",
    status: "published",
    hoursAgo: 50,
    previousAuthorName: "Мария Р.",
    previousContent: "Зёрна — моя новая традиция по воскресеньям. Спасибо за уют и отличный кофе!",
  },
  {
    authorName: "Pavel T.",
    rating: 3,
    sentiment: "negative",
    content: "The dessert was not very fresh. I hope you will fix this. The coffee itself was excellent.",
    status: "published",
    hoursAgo: 73,
    reply: "Pavel, we are sorry about this experience. Please reach out — we want to make it right.",
    previousAuthorName: "Павел Т.",
    previousContent: "Десерт был уже не очень свежий, надеюсь, исправитесь. Кофе при этом отличный.",
    previousReply: "Павел, простите за этот опыт. Напишите нам — хотим всё исправить.",
  },
  {
    authorName: "Polina D.",
    rating: 5,
    sentiment: "positive",
    content: "Very attentive service and an incredibly delicious raf. Beautiful and calm inside.",
    status: "published",
    hoursAgo: 101,
    previousAuthorName: "Полина Д.",
    previousContent: "Очень внимательный сервис и безумно вкусный раф. Внутри красиво и спокойно.",
  },
  {
    authorName: "Sergey V.",
    rating: 5,
    sentiment: "positive",
    content: "Great place, beautiful interior, and excellent coffee. I stopped by on a whim — I will come back on purpose.",
    status: "queued",
    hoursAgo: 0.4,
    previousAuthorName: "Сергей В.",
    previousContent: "Классное место, красивый интерьер и отличный кофе. Забежал случайно — вернусь специально.",
  },
  {
    authorName: "Kristina L.",
    rating: 5,
    sentiment: "positive",
    content: "Very pleasant staff. I stopped by for a minute and stayed for a whole hour.",
    status: "queued",
    hoursAgo: 1,
    previousAuthorName: "Кристина Л.",
    previousContent: "Очень приятный персонал, зашла на минутку и осталась на целый час.",
  },
  {
    authorName: "Ivan K.",
    rating: 1,
    sentiment: "negative",
    content: "I waited almost forty minutes for my order and the coffee went cold. I am very disappointed with the service.",
    status: "pending",
    hoursAgo: 1.2,
    previousAuthorName: "Иван К.",
    previousContent: "Заказ ждал почти сорок минут, кофе успел остыть. Очень расстроен сервисом.",
  },
  {
    authorName: "Marina B.",
    rating: 3,
    sentiment: "neutral",
    content: "Everything was fine, but the tables were full and I had to wait at the entrance.",
    status: "pending",
    hoursAgo: 2.4,
    previousAuthorName: "Марина Б.",
    previousContent: "Всё нормально, только столики были заняты и пришлось подождать у входа.",
  },
  {
    authorName: "Roman F.",
    rating: 2,
    sentiment: "negative",
    content: "I expected more from breakfast: the dishes were served cold and the waiter did not notice.",
    status: "pending",
    hoursAgo: 3.1,
    previousAuthorName: "Роман Ф.",
    previousContent: "Ожидал большего от завтрака: блюда подали холодными, а официант не заметил.",
  },
  {
    authorName: "Olga N.",
    rating: 4,
    sentiment: "neutral",
    content: "Good coffee, but I would like more sugar-free syrup options.",
    status: "pending",
    hoursAgo: 5.5,
    previousAuthorName: "Ольга Н.",
    previousContent: "Хороший кофе, но хотелось бы побольше вариантов сиропов без сахара.",
  },
];

/** One-time, idempotent migration of the legacy Russian demo copy to English. */
async function syncDemoReviews() {
  for (const review of demoReviews) {
    if (!review.previousAuthorName || !review.previousContent) continue;
    await db
      .update(reviews)
      .set({
        authorName: review.authorName,
        content: review.content,
        ...(review.previousReply && review.reply
          ? { companyReply: review.reply }
          : {}),
      })
      .where(
        and(
          eq(reviews.authorName, review.previousAuthorName),
          eq(reviews.content, review.previousContent),
        ),
      );
    const city = DEMO_CITIES[review.authorName];
    if (city) {
      await db
        .update(reviews)
        .set({ authorCity: city })
        .where(and(eq(reviews.authorName, review.authorName), isNull(reviews.authorCity)));
    }
  }
}

/**
 * Idempotent, one-time-per-process schema guard for columns added after the
 * first deployment (the project has no migration folder; drizzle-kit push is
 * the usual path, but the app must keep working until it runs).
 */
let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const statements = [
      sql`alter table "projects" add column if not exists "allowed_domains" jsonb not null default '[]'::jsonb`,
      sql`alter table "projects" add column if not exists "allow_photos" boolean not null default true`,
      sql`alter table "projects" add column if not exists "max_photos" integer not null default ${DEFAULT_MAX_PHOTOS}`,
      sql`alter table "projects" add column if not exists "max_photo_size_kb" integer not null default ${DEFAULT_MAX_PHOTO_SIZE_KB}`,
      sql`alter table "reviews" add column if not exists "photos" jsonb not null default '[]'::jsonb`,
      sql`alter table "reviews" add column if not exists "author_kind" varchar(16) not null default 'customer'`,
      sql`alter table "reviews" add column if not exists "added_by" varchar(120)`,
      sql`alter table "reviews" add column if not exists "custom_fields" jsonb not null default '[]'::jsonb`,
      sql`alter table "projects" add column if not exists "form_fields" jsonb not null default '[]'::jsonb`,
      sql`alter table "projects" add column if not exists "badge_format" varchar(16) not null default 'full'`,
      sql`alter table "projects" add column if not exists "badge_size" varchar(8) not null default 'medium'`,
      sql`alter table "projects" add column if not exists "badge_theme" varchar(8) not null default 'light'`,
      sql`alter table "projects" add column if not exists "badge_shape" varchar(8) not null default 'rounded'`,
      sql`alter table "projects" add column if not exists "badge_show_count" boolean not null default true`,
      sql`alter table "projects" add column if not exists "badge_label" varchar(64) not null default ''`,
      sql`alter table "projects" add column if not exists "form_show_email" boolean not null default true`,
      sql`alter table "projects" add column if not exists "form_show_city" boolean not null default true`,
      sql`alter table "projects" add column if not exists "form_show_comment" boolean not null default true`,
    ];
    for (const statement of statements) {
      try {
        await db.execute(statement);
      } catch (error) {
        console.warn("Schema column check skipped:", error instanceof Error ? error.message : error);
      }
    }
  })();
  return schemaReady;
}

export async function ensureProject(): Promise<DashboardProject> {
  await ensureSchema();
  const { projectCopyDefaults } = await import("@/lib/project-default-copy");
  // Always use the oldest project so every request sees the same one (an unordered LIMIT 1 can flip after an UPDATE).
  const [existing] = await db.select().from(projects).orderBy(asc(projects.createdAt), asc(projects.id)).limit(1);
  if (existing) {
    let project = existing;
    // The product always uses a 5-star scale and three publication modes (instant / delayed / manual).
    const validMode = (mode: string) => (mode === "instant" || mode === "manual" || mode === "delayed" ? mode : "delayed");
    const needsNormalizing =
      existing.ratingScale !== "stars" ||
      existing.positiveThreshold > 5 ||
      existing.neutralThreshold > existing.positiveThreshold ||
      validMode(existing.positivePublishMode) !== existing.positivePublishMode ||
      validMode(existing.neutralPublishMode) !== existing.neutralPublishMode ||
      validMode(existing.negativePublishMode) !== existing.negativePublishMode;
    if (needsNormalizing) {
      const positiveThreshold = existing.ratingScale === "stars" ? Math.min(5, Math.max(1, existing.positiveThreshold)) : 5;
      const neutralThreshold = existing.ratingScale === "stars" ? Math.min(positiveThreshold, Math.max(1, existing.neutralThreshold)) : 4;
      const [normalized] = await db
        .update(projects)
        .set({
          ratingScale: "stars",
          positiveThreshold,
          neutralThreshold,
          positivePublishMode: validMode(existing.positivePublishMode),
          neutralPublishMode: validMode(existing.neutralPublishMode),
          negativePublishMode: validMode(existing.negativePublishMode),
        })
        .where(eq(projects.id, existing.id))
        .returning();
      if (normalized) project = normalized;
    }
    if (existing.name === "Кофейня «Зёрна»") {
      const [renamed] = await db
        .update(projects)
        .set({ name: "Zerna Coffee" })
        .where(and(eq(projects.id, existing.id), eq(projects.name, "Кофейня «Зёрна»")))
        .returning();
      if (renamed) project = renamed;
    }
    // Reminders saved before the on/off switch existed are treated as enabled.
    if (Array.isArray(existing.reminders) && existing.reminders.some((r) => typeof r.enabled !== "boolean")) {
      const [withSwitches] = await db
        .update(projects)
        .set({ reminders: existing.reminders.map((r) => ({ ...r, enabled: typeof r.enabled === "boolean" ? r.enabled : true })) })
        .where(eq(projects.id, existing.id))
        .returning();
      if (withSwitches) project = withSwitches;
    }
    // Rows created before the widget allow-list existed get an empty list.
    if (!Array.isArray(existing.allowedDomains)) {
      const [withDomains] = await db
        .update(projects)
        .set({ allowedDomains: [] })
        .where(eq(projects.id, existing.id))
        .returning();
      if (withDomains) project = withDomains;
    }
    // Translate only exact legacy built-in presets, never custom copy or customer reviews.
    for (const key of Object.keys(projectCopyDefaults) as Array<keyof typeof projectCopyDefaults>) {
      const { previous, english } = projectCopyDefaults[key];
      if (existing[key] !== previous) continue;
      const [updated] = await db.update(projects)
        .set({ [key]: english })
        .where(and(eq(projects.id, existing.id), eq(projects[key], previous)))
        .returning();
      if (updated) project = updated;
    }
    return project;
  }

  const defaults = Object.fromEntries(
    Object.entries(projectCopyDefaults).map(([key, value]) => [key, value.english]),
  ) as Partial<typeof projects.$inferInsert>;
  // One starter reminder; customers add as many as they need in Settings → Reminders.
  defaults.reminders = [
    {
      id: "rem-3d",
      delayMinutes: 3 * 24 * 60,
      channel: "email" as const,
      target: "",
      message: "Hello! We would love to hear about your experience. Leaving a review only takes a minute.",
      enabled: true,
    },
  ];
  // Serialize first-time creation so two simultaneous page loads cannot create two projects.
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(727001)`);
    const [raced] = await tx.select().from(projects).orderBy(asc(projects.createdAt), asc(projects.id)).limit(1);
    if (raced) return raced;
    const [created] = await tx.insert(projects).values({ ...defaults, name: "Zerna Coffee" }).returning();
    return created;
  });
}

export async function publishDueReviews(projectId: string) {
  const now = new Date();
  await db
    .update(reviews)
    .set({ status: "published", publishedAt: now, scheduledAt: null })
    .where(and(eq(reviews.projectId, projectId), eq(reviews.status, "queued"), lte(reviews.scheduledAt, now)));

  // Правила мгновенной компенсации: нейтрал / негатив в последних N → следующий позитив сразу
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (project) await releaseBoostedPositives(projectId, project);
}

export async function getDashboardData(): Promise<DashboardData> {
  const project = await ensureProject();
  await syncDemoReviews();
  const existingReviews = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(eq(reviews.projectId, project.id))
    .limit(1);

  if (existingReviews.length === 0) {
    const now = Date.now();
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(727002)`);
      const [seeded] = await tx.select({ id: reviews.id }).from(reviews).where(eq(reviews.projectId, project.id)).limit(1);
      if (seeded) return;
      await tx.insert(reviews).values(
      demoReviews.map((review) => {
        const createdAt = new Date(now - review.hoursAgo * 60 * 60 * 1000);
        const publishedAt = review.status === "published" ? new Date(createdAt.getTime() + 12 * 60 * 1000) : null;
        return {
          projectId: project.id,
          authorName: review.authorName,
          authorCity: DEMO_CITIES[review.authorName] ?? null,
          rating: review.rating,
          sentiment: review.sentiment,
          content: review.content,
          status: review.status,
          source: "Виджет сайта",
          createdAt,
          publishedAt,
          scheduledAt:
            review.status === "queued"
              ? new Date(now + (review.authorName === "Sergey V." ? 35 : 90) * 60 * 1000)
              : null,
          companyReply: review.reply ?? null,
          replyAt: review.reply ? new Date(createdAt.getTime() + 30 * 60 * 1000) : null,
        };
      }),
      );
    });
  }

  await publishDueReviews(project.id);
  const reviewRows = await db
    .select()
    .from(reviews)
    .where(eq(reviews.projectId, project.id))
    .orderBy(desc(reviews.createdAt));

  const published = reviewRows.filter((review) => review.status === "published");
  const averageRating = published.length
    ? Math.round((published.reduce((total, review) => total + review.rating, 0) / published.length) * 10) / 10
    : 0;
  const positivePublished = published.filter((review) => review.sentiment === "positive").length;
  const distributionRatings = project.ratingScale === "nps"
    ? Array.from({ length: 11 }, (_, index) => 10 - index)
    : project.ratingScale === "binary"
      ? [1, 0]
      : [5, 4, 3, 2, 1];
  const ratingDistribution = distributionRatings.map((rating) => ({
    rating,
    count: published.filter((review) => review.rating === rating).length,
  }));

  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const dateKey = date.toISOString().slice(0, 10);
    const dayReviews = published.filter(
      (review) => review.publishedAt?.toISOString().slice(0, 10) === dateKey,
    );
    const dayAverage = dayReviews.length
      ? Math.round((dayReviews.reduce((total, review) => total + review.rating, 0) / dayReviews.length) * 10) / 10
      : null;
    return {
      date: dateKey,
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
      count: dayReviews.length,
      average: dayAverage,
    };
  });

  return {
    project,
    reviews: reviewRows.map((review) => ({ ...review, authorEmail: decryptEmail(review.authorEmail) })),
    metrics: {
      total: reviewRows.length,
      published: published.length,
      pending: reviewRows.filter((review) => review.status === "pending").length,
      queued: reviewRows.filter((review) => review.status === "queued").length,
      averageRating,
      positiveShare: published.length ? Math.round((positivePublished / published.length) * 100) : 0,
    },
    ratingDistribution,
    weekly,
  };
}
