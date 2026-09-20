# Arena Brief

Field desk for the [Steve Agent Arena](https://steve.oobeprotocol.ai) Superteam bounty.

Track the four eligibility gates, Arena XP, qualifying Solana trades, and pack the Superteam Earn submission — handle, X post, and strategy — before the window closes on **1 Oct 2026, 21:59 UTC**.

## What it does

- **Brief** — countdown, four gates, judging weights (30 / 30 / 20 / 20), 500 USDC purse, timeline, rules
- **Ops** — Steve handle, XP vs the 2,000 floor, bonus missions (SAP, MagicBlock, feedback, waitlist, token launch)
- **Trades** — blotter for Adrena / Phoenix perps and Jupiter / MagicBlock swaps (≥ 20 USDC)
- **Dispatch** — strategy notes, self-score, X draft tagging [@SteveTheAgentAI](https://x.com/SteveTheAgentAI) and [@OOBEonSol](https://x.com/OOBEonSol), Superteam pack to copy

State lives in the browser (`localStorage`). Export / import a JSON snapshot from Ops.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints. Production build:

```bash
npm run build
npm run preview
```

## Stack

React 19, TanStack Start, Tailwind v4, Zustand.

Not affiliated with OOBE Protocol. Companion tracker for the Arena — trades still execute through your Steve Agent wallet.
