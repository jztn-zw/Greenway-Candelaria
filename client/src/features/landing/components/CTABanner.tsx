import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const CTABanner = () => {
  const ref = useScrollReveal();

  return (
    <section className="py-20">
      <div className="container">
        <div ref={ref} className="bg-forest rounded-3xl p-6 sm:p-8 lg:p-10 text-forest-foreground text-center space-y-6 relative overflow-hidden">

          <h2 className="gw-heading text-3xl sm:text-4xl max-w-xl mx-auto relative">Ready to build a cleaner Candelaria?</h2>
          <p className="text-sm opacity-80 max-w-lg mx-auto relative">
            Join GreenWay and help your community take the next step toward smarter, more sustainable waste management.
          </p>
          <div className="flex flex-wrap justify-center gap-3 relative">
            <Button variant="inverse-outline" size="lg" className="gap-2 shadow-xl">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="inverse-outline" size="lg" className="border">
              Explore Features
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTABanner;
