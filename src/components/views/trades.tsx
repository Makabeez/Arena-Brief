import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_TRADES, SWAP_MIN_USDC, VENUES } from "@/lib/arena";
import {
  isQualifying,
  qualifyingCount,
  useArenaStore,
  type Trade,
} from "@/lib/store";

export function TradesView() {
  const trades = useArenaStore((s) => s.trades);
  const addTrade = useArenaStore((s) => s.addTrade);
  const updateTrade = useArenaStore((s) => s.updateTrade);
  const removeTrade = useArenaStore((s) => s.removeTrade);
  const qualified = qualifyingCount(trades);
  const met = qualified >= MIN_TRADES;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-subtle">03 · Trades</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Blotter</h1>
        <p className="max-w-xl text-base leading-relaxed text-muted">
          Five qualifying fills from your Steve Agent wallet. Perps on Adrena or Phoenix count
          at any size. Jupiter and MagicBlock swaps need at least {SWAP_MIN_USDC} USDC.
        </p>
      </header>

      <section className="flex items-center justify-between gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-subtle">Qualifying</p>
          <p className="mt-1 font-display text-4xl tracking-tight tabular-nums">
            {qualified}
            <span className="text-subtle">/{MIN_TRADES}</span>
          </p>
        </div>
        <Badge variant={met ? "ok" : "default"}>{met ? "Gate closed" : "Gate open"}</Badge>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {VENUES.map((v) => (
          <div key={v.id} className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]">
            <p className="text-sm font-medium text-fg">{v.label}</p>
            <p className="mt-1 font-mono text-xs text-muted">{v.note}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">Fills</h2>
          <Button onClick={addTrade} size="sm">
            <Plus />
            Log a trade
          </Button>
        </div>

        {trades.length === 0 ? (
          <div className="rounded-xl bg-surface px-5 py-12 text-center shadow-[var(--shadow-border)]">
            <p className="font-display text-2xl tracking-tight">No fills yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
              Log a trade executed through your agent. Wash trading and self-dealing do not
              count.
            </p>
            <Button className="mt-6" onClick={addTrade}>
              <Plus />
              Log a trade
            </Button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {trades.map((trade, i) => (
              <TradeCard
                key={trade.id}
                index={i + 1}
                trade={trade}
                onChange={(patch) => updateTrade(trade.id, patch)}
                onRemove={() => removeTrade(trade.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TradeCard({
  index,
  trade,
  onChange,
  onRemove,
}: {
  index: number;
  trade: Trade;
  onChange: (patch: Partial<Omit<Trade, "id">>) => void;
  onRemove: () => void;
}) {
  const ok = isQualifying(trade);
  return (
    <li className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-subtle">
            {String(index).padStart(2, "0")}
          </span>
          <Badge variant={ok ? "ok" : "warn"}>{ok ? "Qualifies" : "Incomplete"}</Badge>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Remove trade">
          <Trash2 />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`venue-${trade.id}`}>Venue</Label>
          <select
            id={`venue-${trade.id}`}
            value={trade.venue}
            onChange={(e) => onChange({ venue: e.target.value as Trade["venue"] })}
            className="h-11 appearance-none rounded-md bg-inset px-3 text-sm text-fg shadow-[var(--shadow-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            {VENUES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`amt-${trade.id}`}>Size (USDC)</Label>
          <Input
            id={`amt-${trade.id}`}
            inputMode="decimal"
            placeholder="20"
            value={trade.amountUsd}
            onChange={(e) => onChange({ amountUsd: e.target.value })}
            className="font-mono tabular-nums"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`at-${trade.id}`}>Date</Label>
          <Input
            id={`at-${trade.id}`}
            type="date"
            value={trade.at}
            onChange={(e) => onChange({ at: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`sig-${trade.id}`}>Signature or tx</Label>
          <Input
            id={`sig-${trade.id}`}
            placeholder="On-chain proof"
            value={trade.signature}
            onChange={(e) => onChange({ signature: e.target.value })}
            className="font-mono"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`notes-${trade.id}`}>Notes</Label>
        <Input
          id={`notes-${trade.id}`}
          placeholder="Why this fill — setup, risk, outcome"
          value={trade.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </div>
    </li>
  );
}
