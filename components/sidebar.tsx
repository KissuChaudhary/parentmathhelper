"use client";

import { useState } from "react";
import { MessageSquare, Calculator, LayoutGrid, Clock, ChevronDown, Plus, Edit, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [isRecentOpen, setIsRecentOpen] = useState(true);

  return (
    <div className="hidden md:flex w-64 h-screen bg-zinc-50/50 border-r border-zinc-200 flex-col flex-shrink-0">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-lg text-zinc-900">
          <div className="bg-blue-600 text-white p-1 rounded-md shadow-sm">
            <MessageSquare size={18} />
          </div>
          AIuestion
        </div>
        <button className="p-1.5 hover:bg-zinc-200/50 rounded-md transition-colors">
          <Edit size={16} className="text-zinc-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-0.5 px-3">
          <NavItem icon={<MessageSquare size={18} />} label="Ask AI" active />
          <NavItem icon={<Calculator size={18} />} label="Calculator" />
          <NavItem 
            icon={<LayoutGrid size={18} />} 
            label="Apps" 
            badge="1" 
          />
        </nav>

        <div className="mt-8">
          <button 
            onClick={() => setIsRecentOpen(!isRecentOpen)}
            className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock size={14} />
              Recent Chat
            </div>
            <ChevronDown size={14} className={cn("transition-transform", isRecentOpen ? "rotate-180" : "")} />
          </button>
          
          {isRecentOpen && (
            <div className="mt-1 space-y-0.5 px-3">
              <div className="px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-md cursor-pointer truncate transition-colors">
                Quadratic Equation Solutio...
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-200">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-200 text-center">
          <h4 className="font-semibold text-sm mb-1 text-zinc-900">Question AI extension</h4>
          <p className="text-xs text-zinc-500 mb-3">Screenshot a question on any website and get answers immediately.</p>
          <button className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors shadow-sm">
            Install Now
          </button>
        </div>
        <div className="flex justify-center gap-3 mt-4 text-zinc-400">
          <button className="hover:text-zinc-600 transition-colors"><div className="w-7 h-7 rounded-full bg-zinc-200/50 flex items-center justify-center border border-zinc-200"><span className="text-xs font-medium text-zinc-600">G</span></div></button>
          <button className="hover:text-zinc-600 transition-colors"><div className="w-7 h-7 rounded-full bg-zinc-200/50 flex items-center justify-center border border-zinc-200"><span className="text-xs font-medium text-zinc-600">A</span></div></button>
          <button className="hover:text-zinc-600 transition-colors"><div className="w-7 h-7 rounded-full bg-zinc-200/50 flex items-center justify-center border border-zinc-200"><span className="text-xs font-medium text-zinc-600">W</span></div></button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, badge }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string }) {
  return (
    <button className={cn(
      "flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium transition-colors",
      active ? "bg-blue-50 text-blue-600" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
    )}>
      <div className="flex items-center gap-3">
        {icon}
        {label}
      </div>
      {badge && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}
