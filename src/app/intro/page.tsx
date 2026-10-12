// The W3Tech intro video, as a page we can link from WhatsApp (shows a thumbnail card in the chat).
import type { Metadata } from "next";
import Link from "next/link";
import { generateMetadata as genMeta, siteConfig } from "@/lib/metadata";

const base = genMeta({
  title: "Watch: A professional website for your business",
  description: "45-second video — website, domain, hosting and Google Maps setup, ready in 2–3 days.",
  path: "/intro",
  ogImage: "/w3tech-intro-share.jpg",
});

export const metadata: Metadata = {
  ...base,
  openGraph: {
    ...base.openGraph,
    videos: [{ url: `${siteConfig.url}/w3tech-intro.mp4`, type: "video/mp4", width: 1080, height: 1920 }],
  },
};

const phone = siteConfig.contact.phone.india.replace(/\D/g, "");
const whatsapp = `https://wa.me/${phone}?text=${encodeURIComponent("Hi W3Tech, I watched your video. I'd like a website for my business.")}`;

export default function IntroPage() {
  return (
    <main style={{ minHeight: "100dvh", background: "#0f172a", color: "#fff", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 18, padding: "20px 16px 32px", fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <video src="/w3tech-intro.mp4" poster="/w3tech-intro-poster.jpg" controls playsInline preload="metadata"
        style={{ width: "100%", maxWidth: 420, aspectRatio: "9 / 16", borderRadius: 20, background: "#000",
          boxShadow: "0 20px 50px rgba(0,0,0,.45)" }} />
      <h1 style={{ margin: 0, color: "#fff", fontSize: 24, fontWeight: 800, textAlign: "center", lineHeight: 1.25, maxWidth: 420 }}>
        A professional website for your business — <span style={{ color: "#f97316" }}>ready in 2–3 days</span>
      </h1>
      <a href={whatsapp} style={{ background: "#22c55e", color: "#fff", fontWeight: 800, fontSize: 18, padding: "14px 28px",
        borderRadius: 999, textDecoration: "none" }}>
        💬 Chat on WhatsApp
      </a>
      <Link href="/" style={{ color: "#94a3b8", fontSize: 14 }}>www.w3tech.co.in</Link>
    </main>
  );
}
