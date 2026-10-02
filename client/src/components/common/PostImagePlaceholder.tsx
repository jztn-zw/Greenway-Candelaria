interface PostImagePlaceholderProps {
  category: string;
  title?: string;
  isFeatured?: boolean;
  compact?: boolean;
}

export const PostImagePlaceholder = ({ title }: PostImagePlaceholderProps) => (
  <div
    role="img"
    aria-label={title ? `Placeholder image for ${title}` : "Post cover placeholder"}
    className="h-full w-full bg-[url('/images/post-placeholder-light.png')] bg-cover bg-center dark:bg-[url('/images/post-placeholder-dark.png')]"
  />
);

export default PostImagePlaceholder;
