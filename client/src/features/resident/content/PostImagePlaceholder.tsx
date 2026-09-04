import React from "react";

interface PostImagePlaceholderProps {
  category: string;
  title?: string;
  isFeatured?: boolean;
}

export const PostImagePlaceholder: React.FC<PostImagePlaceholderProps> = ({
  category,
}) => {
  const isEvent = category === "EVENT";

  return (
    <div
      className={`w-full h-full relative overflow-hidden select-none ${
        isEvent
          ? "bg-gradient-to-br from-amber-600/90 via-emerald-800/85 to-forest"
          : "bg-gradient-to-br from-emerald-600/90 via-teal-800/85 to-forest"
      } group-hover:scale-[1.03] transition-transform duration-700 ease-out`}
    >
      {/* ── Ambient Radial Light Blooms ── */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 sm:w-56 sm:h-56 rounded-full ${
          isEvent ? "bg-amber-400/25" : "bg-emerald-300/20"
        } blur-3xl pointer-events-none`}
      />
      <div
        className={`absolute -bottom-12 -left-12 w-48 h-48 sm:w-56 sm:h-56 rounded-full ${
          isEvent ? "bg-emerald-400/20" : "bg-teal-300/20"
        } blur-3xl pointer-events-none`}
      />
      <div className="absolute inset-0 bg-radial from-white/[0.08] via-transparent to-black/20 pointer-events-none" />

      {/* ── Ultra-Subtle Organic Contour Curves ── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 250"
        preserveAspectRatio="none"
      >
        <path
          d="M-50,150 C80,80 180,240 280,120 C360,40 420,180 470,100 L470,270 L-50,270 Z"
          fill="#ffffff"
        />
        <path
          d="M-50,60 C70,10 160,180 270,50 C350,-20 420,100 470,40 L470,270 L-50,270 Z"
          fill="#ffffff"
        />
      </svg>

      {/* ── Fine Micro Dot Matrix Pattern ── */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff18_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

      {/* ── Subtle Top Glass Edge Highlight ── */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
    </div>
  );
};

export default PostImagePlaceholder;
