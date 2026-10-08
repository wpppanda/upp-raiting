export const projectCopyDefaults = {
  positiveAutoReplyTemplate: {
    previous: "Спасибо за высокую оценку! Будем рады видеть вас снова 🙌",
    english: "Thank you for your great review! We look forward to welcoming you back.",
  },
  neutralAutoReplyTemplate: {
    previous: "Спасибо за отзыв! Подскажите, что мы можем улучшить?",
    english: "Thank you for your feedback! Please let us know how we can improve.",
  },
  negativeAutoReplyTemplate: {
    previous: "Сожалеем о вашем опыте. Напишите нам — обязательно разберёмся и исправим ситуацию.",
    english: "We are sorry about your experience. Please contact our team so we can investigate and make it right.",
  },
  replySignature: {
    previous: "Команда поддержки",
    english: "Customer support team",
  },
  supportOfferText: {
    previous: "Нам жаль, что так вышло. Свяжитесь со службой поддержки — мы быстро поможем решить вопрос.",
    english: "We are sorry your experience did not meet expectations. Contact our support team so we can help resolve the issue.",
  },
} as const;
