import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const mediaBase = `${import.meta.env.BASE_URL}media/greenway-resident-demo-v9`;

export default function ResidentAppVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [playback, setPlayback] = useState<"auto" | "play" | "pause">("auto");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changeMotion = () => setReducedMotion(motion.matches);
    let inView = false;
    const syncVisibility = () => setVisible(inView && !document.hidden);
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      syncVisibility();
    }, { threshold: [0, 0.35] });
    observer?.observe(video);
    motion.addEventListener("change", changeMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      observer?.disconnect();
      motion.removeEventListener("change", changeMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
      video.pause();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (visible && playback !== "pause" && (!reducedMotion || playback === "play")) {
      // A blocked autoplay keeps the manual play button available.
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [visible, playback, reducedMotion]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      setPlayback("pause");
      video.pause();
    } else {
      setPlayback("play");
      void video.play().catch(() => {});
    }
  };

  return (
    <figure className="app-download-video relative m-0 min-w-0 px-5 pb-6 sm:px-8 sm:pb-8 lg:py-10 lg:pl-0 lg:pr-10">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-background shadow-lg">
        <video ref={videoRef} muted={muted} loop playsInline preload="none" poster={`${mediaBase}.jpg`}
          aria-label="Watch the GreenWay Resident app demo"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          className="block aspect-video w-full bg-black object-contain">
          <source src={`${mediaBase}.mp4`} type="video/mp4" />
          <track kind="captions" src={`${mediaBase}.en.vtt`} srcLang="en" label="English" />
          <p>Your browser does not support video playback. <a href={`${mediaBase}.mp4`}>Open the GreenWay demo video</a>.</p>
        </video>
        <button type="button" onClick={togglePlayback} aria-label={playing ? "Pause demo" : "Play demo"}
          className="absolute inset-0 cursor-pointer rounded-xl bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" />
        <button type="button" onClick={() => setMuted(value => !value)} aria-label={muted ? "Turn sound on" : "Mute demo"}
          className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-sm bg-transparent text-forest-foreground mix-blend-difference focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          {muted ? <VolumeX aria-hidden="true" className="h-5 w-5" /> : <Volume2 aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>
    </figure>
  );
}
