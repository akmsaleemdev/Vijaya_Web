"use client";

/**
 * VIJAYA analytics — fire-and-forget beacon to /api/analytics.
 * Event names mirror the spec's track_events list.
 */

export type AnalyticsEventName =
  | "hero_check_date_click"
  | "event_type_selected"
  | "check_date_started"
  | "date_selected"
  | "slot_selected"
  | "guest_count_selected"
  | "venue_viewed"
  | "venue_360_started"
  | "availability_checked"
  | "booking_started"
  | "temporary_hold_created"
  | "checkout_started"
  | "payment_started"
  | "payment_success"
  | "payment_failed"
  | "booking_confirmed"
  | "venue_visit_started"
  | "venue_visit_submitted"
  | "plan_event_submitted"
  | "whatsapp_clicked"
  | "phone_clicked"
  | "global_desk_enquiry"
  | "story_viewed"
  | "concierge_opened"
  | "concierge_message";

let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem("vij_sid") || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    sessionStorage.setItem("vij_sid", sessionId);
  } catch {
    sessionId = "anon-" + Date.now();
  }
  return sessionId;
}

export function track(name: AnalyticsEventName, meta?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({
    name,
    path: window.location.pathname,
    sessionId: getSessionId(),
    meta: meta || {},
  });
  try {
    // sendBeacon is the most resilient; fall back to keepalive fetch.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/analytics", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    /* analytics must never break UX */
  }
}
