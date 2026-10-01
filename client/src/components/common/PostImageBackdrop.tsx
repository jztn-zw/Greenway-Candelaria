interface PostImageBackdropProps {
  src: string;
}

/** Fills the unused space around an uncropped post image with a quiet copy of the image. */
export const PostImageBackdrop = ({ src }: PostImageBackdropProps) => (
  <>
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl dark:opacity-30"
    />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/20" />
  </>
);

export default PostImageBackdrop;
