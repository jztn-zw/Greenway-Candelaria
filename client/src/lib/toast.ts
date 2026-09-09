import { toast as sonnerToast } from "sonner";

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
    sonnerToast(message, options),
  {
    success: (message: string, options?: Parameters<typeof sonnerToast.success>[1]) => {
      if (isRoutineSuccess(message)) return undefined;
      return sonnerToast.success(message, options);
    },
    error: (message: string, options?: Parameters<typeof sonnerToast.error>[1]) => {
      if (/^failed to (load|fetch)/i.test(message)) return undefined;
      if (isLocalValidationMessage(message)) return sonnerToast.error(message);
      return sonnerToast.error("Could not complete that action. Please try again.");
    },
    info: (message: string, options?: Parameters<typeof sonnerToast.info>[1]) => {
      if (isNonCriticalInfo(message)) return undefined;
      return sonnerToast.info(message, options);
    },
    warning: (message: string, options?: Parameters<typeof sonnerToast.warning>[1]) =>
      sonnerToast.warning(message, options ? { ...options, description: undefined } : undefined),
    dismiss: sonnerToast.dismiss,
  },
) as typeof sonnerToast;

export { toastWithPolicy as toast };
