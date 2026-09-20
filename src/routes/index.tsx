import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { BriefView } from "@/components/views/brief";
import { DispatchView } from "@/components/views/dispatch";
import { OpsView } from "@/components/views/ops";
import { TradesView } from "@/components/views/trades";
import { Mark } from "@/components/mark";
import { useArenaStore } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const done = () => {
      if (alive) setReady(true);
    };
    const result = useArenaStore.persist.rehydrate();
    if (result && typeof result.then === "function") {
      result.then(done, done);
    } else {
      done();
    }
    return () => {
      alive = false;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg text-fg">
        <Mark className="size-10" />
        <p className="font-mono text-xs uppercase tracking-widest text-subtle">Opening the desk</p>
      </div>
    );
  }

  return <Desk />;
}

function Desk() {
  const view = useArenaStore((s) => s.view);

  return (
    <Shell>
      {view === "brief" ? <BriefView /> : null}
      {view === "ops" ? <OpsView /> : null}
      {view === "trades" ? <TradesView /> : null}
      {view === "dispatch" ? <DispatchView /> : null}
    </Shell>
  );
}
