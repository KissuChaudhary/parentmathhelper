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
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-semibold mb-2 text-zinc-900 tracking-tight">
        Help your child with math homework
      </h1>
      <p className="max-w-xl text-sm text-zinc-500">
        Built for parents of Grades 3-6 children who need help with fractions, division, decimals, and tricky word problems.
      </p>
      <div className="flex flex-wrap justify-center gap-4 mt-8 text-zinc-500">
        <SubjectIcon icon={<Pizza size={16} />} label="Fractions" />
        <SubjectIcon icon={<Calculator size={16} />} label="Long Division" />
        <SubjectIcon icon={<Clock3 size={16} />} label="Word Problems" />
        <SubjectIcon icon={<Coins size={16} />} label="Decimals" />
      </div>
    </div>
  );
}
