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

/**
 * Phoenix Perps ("Phoenix Eternal") instruction discriminators — the first 8
 * bytes of instruction data — from Ellipsis Labs' published SDK catalogue
 * (github.com/Ellipsis-Labs/rise-public, instructions.json). The program logs
 * no instruction name for most calls, so the data bytes are the only reliable
 * way to tell an order from account setup or collateral moves.
 */
export const PHOENIX_OPS: Record<string, string> = {
  "5a76c0fcc0632791": "PlaceMarketOrder",
  a02315eb6eb6f541: "PlaceMarketOrderDelegated",
  "6cb021ba92e501c5": "PlaceLimitOrder",
  "5f2d44a8e8dad25c": "PlaceLimitOrderWithConditionals",
  ecd0ddac8de28154: "PlaceMultiLimitOrder",
  "008c56c54626e5ad": "PlaceTwapOrder",
  "4bf3e0a701053320": "RegisterTrader",
  cfaa111535235897: "OnboardTraderDelegated",
  ca2734d33514fa58: "DepositFunds",
  f1241d6fd01f68d9: "WithdrawFunds",
  "9da33f1bf248fb61": "TransferCollateral",
  "3364b1738b87f78b": "TransferCollateralChildToParent",
  f223c68952e1f2b6: "EmberDeposit",
  b712469c946da122: "EmberWithdraw",
  "62bf4bdc732847ed": "CancelAll",
  eacc7e5ede168d18: "CancelOrdersById",
  "1ad1f4fd3bafe336": "CancelUpTo",
  ec2ea442eb5ca289: "PlaceStopLoss",
  "78c90a660c096f7e": "CancelStopLoss",
  "2b7588804896657a": "PlaceAttachedConditionalOrder",
  "416c53814cc15c8f": "PlacePositionConditionalOrder",
};

/** `ProxyInstruction` wraps another instruction: its own 8 bytes, then the inner one. */
export const PHOENIX_PROXY = "189a38686a082307";
/** Same, with 9 bytes of fee-override arguments before the inner instruction. */
export const PHOENIX_PROXY_FEE = "e1ed657f8611a744";

export const PHOENIX_ORDER_OPS: ReadonlySet<string> = new Set([
  "PlaceMarketOrder",
  "PlaceMarketOrderDelegated",
  "PlaceLimitOrder",
  "PlaceLimitOrderWithConditionals",
  "PlaceMultiLimitOrder",
  "PlaceTwapOrder",
]);

export const PHOENIX_COLLATERAL_OPS: ReadonlySet<string> = new Set([
  "DepositFunds",
  "WithdrawFunds",
  "TransferCollateral",
  "TransferCollateralChildToParent",
  "EmberDeposit",
  "EmberWithdraw",
]);
