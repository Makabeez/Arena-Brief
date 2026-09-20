export const APP_NAME = "Arena Brief";

export const CLOSE_AT = new Date("2026-10-01T21:59:00.000Z");
export const OPEN_AT = new Date("2026-09-02T00:00:00.000Z");
export const WINNERS_AT = new Date("2026-10-04T00:00:00.000Z");

export const XP_TARGET = 2000;
export const MIN_TRADES = 5;
export const SWAP_MIN_USDC = 20;
export const PRIZE_TOTAL = 500;

export const LINKS = {
  steve: "https://steve.oobeprotocol.ai",
  missions: "https://steve.oobeprotocol.ai/arena#agent/arena/missions",
  steveX: "https://x.com/SteveTheAgentAI",
  oobeX: "https://x.com/OOBEonSol",
  linktree: "https://linktr.ee/OOBE_Protocol",
} as const;

export const PRIZES = [
  { place: "01", title: "First", amount: 250 },
  { place: "02", title: "Second", amount: 150 },
  { place: "03", title: "Third", amount: 100 },
] as const;

export type GateId = "agent" | "xpost" | "xp" | "trades";

export const GATES: {
  id: GateId;
  num: string;
  title: string;
  detail: string;
  action: string;
}[] = [
  {
    id: "agent",
    num: "01",
    title: "Create your Steve",
    detail:
      "Sign in at steve.oobeprotocol.ai, finish onboarding, and set a handle, display name, and avatar.",
    action: "Open Steve",
  },
  {
    id: "xpost",
    num: "02",
    title: "Connect X and publish",
    detail:
      "Connect X and post publicly. Tag @SteveTheAgentAI and @OOBEonSol. Cover what you built, tools used, strategy, and what you learned.",
    action: "Write the post",
  },
  {
    id: "xp",
    num: "03",
    title: "Reach 2,000 Arena XP",
    detail:
      "XP comes from trading, Arena missions, social activity, and optional ecosystem actions. The Arena tracks it automatically.",
    action: "Log XP",
  },
  {
    id: "trades",
    num: "04",
    title: "Five qualifying trades",
    detail:
      "Adrena or Phoenix perps, or Jupiter / MagicBlock swaps of at least 20 USDC. From your agent wallet. No wash trading.",
    action: "Open blotter",
  },
];

export const JUDGING = [
  {
    id: "strategy",
    label: "Strategy & trading quality",
    weight: 30,
    hint: "Discipline, risk, consistent decisions, and use of market information.",
  },
  {
    id: "creative",
    label: "Creative use of Steve",
    weight: 30,
    hint: "Bots, automations, multiple protocols, MagicBlock, multi-tool workflows.",
  },
  {
    id: "arena",
    label: "Arena activity",
    weight: 20,
    hint: "XP beyond the floor, mission variety, ecosystem exploration, useful feedback.",
  },
  {
    id: "content",
    label: "Content & community",
    weight: 20,
    hint: "Original recaps, tutorials, experiments, and discoveries — not XP farming.",
  },
] as const;

export type VenueId = "adrena" | "phoenix" | "jupiter" | "magicblock";

export const VENUES: {
  id: VenueId;
  label: string;
  kind: "perp" | "swap";
  note: string;
}[] = [
  { id: "adrena", label: "Adrena perps", kind: "perp", note: "Any size qualifies" },
  { id: "phoenix", label: "Phoenix perps", kind: "perp", note: "Any size qualifies" },
  {
    id: "jupiter",
    label: "Jupiter swap",
    kind: "swap",
    note: `At least ${SWAP_MIN_USDC} USDC`,
  },
  {
    id: "magicblock",
    label: "MagicBlock swap",
    kind: "swap",
    note: `At least ${SWAP_MIN_USDC} USDC`,
  },
];

export type MissionId =
  | "sap"
  | "mb-swap"
  | "mb-transfer"
  | "feedback"
  | "waitlist"
  | "token"
  | "social";

export const MISSIONS: {
  id: MissionId;
  title: string;
  xp: number;
  once: boolean;
  detail: string;
}[] = [
  {
    id: "sap",
    title: "SAP Agent Registry",
    xp: 250,
    once: true,
    detail: "Register your Steve Agent through the SAP Agent Registry. Claim in Arena missions.",
  },
  {
    id: "mb-swap",
    title: "MagicBlock private swap",
    xp: 75,
    once: true,
    detail: "Run a private swap with Steve's MagicBlock tools, then claim the mission.",
  },
  {
    id: "mb-transfer",
    title: "MagicBlock private SPL transfer",
    xp: 75,
    once: true,
    detail: "Send a private SPL transfer, then claim the mission in the Arena.",
  },
  {
    id: "feedback",
    title: "Product feedback",
    xp: 250,
    once: true,
    detail:
      "What was useful, where it frictioned, what to add next, and whether you would use Steve daily.",
  },
  {
    id: "waitlist",
    title: "Steve Capital waitlist",
    xp: 250,
    once: true,
    detail: "Submit your email on the Steve Capital waitlist form. Product updates only.",
  },
  {
    id: "token",
    title: "Launch a token",
    xp: 350,
    once: true,
    detail:
      "Launch on the Steve launchpad, post on X tagging both accounts, and submit the token link or mint.",
  },
  {
    id: "social",
    title: "Social & creator",
    xp: 0,
    once: false,
    detail:
      "Trade recaps, strategy posts, original videos, tutorials, and other eligible creator missions.",
  },
];

export const TIMELINE = [
  { when: "2 Sep", label: "Competition opens" },
  { when: "1 Oct 21:59 UTC", label: "Window closes" },
  { when: "2–3 Oct", label: "Verification" },
  { when: "4 Oct", label: "Winners announced" },
] as const;

export const RULES = [
  "One participating agent per person.",
  "All qualifying and bonus activity must finish before the window closes.",
  "Wash trading, self-dealing, and artificial XP loops can be excluded.",
  "Trades must come from your Steve Agent wallet.",
  "Each listed ecosystem bonus can only be earned once per agent.",
  "Positive PnL is not required. Strategy, risk, and creative use of Steve are.",
] as const;

export const X_HANDLES = ["@SteveTheAgentAI", "@OOBEonSol"] as const;
