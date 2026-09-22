import { useEffect } from "react";

/**
 * Dispatches a custom event to notify any active sub-view that a back action was requested.
 * If any sub-view catches the event and calls `event.preventDefault()`, this function returns true (handled).
 * Otherwise returns false (not handled).
 */
export const dispatchAppBack = () => {
  const event = new CustomEvent("app:navigate-back", {
    cancelable: true,
    bubbles: true,
  });
  const notPrevented = window.dispatchEvent(event);
  return !notPrevented;
};

/**
 * Universal back handler for layouts.
 * 1. Gives active sub-views (e.g. Take Attendance, Class Explorer, Assessment Sheet) a chance to close/go back.
 * 2. If not handled, checks browser history:
 *    - If there is a previous page in this SPA session (window.history.state.idx > 0), calls navigate(-1).
 *    - Otherwise safely navigates to fallbackPath to prevent leaving the application.
 */
export const handleAppBack = (navigate, fallbackPath = "/") => {
  const handled = dispatchAppBack();
  if (handled) {
    return;
  }

  if (window.history.state && typeof window.history.state.idx === "number" && window.history.state.idx > 0) {
    navigate(-1);
  } else if (fallbackPath) {
    navigate(fallbackPath);
  } else {
    navigate(-1);
  }
};

/**
 * Hook to connect a sub-view (inner detail view/sheet) to the topbar Back button and browser Back button.
 * When `isActive` is true, clicking the Layout's Back button will trigger `onBack` instead of leaving the page.
 */
export const useSubViewBack = (isActive, onBack) => {
  useEffect(() => {
    if (!isActive || typeof onBack !== "function") return;

    const handler = (e) => {
      e.preventDefault();
      onBack();
    };

    window.addEventListener("app:navigate-back", handler);
    return () => window.removeEventListener("app:navigate-back", handler);
  }, [isActive, onBack]);
};
