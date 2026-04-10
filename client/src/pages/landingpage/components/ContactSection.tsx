import { Button } from "@/components/ui/button";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ContactContent, DEFAULT_CONTENT } from "@/pages/admin/components/landingmanager/types";

interface ContactSectionProps {
  content?: ContactContent;
}

const ContactSection = ({ content = DEFAULT_CONTENT.contact }: ContactSectionProps) => {
  const leftRef = useScrollReveal();
  const rightRef = useScrollReveal<HTMLFormElement>({ rootMargin: "0px 0px -60px 0px" });
  const contactItems = [
    { icon: MapPin, text: content.address },
    { icon: Phone, text: content.phone },
    { icon: Mail, text: content.email },
    { icon: Clock, text: content.hours },
  ];

  return (
    <section id="contact" className="py-10 sm:py-16 lg:py-20 bg-gradient-to-b from-secondary/50 to-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          <div ref={leftRef} className="space-y-4 sm:space-y-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <span className="w-8 h-px bg-primary" />
              {content.sectionLabel}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-pre-line">{content.heading}</h2>
            <p className="text-muted-foreground">
              Have questions or need help? Reach out and we&apos;ll get back to you as soon as possible.
            </p>
            <div className="space-y-4 text-sm">
              {contactItems.map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-muted-foreground group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors duration-300">
                    <item.icon className="w-4 h-4 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                  </div>
                  <span className="group-hover:text-foreground transition-colors duration-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <form ref={rightRef} className="bg-card border border-border/60 rounded-xl sm:rounded-2xl p-5 sm:p-8 space-y-4 sm:space-y-5 shadow-lg shadow-primary/3" onSubmit={(event) => event.preventDefault()}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Full Name</label>
                <input className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all duration-200" placeholder="Juan Dela Cruz" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Barangay</label>
                <input className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all duration-200" placeholder="Brgy. Poblacion" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Email</label>
              <input type="email" className="w-full h-10 rounded-xl border border-border/60 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all duration-200" placeholder="you@email.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Message</label>
              <textarea className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 min-h-[100px] resize-none transition-all duration-200" placeholder="How can we help?" />
            </div>
            <Button className="w-full gap-2" size="lg">
              <Send className="w-4 h-4" /> Send Message
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
