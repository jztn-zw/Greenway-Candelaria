interface PostImagePlaceholderProps {
  category: string;
  title?: string;
  isFeatured?: boolean;
  compact?: boolean;
}

export const PostImagePlaceholder = ({ compact = false }: PostImagePlaceholderProps) => {
  return (
    <div
      role="img"
      aria-label="Post cover placeholder"
      className={`relative h-full w-full overflow-hidden text-primary ${compact ? "bg-primary/10" : "bg-primary/5"}`}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 800 320"
        preserveAspectRatio={compact ? "xMinYMid slice" : "xMidYMid slice"}
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <path d="M0 251C111 171 180 209 266 244c90 37 186 28 278-34 91-61 165-79 256-32v142H0Z" fill="currentColor" opacity="0.07" />
        <path d="M0 285c105-74 188-39 272-9 103 37 188 8 285-45 85-47 162-48 243-15" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.15" />

        <path d="M47 277C-2 207 4 123 48 79c71 12 124 75 113 151-23 29-68 47-114 47Z" fill="currentColor" opacity="0.14" />
        <path d="M50 87c44 61 64 112 73 169M52 162l71 30M81 120l29 54" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.22" />
        <path d="M131 293c-9-83 48-146 117-148 28 68-2 143-74 180-17-5-31-15-43-32Z" fill="currentColor" opacity="0.1" />
        <path d="M246 151c-41 46-66 98-75 160M220 211l-37 37" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.18" />

        <path d="M785 59c-81-15-161 24-178 105 44 61 130 78 193 26V59Z" fill="currentColor" opacity="0.13" />
        <path d="M791 72c-72 27-122 63-157 117M725 110l-12 63M681 137l65 11" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.21" />
        <path d="M800 249c-54-50-124-50-182-7-6 41 13 71 51 88h131Z" fill="currentColor" opacity="0.09" />
        <path d="M798 260c-48-18-96-16-146 10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.17" />
      </svg>
    </div>
  );
};

export default PostImagePlaceholder;
