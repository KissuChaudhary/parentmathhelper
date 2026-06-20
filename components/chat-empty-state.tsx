"use client";

import { Calculator, Clock3, Coins, Pizza } from "lucide-react";

function SubjectIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
      <div className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl group-hover:bg-zinc-100 group-hover:border-zinc-200 transition-all">
        <div className="text-zinc-500 group-hover:text-zinc-700 transition-colors">{icon}</div>
      </div>
      <span className="text-[11px] font-medium text-zinc-500 group-hover:text-zinc-700 transition-colors">{label}</span>
    </div>
  );
}

export function ChatEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
      <div className="mb-6 flex flex-col items-center">
        <img
          src="/pando.png"
          alt="Pando the math companion"
          className="w-28 h-28 rounded-full border-2 border-emerald-100 shadow-md object-contain bg-emerald-50/10 mb-4"
        />
        <h1 className="text-3xl font-semibold mb-2 text-zinc-900 tracking-tight flex items-center gap-2">
          Hi, I'm Pando! 🐼
        </h1>
        <p className="max-w-xl text-sm text-zinc-600 font-medium">
          I help parents explain K-5 math in ways kids understand.
        </p>
      </div>

      <div className="max-w-md w-full bg-zinc-50/40 border border-zinc-100 rounded-2xl p-5 mb-8 text-left space-y-3.5 shadow-sm">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">How we can practice together</h3>
        <div className="flex items-start gap-3 text-sm text-zinc-700">
          <span className="text-base leading-none">📷</span>
          <p><strong>Snap homework</strong> — Upload a worksheet photo or child's work</p>
        </div>
        <div className="flex items-start gap-3 text-sm text-zinc-700">
          <span className="text-base leading-none">🗣</span>
          <p><strong>Learn what to say</strong> — Get conversational, kitchen-table scripts</p>
        </div>
        <div className="flex items-start gap-3 text-sm text-zinc-700">
          <span className="text-base leading-none">🎲</span>
          <p><strong>Try together</strong> — Use coins, drawing, or household objects</p>
        </div>
        <div className="flex items-start gap-3 text-sm text-zinc-700">
          <span className="text-base leading-none">⭐</span>
          <p><strong>Celebrate progress</strong> — Praise the strategy, not just the answer</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 text-zinc-500">
        <SubjectIcon icon={<Pizza size={16} />} label="Fractions" />
        <SubjectIcon icon={<Calculator size={16} />} label="Long Division" />
        <SubjectIcon icon={<Clock3 size={16} />} label="Word Problems" />
        <SubjectIcon icon={<Coins size={16} />} label="Decimals" />
      </div>
    </div>
  );
}
