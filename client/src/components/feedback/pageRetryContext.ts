import { createContext } from "react";

// Pages with several data sources own one primary retry notice. Their sections
// still explain failures, but leave recovery to the page's combined action.
export const PageRetryContext = createContext(false);
