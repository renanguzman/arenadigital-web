"use client";

import { useEffect, useRef } from "react";

export function HeroAnimation() {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        // Ensure muted autoplay works across all browsers
        video.muted = true;
        video.play().catch(() => {/* autoplay blocked, video stays paused */});
    }, []);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden bg-[var(--arena-navy-900)]">
            <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover opacity-[0.58]"
                aria-hidden="true"
            >
                {/* WebM first — smaller, better for Chrome/Firefox/Edge */}
                <source src="/videos/hero01.webm" type="video/webm" />
                {/* MP4 fallback — Safari, iOS, older browsers */}
                <source src="/videos/hero01-opt.mp4" type="video/mp4" />
            </video>

            {/* Same overlays as before */}
            <div className="pointer-events-none absolute inset-0 bg-[rgba(0,29,45,0.62)] mix-blend-multiply" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,21,36,0.24)_0%,rgba(0,29,45,0.58)_55%,rgba(0,21,36,0.98)_100%)]" />
        </div>
    );
}
