import type { ReviewSentiment } from "@/db/schema";

export type FollowUpConfig = {
  invitePositiveToExternal: boolean;
  googleReviewUrl: string;
  neutralSupportContact: boolean;
  neutralSupportChat: boolean;
  negativeSupportContact: boolean;
  negativeSupportChat: boolean;
  supportEmail: string;
  supportChatUrl: string;
  supportOfferText: string;
};

export type FollowUp = {
  sentiment: ReviewSentiment;
  /** Предложение написать в поддержку / запустить чат — только для нейтрала и негатива */
  support: { contact: boolean; chat: boolean; email: string; chatUrl: string; text: string } | null;
  /** Приглашение оставить отзыв в Google — только для позитива */
  google: { url: string } | null;
};

/** Что показать клиенту сразу после отправки отзыва. */
export function buildFollowUp(cfg: FollowUpConfig, sentiment: ReviewSentiment): FollowUp {
  if (sentiment === "positive") {
    const url = cfg.googleReviewUrl.trim();
    return {
      sentiment,
      support: null,
      google: cfg.invitePositiveToExternal && url ? { url } : null,
    };
  }

  const contact = sentiment === "neutral" ? cfg.neutralSupportContact : cfg.negativeSupportContact;
  const chat = sentiment === "neutral" ? cfg.neutralSupportChat : cfg.negativeSupportChat;
  const hasContact = contact && cfg.supportEmail.trim().length > 0;
  const hasChat = chat && cfg.supportChatUrl.trim().length > 0;

  return {
    sentiment,
    support:
      hasContact || hasChat
        ? {
            contact: hasContact,
            chat: hasChat,
            email: cfg.supportEmail.trim(),
            chatUrl: cfg.supportChatUrl.trim(),
            text: cfg.supportOfferText,
          }
        : null,
    google: null,
  };
}
