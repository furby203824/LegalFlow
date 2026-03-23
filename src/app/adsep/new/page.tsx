"use client";

import AppShell from "@/components/ui/AppShell";
import { Lock } from "lucide-react";
import Link from "next/link";

export default function AdsepNewPage() {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="card px-4 py-3">
          <h1 className="text-lg font-semibold text-neutral-dark">Initiate ADSEP Package</h1>
        </div>

        <div className="card px-8 py-16 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-neutral-light">
              <Lock size={32} className="text-neutral-mid" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-neutral-dark mb-2">
            Not Yet Available
          </h2>
          <p className="text-sm text-neutral-mid max-w-md mx-auto mb-6">
            ADSEP package initiation is under development. Use the NJP module for current case processing.
          </p>
          <Link href="/cases/new" className="btn-primary">
            Go to NJP — Initiate Package
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
