import { useCallback } from "react";
import { useSystemTime } from "./useSystemTime";
import { formatRelativeTime,type RelativeTimeOptions } from "@/utils/date";

export const useNotificationTime = () => {
  const now = useSystemTime();
  const formatTime = useCallback((value: string | null | undefined, options: RelativeTimeOptions = {}) =>
    formatRelativeTime(value, { ...options, now }), [now]);
  return { now, formatTime };
};
