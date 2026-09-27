import { isSolanaAddress } from "./classify.ts";

/** Wallet from a `?wallet=` share link, or "" when absent or malformed. */
export function walletFromUrl(): string {
  if (typeof window === "undefined") return "";
  const w = new URLSearchParams(window.location.search).get("wallet") ?? "";
  return isSolanaAddress(w) ? w.trim() : "";
}
