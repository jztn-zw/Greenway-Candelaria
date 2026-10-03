import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Mail, MapPin, Clock, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MUNICIPAL_CONTACT } from "@/config/municipalContact";

const QuickActionsAndContact = () => {
  const navigate = useNavigate();

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="gw-heading text-base text-foreground">
            {MUNICIPAL_CONTACT.officeName}
          </CardTitle>
          <p className="text-ui-caption text-muted-foreground">
            {MUNICIPAL_CONTACT.departmentName}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5">
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="flex min-w-0 items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs text-muted-foreground">Hotline</p>
                <a href={MUNICIPAL_CONTACT.hotlineHref} className="break-words font-medium leading-relaxed text-foreground transition-colors hover:text-primary [overflow-wrap:anywhere]">
                  {MUNICIPAL_CONTACT.hotline}
                </a>
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs text-muted-foreground">Email support</p>
                <a href={MUNICIPAL_CONTACT.emailHref} className="break-words font-medium leading-relaxed text-foreground transition-colors hover:text-primary [overflow-wrap:anywhere]">
                  {MUNICIPAL_CONTACT.email}
                </a>
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs text-muted-foreground">Office hours</p>
                <p className="break-words font-medium leading-relaxed text-foreground">{MUNICIPAL_CONTACT.hours}</p>
              </div>
            </div>

            <div className="flex min-w-0 items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="mb-0.5 text-xs text-muted-foreground">Location</p>
                <p className="break-words font-medium leading-relaxed text-foreground">{MUNICIPAL_CONTACT.address}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      <div className="mt-auto border-t border-border/50 px-4 py-3 sm:px-5">
        <Button
          variant="primary-outline"
          size="sm"
          onClick={() => navigate("/resident/my-reports")}
          className="h-9 w-full gap-2 text-xs"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Track my reports
        </Button>
      </div>
    </Card>
  );
};

export default QuickActionsAndContact;


