import { Check, Pencil } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PROFILE_AVATARS, profileAvatarSrc, type ProfileAvatarId } from "./profileAvatars";

export const ProfileAvatarImage = ({ avatarId }: { avatarId: ProfileAvatarId }) => (
  <img src={profileAvatarSrc(avatarId)} alt="" aria-hidden="true" className="block h-full w-full object-cover object-center" />
);

export const ProfileAvatarControl = ({ avatarId, onCustomize }: {
  avatarId: ProfileAvatarId;
  onCustomize: () => void;
}) => (
  <div className="relative shrink-0">
    <Avatar className="size-24 rounded-full border border-border/50 ring-[3px] ring-card shadow-md lg:size-28">
      <ProfileAvatarImage avatarId={avatarId} />
    </Avatar>
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Customize avatar"
      title="Customize avatar"
      onClick={onCustomize}
      className="absolute -bottom-1 -right-1 size-9 rounded-full border-border/80 bg-card text-foreground shadow-sm hover:bg-muted"
    >
      <Pencil className="size-4" />
    </Button>
  </div>
);

export const ProfileAvatarPicker = ({ selected, onSelect, disabled = false }: {
  selected: ProfileAvatarId;
  onSelect: (avatarId: ProfileAvatarId) => void;
  disabled?: boolean;
}) => (
  <div role="group" aria-label="Profile avatars" className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
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
        <span className="block h-full w-full overflow-hidden rounded-full"><img src={avatar.src} alt="" aria-hidden="true" loading="lazy" className="block h-full w-full object-cover object-center" /></span>
        {selected === avatar.id && <span className="absolute bottom-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs"><Check className="size-3" /></span>}
      </button>
    ))}
  </div>
);
