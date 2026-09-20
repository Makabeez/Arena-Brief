import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CLOSE_AT,
  MIN_TRADES,
  SWAP_MIN_USDC,
  XP_TARGET,
  type GateId,
  type MissionId,
  type VenueId,
} from "@/lib/arena";

export type ViewId = "brief" | "ops" | "trades" | "dispatch";

export type Trade = {
  id: string;
  venue: VenueId;
  amountUsd: string;
  signature: string;
  notes: string;
  at: string;
};

export type Scores = {
  strategy: number;
  creative: number;
  arena: number;
  content: number;
};

export type StrategyNotes = {
  thesis: string;
  tools: string;
  risk: string;
  creative: string;
  content: string;
};

export type ArenaData = {
  view: ViewId;
  handle: string;
  displayName: string;
  agentCreated: boolean;
  xConnected: boolean;
  xPostUrl: string;
  xp: number;
  trades: Trade[];
  missions: Record<MissionId, { done: boolean; proof: string }>;
  strategy: StrategyNotes;
  scores: Scores;
  xDraft: string;
  submissionNotes: string;
};

export type ArenaSnapshot = ArenaData;

type ArenaActions = {
  setView: (view: ViewId) => void;
  setHandle: (handle: string) => void;
  setDisplayName: (displayName: string) => void;
  setAgentCreated: (agentCreated: boolean) => void;
  setXConnected: (xConnected: boolean) => void;
  setXPostUrl: (xPostUrl: string) => void;
  setXp: (xp: number) => void;
  addTrade: () => void;
  updateTrade: (id: string, patch: Partial<Omit<Trade, "id">>) => void;
  removeTrade: (id: string) => void;
  setMission: (id: MissionId, patch: Partial<{ done: boolean; proof: string }>) => void;
  setStrategy: (patch: Partial<StrategyNotes>) => void;
  setScore: (key: keyof Scores, value: number) => void;
  setXDraft: (xDraft: string) => void;
  setSubmissionNotes: (submissionNotes: string) => void;
  importData: (data: Partial<ArenaData>) => void;
  reset: () => void;
};

export type ArenaState = ArenaData & ArenaActions;

const emptyMissions = (): ArenaData["missions"] => ({
  sap: { done: false, proof: "" },
  "mb-swap": { done: false, proof: "" },
  "mb-transfer": { done: false, proof: "" },
  feedback: { done: false, proof: "" },
  waitlist: { done: false, proof: "" },
  token: { done: false, proof: "" },
  social: { done: false, proof: "" },
});

export const defaultData = (): ArenaData => ({
  view: "brief",
  handle: "",
  displayName: "",
  agentCreated: false,
  xConnected: false,
  xPostUrl: "",
  xp: 0,
  trades: [],
  missions: emptyMissions(),
  strategy: {
    thesis: "",
    tools: "",
    risk: "",
    creative: "",
    content: "",
  },
  scores: {
    strategy: 3,
    creative: 3,
    arena: 3,
    content: 3,
  },
  xDraft: "",
  submissionNotes: "",
});

export function isQualifying(trade: Trade): boolean {
  const hasProof = Boolean(trade.signature.trim() || trade.notes.trim());
  if (!hasProof) return false;
  if (trade.venue === "adrena" || trade.venue === "phoenix") return true;
  const n = Number.parseFloat(trade.amountUsd);
  return Number.isFinite(n) && n >= SWAP_MIN_USDC;
}

export function qualifyingCount(trades: Trade[]): number {
  return trades.filter(isQualifying).length;
}

export function isXPostUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  if (!t) return false;
  return t.includes("x.com/") || t.includes("twitter.com/");
}

export function gateStatus(data: Pick<
  ArenaData,
  "agentCreated" | "xConnected" | "xPostUrl" | "xp" | "trades"
>): Record<GateId, boolean> {
  return {
    agent: data.agentCreated,
    xpost: data.xConnected && isXPostUrl(data.xPostUrl),
    xp: data.xp >= XP_TARGET,
    trades: qualifyingCount(data.trades) >= MIN_TRADES,
  };
}

export function closedGateCount(data: Parameters<typeof gateStatus>[0]): number {
  return Object.values(gateStatus(data)).filter(Boolean).length;
}

export function isEligible(data: Parameters<typeof gateStatus>[0]): boolean {
  return closedGateCount(data) === 4;
}

export function remainingMs(now = Date.now()): number {
  return Math.max(0, CLOSE_AT.getTime() - now);
}

export function splitDuration(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, closed: ms <= 0 };
}

export function weightedSelfScore(scores: Scores): number {
  return Math.round(
    scores.strategy * 0.3 + scores.creative * 0.3 + scores.arena * 0.2 + scores.content * 0.2,
  );
}

export function composeXDraft(data: ArenaData): string {
  const name = data.handle.trim() || data.displayName.trim() || "my Steve Agent";
  const lines = [
    `I built ${name} for the Steve Agent Arena.`,
    "",
    data.strategy.thesis.trim() || "What it does: autonomous work across Solana — trading, tools, and execution.",
    data.strategy.tools.trim() ? `Tools / protocols: ${data.strategy.tools.trim()}` : "",
    data.strategy.risk.trim() ? `Strategy: ${data.strategy.risk.trim()}` : "",
    data.strategy.creative.trim() || "",
    data.strategy.content.trim() || "",
    "",
    "What I tested and learned is in the thread.",
    "",
    "@SteveTheAgentAI @OOBEonSol",
  ];
  return lines.filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");
}

export function composeSubmission(data: ArenaData): string {
  const name = data.handle.trim() || "—";
  const url = data.xPostUrl.trim() || "—";
  const desc =
    data.submissionNotes.trim() ||
    [
      data.strategy.thesis.trim(),
      data.strategy.tools.trim() && `Tools: ${data.strategy.tools.trim()}`,
      data.strategy.risk.trim() && `Approach: ${data.strategy.risk.trim()}`,
      data.strategy.creative.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

  return [
    `Steve Agent handle: ${name}`,
    `X post: ${url}`,
    "",
    "Description:",
    desc || "—",
  ].join("\n");
}

const DATA_KEYS: (keyof ArenaData)[] = [
  "view",
  "handle",
  "displayName",
  "agentCreated",
  "xConnected",
  "xPostUrl",
  "xp",
  "trades",
  "missions",
  "strategy",
  "scores",
  "xDraft",
  "submissionNotes",
];

export const useArenaStore = create<ArenaState>()(
  persist(
    (set) => ({
      ...defaultData(),
      setView: (view) => set({ view }),
      setHandle: (handle) => set({ handle }),
      setDisplayName: (displayName) => set({ displayName }),
      setAgentCreated: (agentCreated) => set({ agentCreated }),
      setXConnected: (xConnected) => set({ xConnected }),
      setXPostUrl: (xPostUrl) => set({ xPostUrl }),
      setXp: (xp) => set({ xp: Number.isFinite(xp) ? Math.max(0, Math.round(xp)) : 0 }),
      addTrade: () =>
        set((s) => ({
          trades: [
            ...s.trades,
            {
              id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `t-${Date.now()}`,
              venue: "jupiter",
              amountUsd: "20",
              signature: "",
              notes: "",
              at: new Date().toISOString().slice(0, 10),
            },
          ],
        })),
      updateTrade: (id, patch) =>
        set((s) => ({
          trades: s.trades.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTrade: (id) => set((s) => ({ trades: s.trades.filter((t) => t.id !== id) })),
      setMission: (id, patch) =>
        set((s) => ({
          missions: {
            ...s.missions,
            [id]: { ...s.missions[id], ...patch },
          },
        })),
      setStrategy: (patch) => set((s) => ({ strategy: { ...s.strategy, ...patch } })),
      setScore: (key, value) =>
        set((s) => ({
          scores: { ...s.scores, [key]: Math.min(5, Math.max(1, value)) },
        })),
      setXDraft: (xDraft) => set({ xDraft }),
      setSubmissionNotes: (submissionNotes) => set({ submissionNotes }),
      importData: (data) =>
        set((s) => ({
          ...s,
          ...data,
          missions: { ...s.missions, ...data.missions },
          strategy: { ...s.strategy, ...data.strategy },
          scores: { ...s.scores, ...data.scores },
        })),
      reset: () => set(defaultData()),
    }),
    {
      name: "arena-brief-v1",
      skipHydration: true,
      partialize: (state) => {
        const out = {} as ArenaData;
        for (const key of DATA_KEYS) {
          out[key] = state[key] as never;
        }
        return out as ArenaState;
      },
    },
  ),
);
