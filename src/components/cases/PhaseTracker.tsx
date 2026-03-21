"use client";

const PHASES = [
  { key: "INITIATION", label: "Initiation", num: 1 },
  { key: "RIGHTS_ADVISEMENT", label: "Rights Advisement", num: 2 },
  { key: "HEARING", label: "Hearing", num: 3 },
  { key: "NOTIFICATION", label: "Notification", num: 4 },
  { key: "APPEAL", label: "Appeal", num: 5 },
  { key: "ADMIN_COMPLETION", label: "Admin Completion", num: 7 },
];

export default function PhaseTracker({
  currentPhase,
  status,
}: {
  currentPhase: string;
  status: string;
}) {
  const currentIdx = PHASES.findIndex((p) => p.key === currentPhase);
  const isClosed = status.startsWith("CLOSED") || status === "DESTROYED";
  const isReferred = status === "REFERRED_COURT_MARTIAL";

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
      <div className="flex items-center justify-between">
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
            <div key={phase.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    state === "completed"
                      ? "bg-green-600 text-white"
                      : state === "current"
                      ? "bg-[var(--color-navy)] text-white ring-4 ring-blue-200"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {state === "completed" ? "\u2713" : phase.num}
                </div>
                <span
                  className={`text-xs mt-1 text-center ${
                    state === "current"
                      ? "font-bold text-[var(--color-navy)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {phase.label}
                </span>
              </div>
              {idx < PHASES.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 ${
                    idx < currentIdx || isClosed
                      ? "bg-green-600"
                      : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
