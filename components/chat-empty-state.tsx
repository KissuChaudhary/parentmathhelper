"use client";

import { Calculator, FlaskConical, Dna, FunctionSquare } from "lucide-react";

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
        How can I help you today?
      </h1>
      <div className="flex flex-wrap justify-center gap-4 mt-8 text-zinc-500">
        <SubjectIcon icon={<FunctionSquare size={16} />} label="Math" />
        <SubjectIcon icon={<Calculator size={16} />} label="Calculus" />
        <SubjectIcon icon={<FlaskConical size={16} />} label="Chemistry" />
        <SubjectIcon icon={<Dna size={16} />} label="Biology" />
      </div>
    </div>
  );
}
