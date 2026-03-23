"use client";

import { useState } from "react";
import AppShell from "@/components/ui/AppShell";
import { ChevronUp, ChevronDown, Plus, Megaphone } from "lucide-react";

interface BroadcastMessage {
  id: string;
  date: string;
  message: string;
}

// Default broadcast messages — in a real system these would come from an API
const DEFAULT_BROADCASTS: BroadcastMessage[] = [
  {
    id: "1",
    date: "2026/03/23",
    message: "LegalFlow Suite v1.0 is now available. This system replaces the legacy CLA application for NJP case management. ADSEP module is under development.",
  },
  {
    id: "2",
    date: "2026/03/20",
    message: "Reminder: All NJP packages must be processed in accordance with MCO 5800.16 and JAGINST 5800.7G. Ensure all required signatures are obtained before routing packages.",
  },
  {
    id: "3",
    date: "2026/03/15",
    message: "System maintenance is scheduled for 2026/03/28 from 0200-0400 CST. Anticipate the application will be unavailable during this window.",
  },
];

export default function DashboardPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>(DEFAULT_BROADCASTS);
  const [broadcastSort, setBroadcastSort] = useState<"asc" | "desc">("desc");
  const [showAddBroadcast, setShowAddBroadcast] = useState(false);
  const [newBroadcastMsg, setNewBroadcastMsg] = useState("");

  const sortedBroadcasts = [...broadcasts].sort((a, b) =>
    broadcastSort === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  );

  function addBroadcast() {
    if (!newBroadcastMsg.trim()) return;
    const newMsg: BroadcastMessage = {
      id: Date.now().toString(),
      date: new Date().toISOString().slice(0, 10).replace(/-/g, "/"),
      message: newBroadcastMsg.trim(),
    };
    setBroadcasts([newMsg, ...broadcasts]);
    setNewBroadcastMsg("");
    setShowAddBroadcast(false);
  }

  return (
    <AppShell>
      <div className="space-y-4">
        {/* ── Broadcast Message Table — CLA main feature ── */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold text-neutral-dark flex items-center gap-2">
            <Megaphone size={20} className="text-primary" />
            View Broadcast Message Table
          </h1>
          <div className="text-xs text-neutral-mid">
            Currently sorted by: <strong>Broadcast Date</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <button
            onClick={() => setShowAddBroadcast(!showAddBroadcast)}
            className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"
          >
            <Plus size={12} /> Add Record
          </button>
        </div>

        {/* Add broadcast form */}
        {showAddBroadcast && (
          <div className="card p-4 border-primary/20">
            <div className="flex items-start gap-3">
              <textarea
                value={newBroadcastMsg}
                onChange={(e) => setNewBroadcastMsg(e.target.value)}
                placeholder="Enter broadcast message..."
                className="input-field flex-1 min-h-[80px] text-sm"
                maxLength={1000}
              />
              <div className="flex flex-col gap-1">
                <button onClick={addBroadcast} className="btn-primary text-xs py-1.5 px-3">Save</button>
                <button onClick={() => { setShowAddBroadcast(false); setNewBroadcastMsg(""); }} className="btn-ghost text-xs py-1.5 px-3">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast table */}
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-primary/20 bg-surface">
                <th className="text-left px-4 py-2.5 w-36">
                  <button
                    onClick={() => setBroadcastSort(broadcastSort === "desc" ? "asc" : "desc")}
                    className="flex items-center gap-1 font-semibold text-neutral-dark text-xs"
                  >
                    {broadcastSort === "desc" ? <ChevronDown size={12} className="text-accent" /> : <ChevronUp size={12} className="text-accent" />}
                    Broadcast Date
                  </button>
                </th>
                <th className="text-left px-4 py-2.5">
                  <span className="font-semibold text-neutral-dark text-xs">Broadcast Message</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedBroadcasts.map((msg) => (
                <tr key={msg.id} className="border-b border-border hover:bg-surface/50 align-top">
                  <td className="px-4 py-3 text-primary font-medium text-xs whitespace-nowrap">
                    {msg.date}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-dark whitespace-pre-wrap leading-relaxed">
                    {msg.message}
                  </td>
                </tr>
              ))}
              {sortedBroadcasts.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-neutral-mid text-sm">
                    No broadcast messages.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
