import { MapPin, Phone, Mail, Leaf } from "lucide-react";
import { ContactContent, DEFAULT_CONTENT, FooterContent } from "@/pages/admin/components/landingmanager/types";

interface FooterProps {
  content?: FooterContent;
  contactContent?: ContactContent;
}

const Footer = ({ content = DEFAULT_CONTENT.footer, contactContent = DEFAULT_CONTENT.contact }: FooterProps) => {
  return (
    <footer className="bg-canopy text-canopy-foreground">
      <div className="container py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
          <div className="space-y-3 sm:space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 font-display text-lg font-bold">
              <img src="/greenway.svg" alt="GreenWay Logo" className="w-7 h-7" /> GreenWay
            </div>
            <p className="text-xs font-semibold opacity-80">MENRO Candelaria, Quezon</p>
            <p className="text-sm opacity-70 leading-relaxed">{content.tagline}</p>
            <div className="flex items-center gap-2 pt-2">
              <div className="w-8 h-8 rounded-lg bg-canopy-foreground/10 flex items-center justify-center hover:bg-canopy-foreground/20 transition-colors duration-300 cursor-pointer">
                <Leaf className="w-4 h-4 opacity-70" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">System</h4>
            <ul className="space-y-2.5">
              {content.systemLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm opacity-60 hover:opacity-100 transition-opacity duration-300">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Information</h4>
            <ul className="space-y-2.5">
              {content.informationLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm opacity-60 hover:opacity-100 transition-opacity duration-300">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Contact</h4>
            <ul className="space-y-3 text-sm opacity-70">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{contactContent.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{contactContent.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0" />
                <a href={`mailto:${contactContent.email}`} className="hover:opacity-100 transition-opacity duration-300">{contactContent.email}</a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm">Legal</h4>
            <ul className="space-y-2.5">
              {content.legalLinks.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm opacity-60 hover:opacity-100 transition-opacity duration-300">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-canopy-foreground/10">
        <div className="container py-5 flex flex-col sm:flex-row justify-between items-center text-xs opacity-60 gap-2 text-center sm:text-left">
          <span>{content.copyright}</span>
          <span>{content.bottomTagline}</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
