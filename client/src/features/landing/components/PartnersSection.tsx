import { Button } from "@/components/ui/button";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollReveal";

const partners = ["LGU Candelaria", "MENRO", "Barangay Council", "DILG Region IV-A", "DENR Quezon", "PhilHealth Local"];
const stats = [
  { value: "63", label: "Barangays", sub: "Covered in Candelaria" },
  { value: "98%", label: "On-time", sub: "Collection rate" },
  { value: "40%", label: "Reduction", sub: "In missed pickups" },
  { value: "12K+", label: "Households", sub: "Registered" },
];

const PartnersSection = () => {
  const topRef = useScrollReveal();
  const statsRef = useStaggerReveal(stats.length);

  return (
    <section id="partners" className="py-20">
      <div className="container space-y-16">
        <div ref={topRef} className="text-center space-y-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Trusted Partners & Stakeholders</span>
          <div className="flex flex-wrap justify-center gap-4">
            {partners.map((p) => (
              <span key={p} className="px-5 py-2.5 rounded-full border bg-card text-sm font-medium hover:border-primary/30 transition-all duration-300">{p}</span>
            ))}
          </div>
        </div>

        <div className="bg-forest rounded-2xl p-10 lg:p-14 text-forest-foreground">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <span className="text-xs font-semibold uppercase tracking-widest opacity-80">By the Numbers</span>
            <h2 className="text-3xl sm:text-4xl font-bold">GreenWay Is Built on Real Community Impact</h2>
          </div>
          <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
            {stats.map((s) => (
              <div key={s.label} className="text-center space-y-1">
                <div className="text-4xl lg:text-5xl font-bold font-display">{s.value}</div>
                <div className="text-sm font-semibold opacity-90">{s.label}</div>
                <div className="text-xs opacity-70">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Button variant="secondary" size="lg">Start Tracking</Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
