import { MapPin, Phone, Mail, Clock } from "lucide-react";

const TopBar = () => (
  <div className="bg-forest text-forest-foreground text-xs py-2 hidden md:block">
    <div className="container flex justify-between items-center">
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-1.5 opacity-80">
          <Phone className="w-3 h-3" /> Hotline: 383
        </span>
        <a href="mailto:menro@candelaria.gov.ph" className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity duration-300">
          <Mail className="w-3 h-3" /> menro@candelaria.gov.ph
        </a>
      </div>
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-1.5 opacity-80">
          <MapPin className="w-3 h-3" /> Brgy. Poblacion, Candelaria, Quezon
        </span>
        <span className="flex items-center gap-1.5 opacity-80">
          <Clock className="w-3 h-3" /> Mon – Fri, 8:00 AM – 5:00 PM
        </span>
      </div>
    </div>
  </div>
);

export default TopBar;
