import { useSyncExternalStore } from "react";
import { getThemeMode, subscribeThemeMode } from "@/lib/theme";

/** Keep every theme consumer in sync, whichever control changed the theme. */
export const useThemeMode = () => useSyncExternalStore(subscribeThemeMode, getThemeMode);
