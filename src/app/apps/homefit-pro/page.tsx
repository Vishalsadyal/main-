import type { Metadata } from "next";
import Link from "next/link";
import { generateMetadata as genMeta, siteConfig } from "@/lib/metadata";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { HOMEFIT } from "./app-info";
import styles from "./app.module.css";

export const metadata: Metadata = genMeta({
  title: "HomeFit Pro — 30-Day Home Workout Challenges (Offline)",
  description:
    "30-day home workout challenges and 6-week strength programs with a real demo for every move and a voice coach. Works offline. No ads, no subscription, no sign-up.",
  path: HOMEFIT.path,
});

const FEATURES = [
  {
    icon: "🗓️",
    title: "14 programs",
    body: "8 × 30-day challenges (abs, arms, chest, legs, HIIT, full body, back, bodyweight) plus 6 six-week strength programs.",
  },
  {
    icon: "🎬",
    title: "A real demo for every move",
    body: "460 exercises, each with a looping demo by a real trainer, so you always know the right form.",
  },
  {
    icon: "🎧",
    title: "Voice coach",
    body: "\"Rest. Next up…\", halfway cues and 3-2-1 beeps. Plays over your own music, even with the phone on silent.",
  },
  {
    icon: "🦵",
    title: "Knee-friendly mode",
    tag: "New",
    body: "Swaps jumps, burpees and sprints for no-jump moves. Too hard? Swap any move for an easier one mid-workout.",
  },
  {
    icon: "📶",
    title: "Works 100% offline",
    body: "Every workout, demo and coach line is inside the app. No Wi-Fi or mobile data needed, ever.",
  },
  {
    icon: "🔥",
    title: "Streaks & reminders",
    body: "One new day unlocks every day, with a daily reminder, a history calendar, trophies and a shareable day card.",
  },
];

const FAQ = [
  {
    q: "Do I need equipment?",
    a: "Most programs need nothing at all. Some use a pair of dumbbells or a resistance band, and each program says so clearly before you start.",
  },
  {
    q: "Is it really free of ads and subscriptions?",
    a: "Yes. There are no ads, no subscription and no account. You open the app and start training.",
  },
  {
    q: "Does it work without internet?",
    a: "Yes. Everything is built into the app, including exercise demos and the voice coach, so it works on a plane, in a basement or with mobile data off.",
  },
  {
    q: "I'm a beginner. Is it too hard?",
    a: "Choose easy, normal or hard difficulty and short, normal or long rest. Workouts start short and step up every week, and you can swap any move for an easier one.",
  },
  {
    q: "What if I change phones?",
    a: "Use Export in the app to save your progress as a file (Google Drive, WhatsApp or email) and Restore it on the new phone. Android's own backup can also restore it.",
  },
  {
    q: "Which languages are supported?",
    a: "English, Spanish, Hindi and Portuguese. The app follows your phone's language automatically, or you can pick one.",
  },
];

export default function HomeFitProPage() {
  return (
    <div className={styles.page}>
      <Header />

      <main id="main-content" tabIndex={-1}>
        {/* ===== HERO ===== */}
        <section className={styles.hero}>
          <div className={`${styles.wrap} ${styles.heroGrid}`}>
            <div>
              <div className={styles.appRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={HOMEFIT.icon} alt="" width={64} height={64} className={styles.appIcon} />
                <div className={styles.appName}>
                  <strong>{HOMEFIT.name}</strong>
                  by {siteConfig.name}
                </div>
              </div>

              <h1>
                30-day home workouts. <span>No gym needed.</span>
              </h1>
              <p className={styles.lead}>
                HomeFit Pro turns short, intense home workouts into challenges you actually finish: a new day every
                day, a real demo for every move and a voice coach in your ear.
              </p>

              <div className={styles.ctaRow}>
                <a href={HOMEFIT.playUrl} className={styles.btnPrimary} target="_blank" rel="noopener noreferrer">
                  ▶ Get it on Google Play
                </a>
                <a href="#how-it-works" className={styles.btnGhost}>
                  How it works
                </a>
              </div>

              <ul className={styles.chips}>
                <li>No ads</li>
                <li>No subscription</li>
                <li>No sign-up</li>
                <li>Works offline</li>
              </ul>
            </div>

            <div className={styles.shots} aria-hidden="true">
              {HOMEFIT.screenshots.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" width={540} height={960} loading="lazy" />
              ))}
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow}>Features</p>
            <h2>Everything you need to finish all 30 days</h2>
            <p className={styles.sectionLead}>
              Most people quit a 30-day challenge by day 5. HomeFit Pro is built to keep you going: short sessions,
              clear demos, a coach and a streak you won&apos;t want to break.
            </p>
            <div className={styles.grid3}>
              {FEATURES.map((f) => (
                <div key={f.title} className={styles.card}>
                  <div className={styles.cardIcon} aria-hidden="true">
                    {f.icon}
                  </div>
                  <h3>
                    {f.title}
                    {f.tag && <span className={styles.tag}>{f.tag}</span>}
                  </h3>
                  <p>{f.body}</p>
                </div>
              ))}
            </div>
            <div className={styles.stats}>
              <div className={styles.stat}>
                <strong>14</strong>
                <span>programs</span>
              </div>
              <div className={styles.stat}>
                <strong>460</strong>
                <span>exercise demos</span>
              </div>
              <div className={styles.stat}>
                <strong>4–35</strong>
                <span>minutes a day</span>
              </div>
              <div className={styles.stat}>
                <strong>4</strong>
                <span>languages</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section id="how-it-works" className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow}>How it works</p>
            <h2>Start in 30 seconds</h2>
            <p className={styles.sectionLead}>No account, no forms. Type your name and pick a challenge.</p>
            <ol className={styles.steps}>
              <li>
                <strong>Install</strong>
                Get HomeFit Pro from Google Play. No ads, no subscription, no sign-up.
              </li>
              <li>
                <strong>Pick your challenge</strong>
                Choose a 30-day challenge or a 6-week strength program, plus your difficulty and rest length.
              </li>
              <li>
                <strong>Show up every day</strong>
                Follow the demo and the voice coach. One new day unlocks every day until you finish.
              </li>
            </ol>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow}>FAQ</p>
            <h2>Questions, answered honestly</h2>
            <div className={styles.faq}>
              {FAQ.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
            <div className={styles.notice}>
              <strong>Health note:</strong> check with a doctor before starting any exercise program, and stop if
              you feel pain, dizziness or shortness of breath.
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className={`${styles.section} ${styles.final}`}>
          <div className={styles.wrap}>
            <h2>Day 1 starts today</h2>
            <p className={styles.sectionLead} style={{ marginLeft: "auto", marginRight: "auto" }}>
              Questions? Message us and we&apos;ll help you pick the right challenge.
            </p>
            <div className={styles.ctaRow}>
              <a href={HOMEFIT.playUrl} className={styles.btnPrimary} target="_blank" rel="noopener noreferrer">
                ▶ Get it on Google Play
              </a>
              <a href={HOMEFIT.whatsapp} className={styles.btnGhost} target="_blank" rel="noopener noreferrer">
                Help on WhatsApp
              </a>
              <Link href={HOMEFIT.privacyPath} className={styles.btnGhost}>
                Privacy policy
              </Link>
            </div>
            <p className={styles.finePrint}>
              {HOMEFIT.name} is made by {siteConfig.name}. Workout programs by Mike Rosa; exercise demos by Exerprise.
              Google Play and the Google Play logo are trademarks of Google LLC.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
