const FB_PIXEL_ID = "571857824424163";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function initFBPixel() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js"
  );
  /* eslint-enable */

  window.fbq("init", FB_PIXEL_ID);
}

export function trackPageView() {
  initFBPixel();
  window.fbq("track", "PageView");
}

export function trackInitiateCheckout(data?: Record<string, unknown>) {
  initFBPixel();
  window.fbq("track", "InitiateCheckout", data);
}

export function trackPurchase(data?: Record<string, unknown>) {
  initFBPixel();
  window.fbq("track", "Purchase", data);
}
