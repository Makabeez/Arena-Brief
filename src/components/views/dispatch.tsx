import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JUDGING, LINKS, X_HANDLES } from "@/lib/arena";
import {
  composeSubmission,
  composeXDraft,
  isXPostUrl,
  useArenaStore,
  weightedSelfScore,
  type Scores,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const NOTE_FIELDS: {
  key: "thesis" | "tools" | "risk" | "creative" | "content";
  title: string;
  hint: string;
}[] = [
  {
    key: "thesis",
    title: "What the agent is for",
    hint: "One or two sentences a judge can quote. Mandate, market, time horizon.",
  },
  {
    key: "tools",
    title: "Tools and protocols",
    hint: "Steve Bots, automations, Jupiter, Adrena, Phoenix, MagicBlock, SAP — be specific.",
  },
  {
    key: "risk",
    title: "Strategy and risk",
    hint: "How it decides, position sizing, when it stands down. Consistency over heroics.",
  },
  {
    key: "creative",
    title: "Creative use of Steve",
    hint: "The workflow that is not a single swap. Multi-tool, private rails, missions chained.",
  },
  {
    key: "content",
    title: "What you will publish",
    hint: "Recap, tutorial, experiment, or video. Original and useful beats volume.",
  },
];

export function DispatchView() {
  const strategy = useArenaStore((s) => s.strategy);
  const setStrategy = useArenaStore((s) => s.setStrategy);
  const scores = useArenaStore((s) => s.scores);
  const setScore = useArenaStore((s) => s.setScore);
  const xDraft = useArenaStore((s) => s.xDraft);
  const setXDraft = useArenaStore((s) => s.setXDraft);
  const xPostUrl = useArenaStore((s) => s.xPostUrl);
  const setXPostUrl = useArenaStore((s) => s.setXPostUrl);
  const xConnected = useArenaStore((s) => s.xConnected);
  const submissionNotes = useArenaStore((s) => s.submissionNotes);
  const setSubmissionNotes = useArenaStore((s) => s.setSubmissionNotes);
  const handle = useArenaStore((s) => s.handle);
  const state = useArenaStore();

  const self = weightedSelfScore(scores);
  const postOk = xConnected && isXPostUrl(xPostUrl);
  const tagged = X_HANDLES.every((h) => xDraft.toLowerCase().includes(h.toLowerCase()));
  const chars = xDraft.length;
  const pack = composeSubmission(state);

  async function copy(text: string, ok: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(ok);
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-subtle">04 · Dispatch</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Write it so it judges</h1>
        <p className="max-w-xl text-base leading-relaxed text-muted">
          Strategy notes, the required X post, and a Superteam pack: handle, post link, short
          description. Tag both accounts.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl tracking-tight">Field notes</h2>
        {NOTE_FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-2">
            <Label htmlFor={f.key}>{f.title}</Label>
            <Textarea
              id={f.key}
              value={strategy[f.key]}
              onChange={(e) => setStrategy({ [f.key]: e.target.value })}
              placeholder={f.hint}
            />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">Self-score</h2>
          <p className="font-display text-3xl tracking-tight tabular-nums">
            {self}
            <span className="text-lg text-subtle">/5</span>
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Weighted like the judges. Honest gaps are more useful than a full board.
        </p>
        <ul className="flex flex-col gap-5">
          {JUDGING.map((j) => {
            const key = j.id as keyof Scores;
            const value = scores[key];
            return (
              <li key={j.id} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor={`score-${j.id}`}>
                    {j.label}
                    <span className="ml-2 font-mono text-xs text-subtle">{j.weight}%</span>
                  </Label>
                  <span className="font-mono text-xs tabular-nums text-muted">{value}/5</span>
                </div>
                <input
                  id={`score-${j.id}`}
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={value}
                  onChange={(e) => setScore(key, Number(e.target.value))}
                  className="h-11 w-full accent-accent"
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">Required X post</h2>
          <Badge variant={postOk ? "ok" : "default"}>{postOk ? "Link logged" : "Link needed"}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Cover what you created the agent to do, which workflows you used, your approach, and
          what you tested. Screenshots and tx links help. Follow and tag {X_HANDLES.join(" and ")}.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => setXDraft(composeXDraft(useArenaStore.getState()))}
          >
            Draft from notes
          </Button>
          <Button variant="outline" onClick={() => copy(xDraft, "Draft copied")} disabled={!xDraft}>
            Copy draft
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(xDraft || " @SteveTheAgentAI @OOBEonSol")}`}
              target="_blank"
              rel="noreferrer"
            >
              Open X composer
            </a>
          </Button>
        </div>
        <Textarea
          value={xDraft}
          onChange={(e) => setXDraft(e.target.value)}
          placeholder="The public post. Both tags must appear."
          className="min-h-44 font-sans"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={cn("font-mono text-xs tabular-nums", chars > 280 ? "text-warn" : "text-subtle")}>
            {chars} chars{chars > 280 ? " · split into a thread if needed" : ""}
          </p>
          <p className={cn("font-mono text-xs", tagged ? "text-ok" : "text-warn")}>
            {tagged ? "Both tags present" : "Missing a required tag"}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="xurl">Published post URL</Label>
          <Input
            id="xurl"
            placeholder="https://x.com/you/status/…"
            value={xPostUrl}
            onChange={(e) => setXPostUrl(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a
            className="text-muted underline decoration-line-strong underline-offset-4 hover:text-fg"
            href={LINKS.steveX}
            target="_blank"
            rel="noreferrer"
          >
            @SteveTheAgentAI
          </a>
          <a
            className="text-muted underline decoration-line-strong underline-offset-4 hover:text-fg"
            href={LINKS.oobeX}
            target="_blank"
            rel="noreferrer"
          >
            @OOBEonSol
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-2xl tracking-tight">Superteam pack</h2>
        <p className="text-sm leading-relaxed text-muted">
          Handle, required X post, and a short description of the agent and strategy. XP and
          trades are verified by OOBE through the Arena.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sub">Description override</Label>
          <Textarea
            id="sub"
            value={submissionNotes}
            onChange={(e) => setSubmissionNotes(e.target.value)}
            placeholder="Leave blank to build this from your field notes."
          />
        </div>
        <pre className="overflow-x-auto rounded-md bg-inset p-4 font-mono text-xs leading-relaxed text-muted whitespace-pre-wrap shadow-[var(--shadow-border)]">
          {pack}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => copy(pack, "Submission copied")}>Copy pack</Button>
          <p className="self-center font-mono text-xs text-subtle">
            Handle: {handle.trim() || "not set"}
          </p>
        </div>
      </section>
    </div>
  );
}
