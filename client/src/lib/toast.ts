import { toast as sonnerToast, type ExternalToast } from "sonner";

const cleanToastText = (message: string, fallback = "System update") => {
  const cleaned = message.replace(/\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu, "");
  if (cleaned === message) return message;
  return cleaned.replace(/[ \t]+/g, " ").trim() || fallback;
};

const cleanToastOptions = (options?: ExternalToast) => options ? {
  ...options,
  description: typeof options.description === "string" ? cleanToastText(options.description, "") || undefined : options.description,
} : undefined;

// Keep feedback focused. Detailed API errors are logged in the browser console
// and server terminal; they are not appropriate for a user-facing popup.
const isRoutineSuccess = (message: string) =>
  /(copied|updated|marked as read|history cleared|enabled|disabled|paused|resumed|featured|unfeatured|reminder set|language set)/i.test(
    message,
  );

const isLocalValidationMessage = (message: string) =>
  /^(please|email is required|username must|password must|select a valid)/i.test(
    message,
  );

const isNonCriticalInfo = (message: string) =>
  !/no longer available/i.test(message);

const toastWithPolicy = Object.assign(
  (message: string, options?: Parameters<typeof sonnerToast>[1]) =>
    sonnerToast(cleanToastText(message), cleanToastOptions(options)),
  {
    success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
      if (isRoutineSuccess(message)) return undefined;
      return sonnerToast.success(cleanToastText(message), cleanToastOptions(options));
    },
    error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
      if (/^failed to (load|fetch)/i.test(message)) return undefined;
      if (isLocalValidationMessage(message)) return sonnerToast.error(cleanToastText(message));
      return sonnerToast.error("Could not complete that action. Please try again.");
    },
    info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
      if (isNonCriticalInfo(message)) return undefined;
      return sonnerToast.info(cleanToastText(message), cleanToastOptions(options));
    },
    warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) =>
      sonnerToast.warning(cleanToastText(message), options ? { ...options, description: undefined } : undefined),
    dismiss: sonnerToast.dismiss,
  },
) as typeof sonnerToast;

export { toastWithPolicy as toast };
