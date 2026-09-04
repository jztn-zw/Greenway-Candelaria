import { CalendarCheck, MapPin, Bell } from "lucide-react";
import { useStaggerReveal } from "@/hooks/useScrollReveal";

const cards = [
  { icon: CalendarCheck, title: "Schedule Tracking", desc: "Know exactly when your barangay's collection day is — updated in real time and always accurate." },
  { icon: MapPin, title: "Route Monitoring", desc: "Live truck tracking so you always know how close the collection crew is to your street." },
  { icon: Bell, title: "Instant Alerts", desc: "Get notified before your pickup day so you never miss a collection again." },
];

const ServicePreview = () => {
  const gridRef = useStaggerReveal(cards.length);

  return (
    <section className="py-20 bg-secondary/50">
      <div className="container">
        <div ref={gridRef} className="grid md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <div key={c.title} className="bg-card rounded-xl border p-8 space-y-4 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <c.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicePreview;
