import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export type ReviewStatus = "pending" | "queued" | "published" | "rejected" | "spam";
export type ReviewSentiment = "positive" | "neutral" | "negative";

export type NotifyChannelKey = "email" | "whatsapp" | "sms";
export type NotifyChannels = Record<NotifyChannelKey, { enabled: boolean; value: string }>;
export const defaultNotifyChannels: NotifyChannels = {
  email: { enabled: true, value: "" },
  whatsapp: { enabled: false, value: "" },
  sms: { enabled: false, value: "" },
};

export type ReminderChannelKey = "email" | "whatsapp" | "sms";
/** Any number of follow-up reminders, each with its own delay, channel, and on/off switch. */
export type Reminder = {
  id: string;
  delayMinutes: number;
  channel: ReminderChannelKey;
  target: string;
  message: string;
  enabled: boolean;
};
export const defaultReminder: Reminder = {
  id: "",
  delayMinutes: 10080,
  channel: "email",
  target: "",
  message: "Hello! We would love to hear about your experience. Leaving a review only takes a minute.",
  enabled: true,
};

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 180 }).notNull().default("Zerna Coffee"),
  domain: varchar("domain", { length: 255 }).notNull().default("zerno.coffee"),
  brandColor: varchar("brand_color", { length: 7 }).notNull().default("#617a58"),
  timezone: varchar("timezone", { length: 80 }).notNull().default("Europe/Moscow"),
  ratingScale: varchar("rating_scale", { length: 24 }).notNull().default("stars"),
  positiveThreshold: integer("positive_threshold").notNull().default(5),
  neutralThreshold: integer("neutral_threshold").notNull().default(4),
  positiveDelayMinutes: integer("positive_delay_minutes").notNull().default(120),
  smartQueueEnabled: boolean("smart_queue_enabled").notNull().default(true),

  // ── Бизнес-репутация: режимы публикации по категориям ──
  positivePublishMode: varchar("positive_publish_mode", { length: 16 }).notNull().default("delayed"),
  neutralPublishMode: varchar("neutral_publish_mode", { length: 16 }).notNull().default("manual"),
  negativePublishMode: varchar("negative_publish_mode", { length: 16 }).notNull().default("manual"),
  neutralDelayMinutes: integer("neutral_delay_minutes").notNull().default(360),
  negativeDelayMinutes: integer("negative_delay_minutes").notNull().default(0),

  // ── Уведомления ──
  positiveNotifyChannels: jsonb("positive_notify_channels").$type<NotifyChannels>().notNull().default(defaultNotifyChannels),
  neutralNotifyChannels: jsonb("neutral_notify_channels").$type<NotifyChannels>().notNull().default(defaultNotifyChannels),
  negativeNotifyChannels: jsonb("negative_notify_channels").$type<NotifyChannels>().notNull().default(defaultNotifyChannels),
  positiveNotify: boolean("positive_notify").notNull().default(false),
  neutralNotify: boolean("neutral_notify").notNull().default(true),
  negativeNotify: boolean("negative_notify").notNull().default(true),

  // ── Правила ответов ──
  positiveAutoReplyEnabled: boolean("positive_auto_reply_enabled").notNull().default(false),
  neutralAutoReplyEnabled: boolean("neutral_auto_reply_enabled").notNull().default(false),
  negativeAutoReplyEnabled: boolean("negative_auto_reply_enabled").notNull().default(false),
  positiveAutoReplyTemplate: text("positive_auto_reply_template").notNull().default("Спасибо за высокую оценку! Будем рады видеть вас снова 🙌"),
  neutralAutoReplyTemplate: text("neutral_auto_reply_template").notNull().default("Спасибо за отзыв! Подскажите, что мы можем улучшить?"),
  negativeAutoReplyTemplate: text("negative_auto_reply_template").notNull().default("Сожалеем о вашем опыте. Напишите нам — обязательно разберёмся и исправим ситуацию."),
  replySlaHours: integer("reply_sla_hours").notNull().default(24),
  replyRequiredNegative: boolean("reply_required_negative").notNull().default(true),
  replySignature: varchar("reply_signature", { length: 180 }).notNull().default("Команда поддержки"),

  // ── Напоминания и сбор: произвольное количество правил ──
  reminders: jsonb("reminders").$type<Reminder[]>().notNull().default([]),
  invitePositiveToExternal: boolean("invite_positive_to_external").notNull().default(true),
  googleReviewUrl: varchar("google_review_url", { length: 500 }).notNull().default(""),

  // ── Поля формы и публичная карточка отзыва ──
  allowAnonymousReviews: boolean("allow_anonymous_reviews").notNull().default(true),
  reviewTextRequired: boolean("review_text_required").notNull().default(false),
  publicShowCity: boolean("public_show_city").notNull().default(false),
  publicShowDate: boolean("public_show_date").notNull().default(true),
  publicShowName: boolean("public_show_name").notNull().default(true),
  publicShowText: boolean("public_show_text").notNull().default(true),
  publicShowAvatar: boolean("public_show_avatar").notNull().default(true),

  // ── Предложение поддержки после отправки (нейтрал / негатив) ──
  neutralSupportContact: boolean("neutral_support_contact").notNull().default(true),
  neutralSupportChat: boolean("neutral_support_chat").notNull().default(false),
  negativeSupportContact: boolean("negative_support_contact").notNull().default(true),
  negativeSupportChat: boolean("negative_support_chat").notNull().default(true),
  supportEmail: varchar("support_email", { length: 254 }).notNull().default(""),
  supportChatUrl: varchar("support_chat_url", { length: 500 }).notNull().default(""),
  supportOfferText: text("support_offer_text").notNull().default("Нам жаль, что так вышло. Свяжитесь со службой поддержки — мы быстро поможем решить вопрос."),

  // ── Мгновенная компенсация позитивом ──
  neutralBoostPositive: boolean("neutral_boost_positive").notNull().default(true),
  negativeLookbackEnabled: boolean("negative_lookback_enabled").notNull().default(true),
  negativeLookbackCount: integer("negative_lookback_count").notNull().default(3),

  // ── Антиспам и фильтры ──
  stopWords: text("stop_words").notNull().default(""),
  minReviewLength: integer("min_review_length").notNull().default(10),
  maxReviewsPerIp: integer("max_reviews_per_ip").notNull().default(3),

  // ── Расписание и умная очередь ──
  minIntervalMinutes: integer("min_interval_minutes").notNull().default(15),
  maxPerHour: integer("max_per_hour").notNull().default(10),
  maxPerDay: integer("max_per_day").notNull().default(50),
  maxNegativeShare: integer("max_negative_share").notNull().default(20),
  randomizeOrder: boolean("randomize_order").notNull().default(false),
  primeTimeBoost: boolean("prime_time_boost").notNull().default(true),
  hideNegativeText: boolean("hide_negative_text").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    authorName: varchar("author_name", { length: 120 }).notNull(),
    authorEmail: text("author_email"),
    authorCity: varchar("author_city", { length: 120 }),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    rating: integer("rating").notNull(),
    sentiment: varchar("sentiment", { length: 24 }).$type<ReviewSentiment>().notNull(),
    content: text("content").notNull(),
    source: varchar("source", { length: 40 }).notNull().default("Виджет сайта"),
    status: varchar("status", { length: 24 }).$type<ReviewStatus>().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    companyReply: text("company_reply"),
    replyAt: timestamp("reply_at", { withTimezone: true }),
    hiddenText: boolean("hidden_text").notNull().default(false),
    pinned: boolean("pinned").notNull().default(false),
  },
  (table) => ({
    projectCreatedIndex: index("reviews_project_created_idx").on(table.projectId, table.createdAt),
    projectStatusIndex: index("reviews_project_status_idx").on(table.projectId, table.status),
  }),
);
