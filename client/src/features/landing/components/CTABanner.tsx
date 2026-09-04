import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const CTABanner = () => {
  const ref = useScrollReveal();

  return (
    <section className="py-20">
      <div className="container">
        <div ref={ref} className="bg-gradient-to-br from-[hsl(var(--forest))] via-[hsl(var(--accent))] to-[hsl(var(--canopy))] rounded-3xl p-10 lg:p-16 text-forest-foreground text-center space-y-6 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-48 h-48 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

          <h2 className="text-3xl sm:text-4xl font-bold max-w-xl mx-auto relative">Ready to build a cleaner Candelaria?</h2>
          <p className="text-sm opacity-80 max-w-lg mx-auto relative">
            Join GreenWay and help your community take the next step toward smarter, more sustainable waste management.
          </p>
          <div className="flex flex-wrap justify-center gap-3 relative">
            <Button variant="secondary" size="lg" className="gap-2 shadow-xl">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="lg" className="text-forest-foreground border border-forest-foreground/30 hover:bg-forest-foreground/10">
              Explore Features
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
