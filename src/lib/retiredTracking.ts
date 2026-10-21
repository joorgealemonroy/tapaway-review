/** Clear identifiers left by retired advertising integrations; never loads an SDK. */
export function clearRetiredTracking() {
  for (const storageName of ["localStorage", "sessionStorage"] as const) {
    try {
      const storage = window[storageName];
      for (const key of Object.keys(storage)) {
        if (
          /trybe|^ta_(sid|sid_ts|vid|entry)$|^tapaway_tracking_|^tapaway_campaign$|^_fb[pc]$/i.test(
            key,
          )
        )
          storage.removeItem(key);
      }
      const saved = JSON.parse(
        storage.getItem("tapaway_onboarding_data") || "null",
      );
      if (saved?.campaign?.fbclid) {
        delete saved.campaign.fbclid;
        storage.setItem("tapaway_onboarding_data", JSON.stringify(saved));
      }
    } catch {
      /* Blocked storage must not prevent browsing or checkout. */
    }
  }
  const domains = ["", location.hostname, "." + location.hostname];
  if (
    location.hostname === "tapaway.co" ||
    location.hostname.endsWith(".tapaway.co")
  )
    domains.push(".tapaway.co");
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (!/^_fb[pc]$|trybe/i.test(name)) continue;
    for (const domain of domains)
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}; SameSite=Lax`;
  }
}
