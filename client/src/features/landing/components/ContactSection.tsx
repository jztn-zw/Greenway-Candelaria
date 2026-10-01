import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ContactContent, CONTENT } from "../landingContent";

interface ContactSectionProps {
  content?: ContactContent;
}

const ContactSection = ({ content = CONTENT.contact }: ContactSectionProps) => {
  const leftRef = useScrollReveal();
  const rightRef = useScrollReveal<HTMLFormElement>({ rootMargin: "0px 0px -60px 0px" });
  const contactItems = [
    { icon: MapPin, text: content.address },
    { icon: Phone, text: content.phone },
    { icon: Mail, text: content.email },
    { icon: Clock, text: content.hours },
  ];

  return (
    <section id="contact" className="py-10 sm:py-16 lg:py-20 bg-secondary/30 relative overflow-hidden">

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          <div ref={leftRef} className="space-y-4 sm:space-y-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <span className="w-8 h-px bg-primary" />
              {content.sectionLabel}
            </span>
            <h2 className="gw-heading text-2xl sm:text-3xl lg:text-4xl whitespace-pre-line">{content.heading}</h2>
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

          <form ref={rightRef} className="bg-card border border-border/60 rounded-xl p-5 sm:p-8 space-y-4 sm:space-y-5 shadow-lg shadow-primary/3" onSubmit={(event) => event.preventDefault()}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="text-xs font-medium">Full Name</label>
                <Input id="contact-name" placeholder="Juan Dela Cruz" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contact-barangay" className="text-xs font-medium">Barangay</label>
                <Input id="contact-barangay" placeholder="Brgy. Poblacion" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="contact-email" className="text-xs font-medium">Email</label>
              <Input id="contact-email" type="email" placeholder="you@email.com" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="contact-message" className="text-xs font-medium">Message</label>
              <Textarea id="contact-message" className="min-h-[100px] resize-none" placeholder="How can we help?" />
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
