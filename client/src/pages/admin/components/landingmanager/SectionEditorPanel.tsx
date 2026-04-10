import analyticsService from "@/services/analyticsService";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash2,
  GripVertical,
  Info,
  Pencil,
  Image,
  BookOpen,
  Grid3X3,
  BarChart3,
  Trophy,
  Newspaper,
  HelpCircle,
  Quote,
  Mail,
  LayoutTemplate,
  Lock,
} from "lucide-react";
import {
  SectionContent,
  LandingSection,
  LandingSectionMeta,
  HeroContent,
  AboutContent,
  StatisticsContent,
  AwardsContent,
  TestimonialsContent,
  ContactContent,
  FooterContent,
} from "./types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const iconMap: Record<string, React.ElementType> = {
  Image,
  BookOpen,
  Grid3X3,
  BarChart3,
  Trophy,
  Newspaper,
  HelpCircle,
  Quote,
  Mail,
  LayoutTemplate,
};

interface Props {
  selectedSection: string | null;
  content: SectionContent;
  sections: LandingSection[];
  sectionMeta?: Record<keyof SectionContent, LandingSectionMeta>;
  activeSectionAction?: keyof SectionContent | null;
  onUpdateContent: <K extends keyof SectionContent>(key: K, updates: Partial<SectionContent[K]>) => void;
  onSetContent: <K extends keyof SectionContent>(key: K, content: SectionContent[K]) => void;
  onAddLog: (section: string, action: string, desc: string) => void;
}

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="text-xs font-medium text-muted-foreground">{children}</label>
);

const FieldGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <FieldLabel>{label}</FieldLabel>
    {children}
  </div>
);

const ReadOnlyNotice = ({ text }: { text: string }) => (
  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-border">
    <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
    <p className="text-xs text-muted-foreground">{text}</p>
  </div>
);

const AutoSyncNotice = ({ text }: { text: string }) => (
  <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
    <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
    <p className="text-xs text-muted-foreground">{text}</p>
  </div>
);

const HeroEditor = ({ data, onUpdate, onAddLog }: {
  data: HeroContent;
  onUpdate: (u: Partial<HeroContent>) => void;
  onAddLog: (s: string, a: string, d: string) => void;
}) => (
  <div className="space-y-4">
    <FieldGroup label="Badge Label (above headline)">
      <Input value={data.badge} onChange={(e) => { onUpdate({ badge: e.target.value }); onAddLog("Hero", "edit", "Updated badge label"); }} className="text-sm h-9" />
    </FieldGroup>
    <FieldGroup label="Main Headline">
      <Textarea value={data.headline} onChange={(e) => { onUpdate({ headline: e.target.value }); onAddLog("Hero", "edit", "Updated headline"); }} className="text-sm min-h-[60px] resize-none" />
    </FieldGroup>
    <FieldGroup label="Subtitle Paragraph">
      <Textarea value={data.subtitle} onChange={(e) => { onUpdate({ subtitle: e.target.value }); onAddLog("Hero", "edit", "Updated subtitle"); }} className="text-sm min-h-[80px] resize-none" />
    </FieldGroup>
    <ReadOnlyNotice text="Hero CTA buttons are fixed in the frontend and cannot be edited here." />
    <AutoSyncNotice text="The weekly collection schedule card is automatically synced from the Collection Schedule module and cannot be edited here." />

    <div className="space-y-3">
      <FieldLabel>Service Preview Cards (below hero)</FieldLabel>
      {(data.serviceCards ?? []).map((card, idx) => (
        <div key={card.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Card {idx + 1}</span>
            {(data.serviceCards?.length ?? 0) > 1 && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                onUpdate({ serviceCards: data.serviceCards.filter((_, i) => i !== idx) });
                onAddLog("Hero", "delete", `Removed service card: ${card.title}`);
              }}>
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Input value={card.title} onChange={(e) => {
            const cards = [...data.serviceCards];
            cards[idx] = { ...cards[idx], title: e.target.value };
            onUpdate({ serviceCards: cards });
          }} placeholder="Card title" className="text-sm h-9" />
          <Textarea value={card.description} onChange={(e) => {
            const cards = [...data.serviceCards];
            cards[idx] = { ...cards[idx], description: e.target.value };
            onUpdate({ serviceCards: cards });
          }} placeholder="Description" className="text-sm min-h-[60px] resize-none" />
        </div>
      ))}
      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
        onUpdate({ serviceCards: [...(data.serviceCards ?? []), { id: crypto.randomUUID(), title: "", description: "" }] });
        onAddLog("Hero", "add", "Added new service card");
      }}>
        <Plus className="w-3 h-3" /> Add Service Card
      </Button>
    </div>
  </div>
);

const AboutEditor = ({ data, onUpdate, onAddLog }: {
  data: AboutContent;
  onUpdate: (u: Partial<AboutContent>) => void;
  onAddLog: (s: string, a: string, d: string) => void;
}) => (
  <div className="space-y-4">
    <ReadOnlyNotice text="The section eyebrow label is fixed in the frontend and cannot be edited here." />
    <FieldGroup label="Main Heading">
      <Input value={data.heading} onChange={(e) => { onUpdate({ heading: e.target.value }); onAddLog("About", "edit", "Updated heading"); }} className="text-sm h-9" />
    </FieldGroup>
    <FieldGroup label="Paragraph 1">
      <Textarea value={data.paragraph1} onChange={(e) => onUpdate({ paragraph1: e.target.value })} className="text-sm min-h-[80px] resize-none" />
    </FieldGroup>
    <FieldGroup label="Paragraph 2">
      <Textarea value={data.paragraph2} onChange={(e) => onUpdate({ paragraph2: e.target.value })} className="text-sm min-h-[80px] resize-none" />
    </FieldGroup>
    <div className="space-y-2">
      <FieldLabel>Certification Badges</FieldLabel>
      {data.badges.map((badge, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input value={badge} onChange={(e) => {
            const badges = [...data.badges];
            badges[idx] = e.target.value;
            onUpdate({ badges });
          }} className="text-sm h-9" />
          <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-destructive" onClick={() => {
            onUpdate({ badges: data.badges.filter((_, i) => i !== idx) });
            onAddLog("About", "delete", `Removed badge: ${badge}`);
          }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
        onUpdate({ badges: [...data.badges, "New Badge"] });
        onAddLog("About", "add", "Added new badge");
      }}>
        <Plus className="w-3 h-3" /> Add Badge
      </Button>
    </div>
    <ReadOnlyNotice text="The commitment pillars are fixed in the frontend and cannot be edited here." />
  </div>
);

const ServicesEditor = () => (
  <div className="space-y-4">
    <ReadOnlyNotice text="The Services section is now a fixed frontend feature showcase. Service cards and labels are not editable in the Landing Page Manager." />
  </div>
);

const StatisticsEditor = ({ data, onUpdate, onAddLog }: {
  data: StatisticsContent;
  onUpdate: (u: Partial<StatisticsContent>) => void;
  onAddLog: (s: string, a: string, d: string) => void;
}) => {
  const autoSync = data.autoSyncEnabled ?? false;
  const formatCount = (value: number, usePlus = false) => {
    const formatted = value.toLocaleString("en-US");
    return usePlus && value > 0 ? `${formatted}+` : formatted;
  };

  const syncFromAnalytics = async () => {
    try {
      const overview = await analyticsService.getOverview();
      const nextStats = data.stats.map((stat, index) => {
        if (index === 0) return { ...stat, value: formatCount(25, false) };
        if (index === 1) return { ...stat, value: formatCount(Number(overview.trucks?.total ?? 0), false) };
        if (index === 2) return { ...stat, value: formatCount(Number(overview.users?.residents ?? 0), true) };
        if (index === 3) return { ...stat, value: formatCount(Number(overview.reports?.total ?? 0), true) };
        return stat;
      });

      onUpdate({ stats: nextStats });
      onAddLog("Statistics", "sync", "Synced impact statistics from analytics overview");
      toast.success("Impact statistics synced from analytics");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sync impact statistics");
      onUpdate({ autoSyncEnabled: false });
    } finally {
    }
  };

  return (
    <div className="space-y-4">
      <ReadOnlyNotice text="Statistic labels, heading, and CTA are fixed in the frontend. Only stat values can be adjusted here unless auto-sync is enabled." />
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border gap-3">
        <div>
          <p className="text-xs font-medium text-foreground">Auto-Sync from Analytics</p>
          <p className="text-[10px] text-muted-foreground">Pull live counts from the analytics overview endpoint</p>
        </div>
        <div className="shrink-0">
          <Switch
            checked={autoSync}
            onCheckedChange={(checked) => {
              onUpdate({ autoSyncEnabled: checked });
              onAddLog("Statistics", "toggle", `Auto-sync ${checked ? "enabled" : "disabled"}`);
              if (checked) {
                void syncFromAnalytics();
              }
            }}
            className="data-[state=checked]:bg-primary"
          />
        </div>
      </div>
      {autoSync && (
        <AutoSyncNotice text="Statistics values were pulled from analytics. Click Save Section to persist them to the landing page content." />
      )}
      <div className="space-y-3">
        <FieldLabel>Stat Values</FieldLabel>
        {data.stats.map((stat, idx) => (
          <div key={stat.id} className={`border rounded-lg p-4 bg-muted/20 transition-opacity ${autoSync ? "opacity-60 pointer-events-none" : ""}`}>
            <FieldGroup label={`${stat.label} - ${stat.sub}`}>
              <Input value={stat.value} onChange={(e) => {
                const stats = [...data.stats];
                stats[idx] = { ...stats[idx], value: e.target.value };
                onUpdate({ stats });
                onAddLog("Statistics", "edit", `Updated ${stat.label} value: ${e.target.value}`);
              }} className="text-sm h-9" disabled={autoSync} />
            </FieldGroup>
          </div>
        ))}
      </div>
    </div>
  );
};

const AwardsEditor = ({ data, onUpdate, onAddLog }: {
  data: AwardsContent;
  onUpdate: (u: Partial<AwardsContent>) => void;
  onAddLog: (s: string, a: string, d: string) => void;
}) => (
  <div className="space-y-4">
    <FieldGroup label="Section Label">
      <Input value={data.sectionLabel} onChange={(e) => onUpdate({ sectionLabel: e.target.value })} className="text-sm h-9" />
    </FieldGroup>
    <FieldGroup label="Main Heading">
      <Input value={data.heading} onChange={(e) => onUpdate({ heading: e.target.value })} className="text-sm h-9" />
    </FieldGroup>
    <div className="space-y-3">
      <FieldLabel>Award Entries</FieldLabel>
      {data.items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No awards added yet</p>
          <p className="text-xs mt-1">Add your first award entry below</p>
        </div>
      )}
      {data.items.map((item, idx) => (
        <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
              <span className="text-xs font-semibold text-muted-foreground">Award {idx + 1}</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Award</AlertDialogTitle>
                  <AlertDialogDescription>Remove "{item.name || "this award"}"? This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
                    onUpdate({ items: data.items.filter((_, i) => i !== idx) });
                    onAddLog("Awards", "delete", `Removed award: ${item.name}`);
                  }}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup label="Award Name">
              <Input value={item.name} onChange={(e) => {
                const items = [...data.items];
                items[idx] = { ...items[idx], name: e.target.value };
                onUpdate({ items });
              }} className="text-sm h-9" />
            </FieldGroup>
            <FieldGroup label="Awarding Body">
              <Input value={item.awardingBody} onChange={(e) => {
                const items = [...data.items];
                items[idx] = { ...items[idx], awardingBody: e.target.value };
                onUpdate({ items });
              }} className="text-sm h-9" />
            </FieldGroup>
          </div>
          <div className="grid grid-cols-[1fr,100px] gap-3">
            <FieldGroup label="Description">
              <Input value={item.description} onChange={(e) => {
                const items = [...data.items];
                items[idx] = { ...items[idx], description: e.target.value };
                onUpdate({ items });
              }} className="text-sm h-9" />
            </FieldGroup>
            <FieldGroup label="Year">
              <Input value={item.year} onChange={(e) => {
                const items = [...data.items];
                items[idx] = { ...items[idx], year: e.target.value };
                onUpdate({ items });
              }} className="text-sm h-9" />
            </FieldGroup>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
        onUpdate({ items: [...data.items, { id: crypto.randomUUID(), name: "", description: "", awardingBody: "", year: "", imageUrl: "" }] });
        onAddLog("Awards", "add", "Added new award entry");
      }}>
        <Plus className="w-3 h-3" /> Add Award
      </Button>
    </div>
  </div>
);

const BlogEditor = () => (
  <div className="space-y-4">
    <AutoSyncNotice text="The News & Updates section is fully managed by the Posts module. The latest 3 published posts are shown automatically." />
    <ReadOnlyNotice text="No CTA or heading controls are needed here because this section now follows the frontend posts layout." />
  </div>
);

const FAQEditor = () => (
  <div className="space-y-4">
    <AutoSyncNotice text="The FAQ section is now treated as a frontend-driven area. Use the dedicated FAQ source if you want the landing page entries updated later." />
    <ReadOnlyNotice text="Manual CTA or nav-link editing is not available for this section." />
  </div>
);

const TestimonialsEditor = ({ data, onUpdate, onAddLog }: {
  data: TestimonialsContent;
  onUpdate: (u: Partial<TestimonialsContent>) => void;
  onAddLog: (s: string, a: string, d: string) => void;
}) => (
  <div className="space-y-4">
    <FieldGroup label="Section Label">
      <Input value={data.sectionLabel} onChange={(e) => onUpdate({ sectionLabel: e.target.value })} className="text-sm h-9" />
    </FieldGroup>
    <FieldGroup label="Main Heading">
      <Input value={data.heading} onChange={(e) => onUpdate({ heading: e.target.value })} className="text-sm h-9" />
    </FieldGroup>
    <div className="space-y-3">
      <FieldLabel>Testimonials</FieldLabel>
      {data.items.map((item, idx) => (
        <div key={item.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
              <span className="text-xs font-semibold text-muted-foreground">Testimonial {idx + 1}</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Testimonial</AlertDialogTitle>
                  <AlertDialogDescription>Remove testimonial by {item.name || "this person"}? This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
                    onUpdate({ items: data.items.filter((_, i) => i !== idx) });
                    onAddLog("Testimonials", "delete", `Removed testimonial by ${item.name}`);
                  }}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <Textarea value={item.quote} onChange={(e) => {
            const items = [...data.items];
            items[idx] = { ...items[idx], quote: e.target.value };
            onUpdate({ items });
          }} placeholder="Testimonial quote..." className="text-sm min-h-[60px] resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <Input value={item.name} onChange={(e) => {
              const items = [...data.items];
              items[idx] = { ...items[idx], name: e.target.value };
              onUpdate({ items });
            }} placeholder="Full name" className="text-sm h-9" />
            <Input value={item.role} onChange={(e) => {
              const items = [...data.items];
              items[idx] = { ...items[idx], role: e.target.value };
              onUpdate({ items });
            }} placeholder="Role / Designation" className="text-sm h-9" />
          </div>
          <FieldGroup label="Rating (1-5 stars)">
            <Input type="number" min={1} max={5} value={item.rating ?? 5} onChange={(e) => {
              const items = [...data.items];
              items[idx] = { ...items[idx], rating: Math.min(5, Math.max(1, parseInt(e.target.value, 10) || 5)) };
              onUpdate({ items });
            }} className="text-sm h-9 w-20" />
          </FieldGroup>
        </div>
      ))}
      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => {
        onUpdate({ items: [...data.items, { id: crypto.randomUUID(), quote: "", name: "", role: "", rating: 5 }] });
        onAddLog("Testimonials", "add", "Added new testimonial");
      }}>
        <Plus className="w-3 h-3" /> Add Testimonial
      </Button>
    </div>
  </div>
);

const ContactEditor = ({ data, onUpdate, onAddLog }: {
  data: ContactContent;
  onUpdate: (u: Partial<ContactContent>) => void;
  onAddLog: (s: string, a: string, d: string) => void;
}) => (
  <div className="space-y-4">
    <ReadOnlyNotice text="The Contact section label and heading are fixed in the frontend and cannot be edited here." />
    <FieldGroup label="Office Address">
      <Input value={data.address} onChange={(e) => { onUpdate({ address: e.target.value }); onAddLog("Contact", "edit", "Updated address"); }} className="text-sm h-9" />
    </FieldGroup>
    <FieldGroup label="Phone Number">
      <Input value={data.phone} onChange={(e) => onUpdate({ phone: e.target.value })} className="text-sm h-9" />
    </FieldGroup>
    <FieldGroup label="Email Address">
      <Input value={data.email} onChange={(e) => onUpdate({ email: e.target.value })} className="text-sm h-9" />
    </FieldGroup>
    <FieldGroup label="Office Hours">
      <Input value={data.hours} onChange={(e) => onUpdate({ hours: e.target.value })} className="text-sm h-9" />
    </FieldGroup>
    <ReadOnlyNotice text="The contact form layout and labels are fixed in the frontend. Only the contact details above are editable here." />
  </div>
);

const FooterEditor = ({ data, onUpdate, onAddLog }: {
  data: FooterContent;
  onUpdate: (u: Partial<FooterContent>) => void;
  onAddLog: (s: string, a: string, d: string) => void;
}) => (
  <div className="space-y-4">
    <FieldGroup label="Logo Tagline">
      <Textarea value={data.tagline} onChange={(e) => { onUpdate({ tagline: e.target.value }); onAddLog("Footer", "edit", "Updated tagline"); }} className="text-sm min-h-[60px] resize-none" />
    </FieldGroup>
    <ReadOnlyNotice text="Footer navigation links are fixed in the frontend and cannot be edited here." />
    <AutoSyncNotice text="Footer contact details are synced from the Contact section above." />
    <FieldGroup label="Copyright Text">
      <Input value={data.copyright} onChange={(e) => onUpdate({ copyright: e.target.value })} className="text-sm h-9" />
    </FieldGroup>
    <FieldGroup label="Bottom Tagline">
      <Input value={data.bottomTagline} onChange={(e) => onUpdate({ bottomTagline: e.target.value })} className="text-sm h-9" />
    </FieldGroup>
  </div>
);

const SectionEditorPanel = ({ selectedSection, content, sections, sectionMeta, activeSectionAction, onUpdateContent, onSetContent, onAddLog }: Props) => {
  void onSetContent;

  if (!selectedSection) {
    return (
      <div className="bg-card border rounded-xl flex flex-col items-center justify-center py-24 px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Pencil className="w-7 h-7 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Select a Section</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Choose a section from the list on the left to start editing its content.
        </p>
      </div>
    );
  }

  const section = sections.find((entry) => entry.id === selectedSection);
  if (!section) return null;

  const SectionIcon = iconMap[section.icon] || BookOpen;
  const renderEditor = () => {
    switch (selectedSection) {
      case "hero":
        return <HeroEditor data={content.hero} onUpdate={(u) => onUpdateContent("hero", u)} onAddLog={onAddLog} />;
      case "about":
        return <AboutEditor data={content.about} onUpdate={(u) => onUpdateContent("about", u)} onAddLog={onAddLog} />;
      case "services":
        return <ServicesEditor />;
      case "statistics":
        return <StatisticsEditor data={content.statistics} onUpdate={(u) => onUpdateContent("statistics", u)} onAddLog={onAddLog} />;
      case "awards":
        return <AwardsEditor data={content.awards} onUpdate={(u) => onUpdateContent("awards", u)} onAddLog={onAddLog} />;
      case "blog":
        return <BlogEditor />;
      case "testimonials":
        return <TestimonialsEditor data={content.testimonials} onUpdate={(u) => onUpdateContent("testimonials", u)} onAddLog={onAddLog} />;
      case "faq":
        return <FAQEditor />;
      case "contact":
        return <ContactEditor data={content.contact} onUpdate={(u) => onUpdateContent("contact", u)} onAddLog={onAddLog} />;
      case "footer":
        return <FooterEditor data={content.footer} onUpdate={(u) => onUpdateContent("footer", u)} onAddLog={onAddLog} />;
      default:
        return <p className="text-sm text-muted-foreground">Editor not available for this section.</p>;
    }
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/30 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <SectionIcon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{section.label}</h3>
          <p className="text-xs text-muted-foreground">
            {section.visible ? "Currently visible on the public page" : "Currently hidden from the public page"}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {activeSectionAction === selectedSection && <Badge variant="outline" className="text-[10px]">Syncing...</Badge>}
          <Badge
            variant={section.visible ? "default" : "secondary"}
            className={`text-[10px] ${section.visible ? "bg-primary/10 text-primary border-primary/20" : ""}`}
          >
            {section.visible ? "Visible" : "Hidden"}
          </Badge>
        </div>
      </div>

      <div className="p-6">{renderEditor()}</div>
    </div>
  );
};

export default SectionEditorPanel;


