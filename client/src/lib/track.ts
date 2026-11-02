type EventName = "visit" | "share" | "journal_view" | "cta_click";

/** Record a usage event in our own DB (see the privacy policy). Never throws. */
export function track(name: EventName, props?: Record<string, string>) {
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({ name, ...(props ? { props } : {}) }),
  }).catch(() => {});
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/** Once per browser session: where the visitor came from (ad UTM, referrer) and the landing page. */
export function trackVisit() {
  try {
    if (sessionStorage.getItem("gh-visit")) return;
    sessionStorage.setItem("gh-visit", "1");
  } catch {
    // storage blocked: still record, at worst once per page load
  }
  const params = new URLSearchParams(location.search);
  const props: Record<string, string> = { path: location.pathname };
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) props[k] = v.slice(0, 300);
  }
  if (document.referrer && !document.referrer.startsWith(location.origin)) {
    try {
      props.referrer = new URL(document.referrer).hostname;
    } catch {
      // ignore malformed referrer
    }
  }
  track("visit", props);
}
