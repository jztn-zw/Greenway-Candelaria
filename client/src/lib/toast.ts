import { toast as sonnerToast,type ExternalToast } from "sonner";
import { safeFeedbackMessage } from "./feedbackMessages";

const cleanToastText = (message: string, fallback = "System update") => {
  const cleaned = message.replace(/\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu, "");
  if (cleaned === message) return message;
  return cleaned.replace(/[ \t]+/g, " ").trim() || fallback;
};

const cleanToastOptions = (options?: ExternalToast) => options ? {
  ...options,
  description: typeof options.description === "string" ? cleanToastText(options.description, "") || undefined : options.description,
} : undefined;

const toastWithPolicy = Object.assign(
  (message: string, options?: Parameters<typeof sonnerToast>[1]) =>
    sonnerToast(cleanToastText(message), cleanToastOptions(options)),
  {
    success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
      return sonnerToast.success(cleanToastText(message), cleanToastOptions(options));
    },
    error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
      const title = cleanToastText(safeFeedbackMessage(message));
      const cleaned = cleanToastOptions(options);
      const description = typeof cleaned?.description === "string" ? safeFeedbackMessage(cleaned.description) : cleaned?.description;
      return sonnerToast.error(title, { ...cleaned, description,
        id: cleaned?.id ?? `action-error:${title}:${typeof description === "string" ? description : ""}` });
    },
    info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
      return sonnerToast.info(cleanToastText(message), cleanToastOptions(options));
    },
    warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) => {
      const cleaned = cleanToastOptions(options);
      return sonnerToast.warning(cleanToastText(safeFeedbackMessage(message)), cleaned ? { ...cleaned,
        description: typeof cleaned.description === "string" ? safeFeedbackMessage(cleaned.description) : cleaned.description } : undefined);
    },
    dismiss: sonnerToast.dismiss,
  },
) as typeof sonnerToast;

export { toastWithPolicy as toast };
