import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin, Clock, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MUNICIPAL_CONTACT } from "@/config/municipalContact";

const QuickActionsAndContact = () => {
  const navigate = useNavigate();

  return (
    <Card className="flex h-full flex-col overflow-hidden border border-border/80 bg-card rounded-2xl">
      <div>
        <CardHeader className="pb-2 px-4 lg:px-6">
          <CardTitle className="gw-heading text-sm text-foreground ">
            {MUNICIPAL_CONTACT.officeName}
          </CardTitle>
          <p className="text-ui-caption text-muted-foreground">
            {MUNICIPAL_CONTACT.departmentName}
          </p>
        </CardHeader>
        <CardContent className="px-4 lg:px-6 pb-3 space-y-2.5">
          <div className="grid grid-cols-1 gap-1.5 text-xs md:grid-cols-2">
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/50">
              <Phone className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-ui-overline text-muted-foreground uppercase tracking-wider font-semibold">Hotline</p>
                <a href={MUNICIPAL_CONTACT.hotlineHref} className="font-semibold text-foreground hover:text-primary transition-colors">
                  {MUNICIPAL_CONTACT.hotline}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/50">
              <Mail className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-ui-overline text-muted-foreground uppercase tracking-wider font-semibold">Email Support</p>
                <a href={MUNICIPAL_CONTACT.emailHref} className="font-semibold text-foreground hover:text-primary transition-colors">
                  {MUNICIPAL_CONTACT.email}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/50">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-ui-overline text-muted-foreground uppercase tracking-wider font-semibold">Office Hours</p>
                <p className="font-semibold text-foreground">{MUNICIPAL_CONTACT.hours}</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/50">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-ui-overline text-muted-foreground uppercase tracking-wider font-semibold">Location</p>
                <p className="font-semibold text-foreground">{MUNICIPAL_CONTACT.address}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      <div className="px-4 lg:px-6 pb-3.5">
        <Button
          variant="primary-outline"
          size="sm"
          onClick={() => navigate("/resident/my-reports")}
          className="w-full text-xs font-semibold gap-2 rounded-xl h-9 cursor-pointer"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Track My Reports
        </Button>
      </div>
    </Card>
  );
};

export default QuickActionsAndContact;


