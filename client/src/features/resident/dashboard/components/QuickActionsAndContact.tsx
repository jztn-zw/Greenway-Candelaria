import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin, Clock, ExternalLink, ShieldCheck, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const QuickActionsAndContact = () => {
  const navigate = useNavigate();

  return (
    <Card className="border border-border/80 bg-card/80 backdrop-blur-sm overflow-hidden h-full flex flex-col justify-between">
      <div>
        <CardHeader className="pb-2 px-4 sm:px-6">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 font-display">
            <ShieldCheck className="w-4 h-4 text-primary" />
            MENRO Candelaria Office
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Municipal Environment & Natural Resources
          </p>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-3 space-y-2.5">
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/50">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Hotline</p>
                <a href="tel:0421234567" className="font-semibold text-foreground hover:text-primary transition-colors">
                  (042) 123-4567
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/50">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Email Support</p>
                <a href="mailto:menro@candelaria.gov.ph" className="font-semibold text-foreground hover:text-primary transition-colors">
                  menro@candelaria.gov.ph
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/50">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Office Hours</p>
                <p className="font-semibold text-foreground">Mon - Fri: 8:00 AM - 5:00 PM</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border border-border/50">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                <p className="font-semibold text-foreground">Ground Floor, Candelaria Municipal Hall</p>
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      <div className="px-4 sm:px-6 pb-3.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/resident/my-reports")}
          className="w-full text-xs font-semibold gap-2 border-primary/30 text-primary hover:bg-primary/10 rounded-xl h-9 cursor-pointer"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Track My Reports
        </Button>
      </div>
    </Card>
  );
};

export default QuickActionsAndContact;

