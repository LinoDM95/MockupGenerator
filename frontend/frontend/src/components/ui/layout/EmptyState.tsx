import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  desc: string;
  icon: LucideIcon;
  action?: ReactNode;
};

export const EmptyState = ({ title, desc, icon: Icon, action }: Props) => (
  <div className="flex flex-col items-center justify-center py-16 text-center sm:py-20">
    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[2.5rem] bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5">
      <Icon size={32} className="text-slate-300" strokeWidth={1.5} aria-hidden />
    </div>
    <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
    <p className="mt-2 max-w-xs text-sm font-medium leading-relaxed text-slate-500">{desc}</p>
    {action ? <div className="mt-8 w-full max-w-md">{action}</div> : null}
  </div>
);
