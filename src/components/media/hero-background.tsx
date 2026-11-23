"use client";

/**
 * HeroBackground — reusable cinematic background media for the VIJAYA hero.
 *
 * Supports two source types so the team can swap YouTube for a self-hosted
 * MP4/WebM later without touching the hero layout:
 *
 *   <HeroBackground
 *     sourceType="youtube"
 *     youtubeVideoId="nY6XZE6999Y"
 *     posterImage="/media/hero-video-poster.jpg"   ← same-video still frame
 *     overlayClassName="absolute inset-0 vignette"
 *     bottomFadeClassName="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink/80 to-transparent"
 *   />
 *
 * Loading model (the previous-image flash is gone):
 *  - The video CONTAINER (a <div>) is rendered DIRECTLY in JSX so it exists
 *    from first paint. The YouTube IFrame API creates the actual <iframe>
 *    inside this div as soon as the API script loads (~200-500ms after paint).
 *  - The poster layer underneath is a STILL FRAME FROM THE SAME VIDEO (the
 *    YouTube thumbnail downloaded to /media/hero-video-poster.jpg). It is NOT
 *    the old VIJAYA architectural hero image.
 *  - While the YT API loads + creates the iframe + the video buffers, the
 *    visitor sees the same-video poster frame (matches the opening shot).
 *  - When the YT API fires PLAYING, the video layer fades in over a short
 *    200ms crossfade and the poster fades out. Because both layers are frames
 *    from the same video, the transition is visually imperceptible.
 *  - prefers-reduced-motion → poster-only, no autoplay, no iframe.
 *  - pointer-events: none on every video layer — the player is fully
 *    non-interactive. Hero copy/CTAs (z-10) and header (z-50) remain clickable.
 *
 * Why not render the <iframe> directly in JSX?
 *  The YouTube IFrame API's `new YT.Player(iframe, ...)` constructor REPLACES
 *  the existing iframe element with a new one (it adds widgetid to the URL).
 *  This conflicts with React's virtual DOM — React's ref ends up pointing to
 *  a detached element, and re-renders can conflict with the API's iframe.
 *  Passing a <div> instead lets the API create the iframe inside it, which
 *  React doesn't manage, so there's no conflict. The div container exists
 *  from first paint; the iframe is created inside it within ~500ms.
 */

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type HeroBackgroundSource = "youtube" | "selfHosted";

export interface HeroBackgroundProps {
  sourceType: HeroBackgroundSource;
  /** Required when sourceType === "youtube". */
  youtubeVideoId?: string;
  /** Required when sourceType === "selfHosted". Desktop sources plus optional
   *  mobile variants. Mobile is served via `<source media="(max-width:768px)">`
   *  so phones never download the desktop-resolution file, and desktop screens
   *  never download the mobile one. Loading is deferred past first paint + LCP
   *  (see the shouldLoadVideo effect) so the video never blocks the poster. */
  selfHostedSources?: {
    mp4?: string;
    webm?: string;
    mp4Mobile?: string;
    webmMobile?: string;
  };
  /**
   * Poster image shown from first paint. MUST be a still frame from the same
   * video (e.g. the YouTube thumbnail), NOT an unrelated VIJAYA photograph.
   * This is what makes the poster→video transition visually seamless.
   */
  posterImage: string;
  posterAlt?: string;
  /**
   * Overlay classes preserved from the existing VIJAYA hero (e.g. vignette).
   * Rendered on top of the video, below hero copy.
   */
  overlayClassName?: string;
  /** Optional bottom fade gradient class (existing hero behaviour). */
  bottomFadeClassName?: string;
}

// ---------------------------------------------------------------------------
// Build the YouTube embed URL with all required player parameters.
// ---------------------------------------------------------------------------

function buildYouTubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    playsinline: "1",
    loop: "1",
    playlist: videoId, // required for loop=1 to work
    rel: "0",
    fs: "0",
    disablekb: "1",
    enablejsapi: "1", // allows YT.Player to control playback
    iv_load_policy: "3", // hide annotations
    cc_load_policy: "0", // no captions
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// YouTube IFrame API loader — singleton, so multiple HeroBackground instances
// never inject the script twice. Resolves once window.YT.Player is available.
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>((resolve) => {
    const prevCb = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        prevCb?.();
      } finally {
        resolve();
      }
    };

    const existing = document.getElementById("youtube-iframe-api");
    if (!existing) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });

  return ytApiPromise;
}

// ---------------------------------------------------------------------------
// prefers-reduced-motion subscription via useSyncExternalStore — the
// React-recommended pattern for matchMedia. Avoids setState-in-effect.
// ---------------------------------------------------------------------------

function subscribePrefersReducedMotion(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener?.("change", callback);
  return () => mq.removeEventListener?.("change", callback);
}

function getPrefersReducedMotionSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getPrefersReducedMotionServerSnapshot(): boolean {
  return false;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HeroBackground({
  sourceType,
  youtubeVideoId,
  selfHostedSources,
  posterImage,
  posterAlt = "",
  overlayClassName,
  bottomFadeClassName,
}: HeroBackgroundProps) {
  // Outer container = the hero media area (absolute inset-0 of the hero section).
  const containerRef = useRef<HTMLDivElement>(null);
  // Inner wrapper that gets sized to "cover" the container at 16:9.
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  // The div that the YT API will fill with an iframe. Rendered in JSX so it
  // exists from first paint. The iframe is created inside it by YT.Player.
  const playerHostRef = useRef<HTMLDivElement>(null);
  // YT.Player instance — kept on a ref for cleanup.
  const playerRef = useRef<any>(null);
  // The self-hosted <video> element. Held on a ref so we can call .load() +
  // .play() once the deferred <source> children are injected (browsers do not
  // re-run media resource selection automatically when <source> children are
  // added dynamically).
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoReady, setVideoReady] = useState(false);
  // Defer self-hosted video loading until after the page's first paint + LCP.
  // The poster (Layer 1a, a same-video still frame rendered as a priority
  // next/image) is the LCP element; the video must not compete with it for the
  // browser's earliest network round-trips. We wait for `window.load` (or, if
  // the page is already complete, an idle callback) before revealing any
  // <source> to the <video> element, so zero video bytes are requested until
  // the poster is decoded and the hero copy is interactive.
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    getPrefersReducedMotionServerSnapshot,
  );

  // --- 1. Cover-style sizing for the video wrapper --------------------------
  // Computes width/height so a 16:9 video covers the container with no black
  // bars, cropping naturally around the centre. Re-runs on resize.
  // NOTE: only mutates the wrapper's inline width/height — never touches the
  // iframe element, so playback is never interrupted on resize.
  useEffect(() => {
    if (reducedMotion) return;
    const container = containerRef.current;
    const wrapper = videoWrapperRef.current;
    if (!container || !wrapper) return;

    const updateSize = () => {
      const { width: cw, height: ch } = container.getBoundingClientRect();
      if (!cw || !ch) return;
      const videoAspect = 16 / 9;
      const containerAspect = cw / ch;
      let w: number;
      let h: number;
      if (containerAspect > videoAspect) {
        // Container is wider than 16:9 → match width, overflow height.
        w = cw;
        h = cw / videoAspect;
      } else {
        // Container is taller than 16:9 → match height, overflow width.
        h = ch;
        w = ch * videoAspect;
      }
      wrapper.style.width = `${w}px`;
      wrapper.style.height = `${h}px`;
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(container);
    window.addEventListener("resize", updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [reducedMotion, sourceType]);

  // --- 2. Create the YouTube player inside the host div ---------------------
  // The host div (playerHostRef) is already in the DOM (rendered in JSX below).
  // This effect loads the YT IFrame API, then constructs a YT.Player inside
  // that div. The API creates the <iframe> as a child of the div.
  //
  // The iframe element itself is NEVER touched by React after this — React
  // only manages the div host. So state changes (like `videoReady` flipping
  // true) never re-create or interrupt the iframe.
  useEffect(() => {
    if (sourceType !== "youtube" || !youtubeVideoId) return;
    if (reducedMotion) return;
    const host = playerHostRef.current;
    if (!host) return;

    let cancelled = false;

    // Clear any previous content (e.g. from HMR).
    host.innerHTML = "";

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !window.YT || !window.YT.Player) return;
      try {
        playerRef.current = new window.YT.Player(host, {
          videoId: youtubeVideoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            playsinline: 1,
            loop: 1,
            playlist: youtubeVideoId,
            rel: 0,
            fs: 0,
            disablekb: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            cc_load_policy: 0,
          },
          events: {
            onReady: (e: any) => {
              try {
                e.target.mute();
                e.target.playVideo();
              } catch {
                /* no-op */
              }
            },
            onStateChange: (e: any) => {
              const YT = window.YT;
              if (!YT || cancelled) return;
              // Fade in only once the first frame is actually playing →
              // the poster (same-video frame) is already visible underneath,
              // so the crossfade is visually imperceptible.
              if (e.data === YT.PlayerState.PLAYING) {
                setVideoReady(true);
              }
              // Backup loop: some browsers fail to honour loop=1 reliably.
              if (e.data === YT.PlayerState.ENDED) {
                try {
                  e.target.seekTo(0);
                  e.target.playVideo();
                } catch {
                  /* no-op */
                }
              }
            },
            onError: () => {
              // Stay on poster fallback silently.
            },
          },
        });
      } catch {
        /* if YT construction fails, poster remains as fallback */
      }
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* no-op */
      }
      playerRef.current = null;
      if (host) host.innerHTML = "";
    };
  }, [sourceType, youtubeVideoId, reducedMotion]);

  // --- 3. Defer self-hosted video loading past LCP --------------------------
  // For self-hosted video, no <source> is rendered until shouldLoadVideo flips
  // true, so the browser requests zero video bytes during initial load. We
  // wait until the page's `load` event (poster decoded + hero interactive),
  // then yield to an idle callback before starting the video fetch+play.
  useEffect(() => {
    if (sourceType !== "selfHosted" || reducedMotion) return;
    const start = () => {
      const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
      const go = () => setShouldLoadVideo(true);
      if (ric) ric(go, { timeout: 1500 });
      else window.setTimeout(go, 1200);
    };
    if (document.readyState === "complete") start();
    else {
      window.addEventListener("load", start, { once: true });
      return () => window.removeEventListener("load", start);
    }
  }, [sourceType, reducedMotion]);

  // --- 4. Kick playback once deferred sources are rendered ------------------
  // When shouldLoadVideo flips, the <source> children render below. Browsers
  // do not re-run media-resource selection on dynamic <source> insertion, so
  // we explicitly .load() then .play(). Muted autoplay is always allowed.
  useEffect(() => {
    if (!shouldLoadVideo) return;
    const v = videoRef.current;
    if (!v) return;
    try {
      v.load();
      void v.play().catch(() => {
        /* autoplay can be rejected if the tab is backgrounded; poster stays */
      });
    } catch {
      /* no-op — poster remains as fallback */
    }
  }, [shouldLoadVideo]);

  // --- Render ---------------------------------------------------------------

  const showVideoLayer = !reducedMotion && (sourceType === "youtube" || sourceType === "selfHosted");
  // Poster fades out only when the video is actually playing. The 200ms
  // crossfade is between the same-video poster and the same-video first frame,
  // so it is visually imperceptible (per requirement #7).
  const posterHidden = videoReady && showVideoLayer;

  const youtubeEmbedUrl = youtubeVideoId ? buildYouTubeEmbedUrl(youtubeVideoId) : "";

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-ink">
      {/* Layer 1a — same-video poster.
          This is a still frame from the actual nY6XZE6999Y video (downloaded
          from YouTube's thumbnail CDN to /media/hero-video-poster.jpg). It is
          NOT the old VIJAYA architectural hero image. The dark bg-ink base
          shows through if the poster hasn't finished decoding yet, so there
          is never a white flash. */}
      <div
        className="absolute inset-0 transition-opacity duration-200 ease-out"
        style={{
          opacity: posterHidden ? 0 : 1,
          backgroundColor: "#0c0c0c",
        }}
        aria-hidden={posterHidden ? "true" : undefined}
      >
        <Image
          src={posterImage}
          alt={posterAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Layer 1b — video.
          The video CONTAINER (a <div>) is rendered DIRECTLY in JSX so it
          exists from first paint. For YouTube, the YT IFrame API creates the
          <iframe> inside playerHostRef as soon as the API script loads
          (~200-500ms). For self-hosted, the <video> element is rendered
          directly.

          pointer-events: none on every layer so the player is fully
          non-interactive; clicks pass through to overlays / hero copy.

          The wrapper's inline opacity transitions from 0 → 1 over 200ms when
          the first frame plays. Underneath is the same-video poster, so the
          crossfade is visually imperceptible. */}
      {showVideoLayer && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ease-out"
          style={{
            opacity: videoReady ? 1 : 0,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <div ref={videoWrapperRef} className="relative" style={{ pointerEvents: "none" }}>
            {sourceType === "youtube" && youtubeVideoId && (
              <div
                ref={playerHostRef}
                style={{
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              />
            )}
            {sourceType === "selfHosted" && selfHostedSources && (
              <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload={shouldLoadVideo ? "auto" : "none"}
                autoPlay={shouldLoadVideo}
                onPlaying={() => setVideoReady(true)}
                onLoadedData={() => setVideoReady(true)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  pointerEvents: "none",
                }}
              >
                {/* Sources render only once shouldLoadVideo flips true, so zero
                    video bytes are requested before the poster (LCP) is
                    decoded + the hero is interactive. Mobile sources are
                    listed first behind a media query so phones pick the small
                    file; desktop falls through to the larger source. */}
                {shouldLoadVideo && selfHostedSources.mp4Mobile && (
                  <source media="(max-width: 768px)" src={selfHostedSources.mp4Mobile} type="video/mp4" />
                )}
                {shouldLoadVideo && selfHostedSources.webmMobile && (
                  <source media="(max-width: 768px)" src={selfHostedSources.webmMobile} type="video/webm" />
                )}
                {shouldLoadVideo && selfHostedSources.webm && (
                  <source src={selfHostedSources.webm} type="video/webm" />
                )}
                {shouldLoadVideo && selfHostedSources.mp4 && (
                  <source src={selfHostedSources.mp4} type="video/mp4" />
                )}
              </video>
            )}
          </div>
        </div>
      )}

      {/* Layer 2 — overlay (existing VIJAYA vignette + bottom fade), present
          from first paint so there is no brightness change while media loads. */}
      {overlayClassName && <div className={overlayClassName} />}
      {bottomFadeClassName && <div className={bottomFadeClassName} />}
    </div>
  );
}
