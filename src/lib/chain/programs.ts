/**
 * Solana program IDs the Arena counts, verified against live mainnet traffic on
 * 27 Sep 2026 (getSignaturesForAddress on each program):
 *
 *   Jupiter v6 aggregator   active (seconds)
 *   Jupiter order engine    active (seconds)
 *   Phoenix Perpetuals      active (seconds) — distinct from Phoenix spot
 *   MagicBlock e-SPL        active (hours)   — private transfers / private swaps
 *   Adrena                  last tx ~28h old, staking only — protocol is winding down
 */
export const PROGRAMS = {
  jupiter: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  jupiterOrderEngine: "61DFfeTKM7trxYcPQCM78bJ794ddZprZpAwAnLiwTpYH",
  phoenixPerps: "EtrnLzgbS7nMMy5fbD42kXiUzGg8XQzJ972Xtk1cjWih",
  phoenixSpot: "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY",
  magicblockSpl: "SPLxh1LVZzEkX99H6rqYizhytLWPZVV296zyYDPagv2",
  magicblockDelegation: "DELeGGvXpWV2fqAUDtcfFFJRgc3ea5kzJ9EpvaEXF46s",
  adrena: "13gDzEXCdocbj8iAiqrScGo47NiSuYENGsRqi3SEAwet",
} as const;

export const MINTS = {
  usdc: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  usdt: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  wsol: "So11111111111111111111111111111111111111112",
} as const;

export const STABLE_MINTS: ReadonlySet<string> = new Set([MINTS.usdc, MINTS.usdt]);

/** Rent for one token account; SOL→token swaps often create the destination ATA. */
export const ATA_RENT_SOL = 0.00203928;
