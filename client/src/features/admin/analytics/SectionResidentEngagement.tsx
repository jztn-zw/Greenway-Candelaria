import React from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { registrationGrowth, residentActivity, reportsPerResident } from "./mockData";
import { Users, UserCheck, FileText, TrendingUp } from "lucide-react";

const barConfig = { registrations: { label: "New Registrations", color: "hsl(145, 63%, 32%)" } };

const SectionResidentEngagement: React.FC = () => {
  const activePercent = Math.round((residentActivity.active / residentActivity.total) * 100);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-3">
        {/* Registration Growth Chart */}
        <div className="lg:col-span-2 bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">New Resident Registrations per Month</h3>
              <p className="text-xs text-muted-foreground">Growth rate of verified community accounts</p>
            </div>
          </div>

          <ChartContainer config={barConfig} className="h-[240px] w-full aspect-auto">
            <BarChart data={registrationGrowth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="registrations" fill="var(--color-registrations)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        {/* Resident Stat Cards (3-tier layout) */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                Active Residents
              </span>
              <div className="w-8 h-8 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
              {activePercent}%
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {residentActivity.active.toLocaleString()} of {residentActivity.total.toLocaleString()} verified users
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                Reports per Resident
              </span>
              <div className="w-8 h-8 rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
              {reportsPerResident}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Average incident submissions per active user
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                Total Registrations
              </span>
              <div className="w-8 h-8 rounded-xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
              {residentActivity.total.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              Citizens onboarded across all 25 barangays
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionResidentEngagement;
