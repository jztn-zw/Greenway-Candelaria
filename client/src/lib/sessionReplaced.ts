import { clearAuthStorage, getAuthStorage } from "./authStorage";

export const SESSION_REPLACED_MESSAGE = "You have been signed out because this account was signed in on another browser or device. Sign in again to continue here.";
export const SESSION_REPLACED_NOTICE = "greenway-session-replaced";

export function endReplacedSession(expectedToken: string) {
  if (getAuthStorage().getItem("token") !== expectedToken) return false;
  sessionStorage.setItem(SESSION_REPLACED_NOTICE, "true");
  // Remember the cause for other tabs sharing this browser's remembered token.
  if (getAuthStorage() === localStorage) localStorage.setItem(SESSION_REPLACED_NOTICE, "true");
  clearAuthStorage("replaced");
  window.location.replace("/login");
  return true;
}
