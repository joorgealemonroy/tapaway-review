import { useLayoutEffect } from "react";
import { Link, useLocation, type LinkProps } from "react-router-dom";

export const storefrontLoaders = {
  personal: () => import("@/pages/Personal"),
  support: () => import("@/pages/Support"),
  onboarding: () => import("@/pages/Onboarding"),
  designer: () => import("@/pages/PersonalDesigner"),
};
export const isStorefrontPath = (path: string) =>
  [
    "/",
    "/auth",
    "/business",
    "/personal",
    "/personal/design",
    "/personal/order",
    "/personal/pricing",
    "/support",
    "/onboarding",
    "/start",
    "/welcome",
  ].includes(path);

const preloaded = new Set<string>();
export function prefetchStorefrontRoute(href: string) {
  const path = href.split(/[?#]/)[0];
  const load =
    path === "/support"
      ? storefrontLoaders.support
      : path === "/personal"
        ? storefrontLoaders.personal
        : path === "/personal/design"
          ? storefrontLoaders.designer
          : ["/onboarding", "/start"].includes(path)
            ? storefrontLoaders.onboarding
            : null;
  if (!load || preloaded.has(path)) return;
  preloaded.add(path);
  void load().catch(() => preloaded.delete(path));
}

/** Prefetch on intent, without downloading the card designer on every home visit. */
export function StorefrontLink({
  to,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: LinkProps) {
  const prepare = () =>
    prefetchStorefrontRoute(typeof to === "string" ? to : to.pathname || "");
  return (
    <Link
      {...props}
      to={to}
      onMouseEnter={(e) => {
        prepare();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        prepare();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        prepare();
        onTouchStart?.(e);
      }}
    />
  );
}

/** Anchor navigation also waits for a lazy route to mount. */
export function StorefrontRouteSurface() {
  const { pathname, hash, key } = useLocation();
  useLayoutEffect(() => {
    document.documentElement.style.setProperty(
      "--app-bg",
      isStorefrontPath(pathname) ? "#ffffff" : pathname.startsWith("/admin") ? "#f8f9f5" : "hsl(var(--background))",
    );
    if (!isStorefrontPath(pathname)) return;
    if (!hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    const scroll = () => {
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: "start", behavior: "instant" });
      return !!target;
    };
    if (scroll()) return;
    const observer = new MutationObserver(() => {
      if (scroll()) observer.disconnect();
    });
    observer.observe(document.getElementById("root")!, {
      childList: true,
      subtree: true,
    });
    const timer = window.setTimeout(() => observer.disconnect(), 5000);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [pathname, hash, key]);
  return null;
}
