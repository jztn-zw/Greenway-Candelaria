import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "./loadingImage.css";

type LoadingImageProps = ImgHTMLAttributes<HTMLImageElement> & { placeholder?: boolean };

/** Use inside a positioned media container; preserves the image's existing layout. */
export default function LoadingImage(props: LoadingImageProps) {
  return <ImageContent key={`${props.src ?? ""}|${props.srcSet ?? ""}`} {...props} />;
}

function ImageContent({ placeholder = true, className, style, onLoad, onError, alt = "", ...props }: LoadingImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  async function reveal(image: HTMLImageElement) {
    try {
      if (image.decode) await image.decode();
      setStatus(image.naturalWidth > 0 ? "ready" : "error");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) void reveal(image);
  }, []);

  return <>
    {placeholder && status === "loading" && (
      <Skeleton role="status" aria-label="Loading image" className="pointer-events-none absolute inset-0 z-10 rounded-none motion-reduce:animate-none" />
    )}
    {placeholder && status === "error" && (
      <span role="img" aria-label={`${alt || "Image"} unavailable`} className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
        <ImageOff className="h-6 w-6" aria-hidden="true" />
      </span>
    )}
    <img
      {...props}
      ref={imageRef}
      alt={alt}
      decoding="async"
      className={cn(className, "gw-loading-image")}
      data-ready={status === "ready"}
      aria-busy={status === "loading"}
      style={{ ...style, opacity: status === "ready" ? style?.opacity : 0 }}
      onLoad={(event) => { void reveal(event.currentTarget); onLoad?.(event); }}
      onError={(event) => { setStatus("error"); onError?.(event); }}
    />
  </>;
}
