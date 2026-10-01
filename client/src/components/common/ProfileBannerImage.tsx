import profileBanner from "@/assets/profile-banner.png";

/** Shared decorative cover for the profile header cards. */
const ProfileBannerImage = () => (
  <img
    src={profileBanner}
    alt=""
    aria-hidden="true"
    draggable={false}
    className="pointer-events-none absolute inset-0 h-full w-full object-cover dark:brightness-75"
    style={{ objectPosition: "center 60%" }}
  />
);

export default ProfileBannerImage;
