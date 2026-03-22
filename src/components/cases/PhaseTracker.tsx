"use client";

import { cn } from "@/lib/utils";

const PHASES = [
  { key: "INITIATION", label: "Init", num: 1 },
  { key: "RIGHTS_ADVISEMENT", label: "Rights", num: 2 },
  { key: "HEARING", label: "Hearing", num: 3 },
  { key: "NOTIFICATION", label: "Notice", num: 4 },
  { key: "APPEAL", label: "Appeal", num: 5 },
  { key: "REMEDIAL_ACTION", label: "Remedial", num: 6 },
  { key: "ADMIN_COMPLETION", label: "Admin", num: 7 },
  { key: "VACATION", label: "Vacation", num: 8 },
];

export default function PhaseTracker({
  currentPhase,
  status,
}: {
  currentPhase: string;
  status: string;
}) {
  const currentIdx = PHASES.findIndex((p) => p.key === currentPhase);
  const isClosed = status.startsWith("CLOSED") || status === "DESTROYED" || currentPhase === "CLOSED";
  const isReferred = status === "REFERRED_COURT_MARTIAL";

  return (
    <div className="card px-4 py-3">
      <div className="flex items-center">
        {PHASES.map((phase, idx) => {
          let state: "completed" | "current" | "pending" = "pending";
          if (isClosed) {
            state = "completed";
          } else if (isReferred) {
            state = idx <= 1 ? "completed" : "pending";
          } else if (idx < currentIdx) {
            state = "completed";
          } else if (idx === currentIdx) {
            state = "current";
          }

          return (
            <div key={phase.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                    state === "completed" && "bg-success text-white",
                    state === "current" && "bg-secondary text-white ring-2 ring-secondary/30",
                    state === "pending" && "bg-neutral-light text-neutral-mid"
                  )}
                >
                  {state === "completed" ? "\u2713" : phase.num}
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1 whitespace-nowrap",
                    state === "current" ? "font-semibold text-secondary" : "text-neutral-mid"
                  )}
                >
                  {phase.label}
                </span>
              </div>
              {idx < PHASES.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1",
                    (idx < currentIdx || isClosed) ? "bg-success" : "bg-neutral-light"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
