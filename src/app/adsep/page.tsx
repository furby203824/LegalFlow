"use client";

import AppShell from "@/components/ui/AppShell";
import { Lock } from "lucide-react";

export default function AdsepListPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="card px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-dark">ADSEP — Available Packages</h1>
        </div>

        <div className="card px-8 py-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-neutral-light">
              <Lock size={32} className="text-neutral-mid" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-neutral-dark mb-2">
            ADSEP Module — Coming Soon
          </h2>
          <p className="text-sm text-neutral-mid max-w-md mx-auto">
            Administrative Separation package management is under development.
            This module will support the full ADSEP workflow including Personnel Data,
            Separation Bases, Notification, and Tracking History.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <span className="badge bg-gray-100 text-gray-600 text-xs">Personnel Data</span>
            <span className="badge bg-gray-100 text-gray-600 text-xs">Separation Bases</span>
            <span className="badge bg-gray-100 text-gray-600 text-xs">Notification</span>
            <span className="badge bg-gray-100 text-gray-600 text-xs">Tracking History</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
