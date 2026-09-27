-- Arena Brief: on-chain verification cache.
--
-- Solana transactions are immutable once finalized, so each classified
-- signature is fetched from RPC exactly once and served from here after.
-- `arena_wallet` holds the last computed report per wallet so repeated
-- lookups of the same agent are cheap and a public leaderboard is possible.

create table if not exists arena_tx (
  signature   text primary key,
  wallet      text not null,
  slot        bigint not null,
  block_time  timestamptz,
  classified  jsonb not null,
  fetched_at  timestamptz not null default now()
);

create index if not exists arena_tx_wallet_slot on arena_tx (wallet, slot desc);

create table if not exists arena_wallet (
  wallet        text primary key,
  report        jsonb not null,
  refreshed_at  timestamptz not null default now(),
  lookups       integer not null default 1
);
