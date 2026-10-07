import { useState } from "react";
import { Check, SquarePen, UserRound } from "lucide-react";
import ActionButtonLoader from "./ActionButtonLoader";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PROFILE_AVATARS, profileAvatarImageSrc, type ProfileAvatarId } from "./profileAvatars";
import { cn } from "@/lib/utils";

const AvatarPortrait = ({ avatarId }: { avatarId: ProfileAvatarId }) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  return <span className="relative block h-full w-full overflow-hidden rounded-full bg-muted">
    <img src={profileAvatarImageSrc(avatarId)} alt="" aria-hidden="true" onLoad={() => setStatus("loaded")} onError={() => setStatus("error")}
      className={cn("block h-full w-full object-cover object-center", status !== "loaded" && "invisible")} />
    {status === "loading" && <span role="status" aria-label="Loading avatar" className="absolute inset-0 flex items-center justify-center text-primary"><ActionButtonLoader /></span>}
    {status === "error" && <span role="img" aria-label="Avatar image unavailable" className="absolute inset-0 flex items-center justify-center text-muted-foreground"><UserRound aria-hidden="true" className="size-6" /></span>}
  </span>;
};
export const ProfileAvatarImage = ({ avatarId }: { avatarId: ProfileAvatarId }) => <AvatarPortrait key={avatarId} avatarId={avatarId} />;

export const ProfileAvatarControl = ({ avatarId, onCustomize, avatarClassName, saving = false }: {
  avatarId: ProfileAvatarId;
  onCustomize: () => void;
  avatarClassName?: string;
  saving?: boolean;
}) => (
  <div className="relative shrink-0">
    <Avatar className={cn("size-24 rounded-full border border-border/50 ring-[3px] ring-card shadow-md lg:size-28", avatarClassName)}>
      <ProfileAvatarImage avatarId={avatarId} />
    </Avatar>
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Customize avatar"
      title="Customize Avatar"
      onClick={onCustomize}
      disabled={saving}
      className="absolute -bottom-1 -right-1 size-7 rounded-full border-border/80 bg-card text-foreground shadow-sm hover:bg-muted [&_svg]:size-3.5"
    >
      <SquarePen className="size-3.5" />
    </Button>
  </div>
);

export const ProfileAvatarPicker = ({ selected, onSelect, disabled = false, saving = null }: {
  selected: ProfileAvatarId;
  onSelect: (avatarId: ProfileAvatarId) => void;
  disabled?: boolean;
  saving?: ProfileAvatarId | null;
}) => (
  <div>
  <div role="group" aria-label="Profile avatars" aria-busy={Boolean(saving)} className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
    {PROFILE_AVATARS.map((avatar) => (
      <button
        key={avatar.id}
        type="button"
        aria-label={`Select ${avatar.label} avatar`}
        aria-pressed={selected === avatar.id}
        disabled={disabled}
        onClick={() => onSelect(avatar.id)}
        className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-card p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected === avatar.id ? "border-primary bg-primary/10" : "border-border/80 hover:border-primary/50 hover:bg-muted/40"}`}
      >
        <ProfileAvatarImage avatarId={avatar.id} />
        {saving === avatar.id ? <span className="absolute inset-0 flex items-center justify-center bg-card/70 text-primary"><ActionButtonLoader /></span>
          : selected === avatar.id && <span className="absolute bottom-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs"><Check className="size-3" /></span>}
      </button>
    ))}
  </div>
  {saving && <p role="status" aria-label="Saving avatar" className="mt-3 text-center text-sm text-muted-foreground">Saving avatar…</p>}
  </div>
);
