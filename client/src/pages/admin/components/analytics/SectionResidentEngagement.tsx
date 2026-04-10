import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { registrationGrowth, residentActivity, reportsPerResident } from "./mockData";
import { Users, UserCheck, FileText } from "lucide-react";

const barConfig = { registrations: { label: "New Registrations", color: "hsl(145, 63%, 32%)" } };

const StatCard = ({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) => (
  <Card className="flex flex-col items-center justify-center text-center p-6">
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
      <Icon className="w-6 h-6 text-primary" />
    </div>
    <p className="text-3xl font-bold text-foreground font-display">{value}</p>
    <p className="text-sm font-medium text-foreground mt-1">{label}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
  </Card>
);

const SectionResidentEngagement = () => {
  const activePercent = Math.round((residentActivity.active / residentActivity.total) * 100);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Registration growth chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">New Resident Registrations per Month</CardTitle>
            <p className="text-xs text-muted-foreground">Growth trend of the resident base</p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[220px] w-full aspect-auto">
              <BarChart data={registrationGrowth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="registrations" fill="var(--color-registrations)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Stat cards */}
        <div className="space-y-4">
          <StatCard
            icon={UserCheck}
            label="Active Residents"
            value={`${activePercent}%`}
            sub={`${residentActivity.active} of ${residentActivity.total} total`}
          />
          <StatCard
            icon={FileText}
            label="Reports per Resident"
            value={reportsPerResident.toString()}
            sub="Avg reports per active user"
          />
        </div>
      </div>
    </div>
  );
};

export default SectionResidentEngagement;
