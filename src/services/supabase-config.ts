function isPublishableKey(key: string) {
  if (key.startsWith("sb_publishable_")) return key.length > "sb_publishable_".length;
  const parts = key.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).role === "anon";
  } catch {
    return false;
  }
}

export function supabaseEndpoint(url: string, key: string): URL {
  if (!url || !key) throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
  if (!isPublishableKey(key))
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key.");
  const target = URL.canParse(url) ? new URL(url) : undefined;
  const loopback = target && ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
  if (
    !target ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    (target.protocol !== "https:" && !(loopback && target.protocol === "http:"))
  )
    throw new Error("Use an HTTPS Supabase URL, or HTTP on localhost for local development.");
  return target;
}
