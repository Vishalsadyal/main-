import type { Metadata } from "next";
import Link from "next/link";
import { generateMetadata as genMeta, siteConfig } from "@/lib/metadata";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { ULTRA_GFX } from "./app-info";
import styles from "./app.module.css";

export const metadata: Metadata = genMeta({
  title: "Ultra GFX Tool Pro — Tablet View & Graphics Tool for Android",
  description:
    "Give your shooter games an iPad-style wide view on a normal phone, with an in-game floating control, auto mode and graphics presets. No ads, no account, no data collected.",
  path: ULTRA_GFX.path,
});

const FEATURES = [
  {
    icon: "📱",
    title: "Tablet View",
    body: "Play with an iPad 4:3, 3:2 or 16:10 tablet shape, or drag a custom slider. See more of the battlefield above and below.",
  },
  {
    icon: "🖥️",
    title: "Full screen mode",
    tag: "Beta",
    body: "Fills the whole screen with the tablet view, so there are no black bars. Only while your game is open.",
  },
  {
    icon: "⚡",
    title: "Auto mode",
    body: "Turns on when your game opens and puts your phone back to normal the moment you leave it.",
  },
  {
    icon: "🎛️",
    title: "Floating in-game control",
    body: "Switch between Wide, Standard and Custom view, or turn it off, without leaving the match.",
  },
  {
    icon: "🎨",
    title: "Graphics presets",
    body: "12 ready-made setups and a best pick for your phone's RAM and screen, with clear steps to set them in the game.",
  },
  {
    icon: "↩️",
    title: "Restore anytime",
    body: "One tap from the app, the notification or the Quick Settings tile brings your screen back to normal.",
  },
];

const FAQ = [
  {
    q: "Do I need root?",
    a: "No. A one-time setup with the free Shizuku app (about 2 minutes) gives the app permission to change the screen shape. If you have a computer, you can use a single ADB command instead.",
  },
  {
    q: "Does it change my game files?",
    a: "No. Tablet View changes the shape of your phone's display, not the game. Graphics presets are shown as steps you set inside the game yourself.",
  },
  {
    q: "Will I see black bars?",
    a: "In the standard tablet shapes, yes: Android keeps the picture's shape, so a taller view comes with bars on the sides. You choose the balance with the slider. Full screen mode removes the bars by stretching the view slightly.",
  },
  {
    q: "Is it safe for my game account?",
    a: "Tablet View only changes the display size, the same as Android's own screen settings. Full screen mode passes your touches through a helper, which games can notice like key-mapper apps. Use it at your own risk; it is off by default.",
  },
  {
    q: "Which phones does it support?",
    a: `${ULTRA_GFX.minAndroid} or newer. Results depend on your phone and on the game.`,
  },
  {
    q: "Does the app collect my data?",
    a: "No. The app has no ads, no account and no internet access, so nothing you do in it leaves your phone.",
  },
];

export default function UltraGfxToolProPage() {
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
                <img src={ULTRA_GFX.icon} alt="" width={64} height={64} className={styles.appIcon} />
                <div className={styles.appName}>
                  <strong>{ULTRA_GFX.name}</strong>
                  by {siteConfig.name}
                </div>
              </div>

              <h1>
                See more of the <span>battlefield</span>.
              </h1>
              <p className={styles.lead}>
                Ultra GFX Tool Pro gives your games an iPad-style wide view on a normal Android phone,
                with a floating in-game control and graphics presets tuned for your device.
              </p>

              <div className={styles.ctaRow}>
                <a href={ULTRA_GFX.playUrl} className={styles.btnPrimary} target="_blank" rel="noopener noreferrer">
                  ▶ Get it on Google Play
                </a>
                <a href="#how-it-works" className={styles.btnGhost}>
                  How it works
                </a>
              </div>

              <ul className={styles.chips}>
                <li>No ads</li>
                <li>No account</li>
                <li>No data collected</li>
                <li>No root</li>
              </ul>
            </div>

            <div className={styles.compare} aria-hidden="true">
              <div className={styles.phone}>
                <div className={styles.phoneLabel}>
                  <span>Normal phone</span>
                </div>
                <div className={styles.screen}>
                  <div className={`${styles.scene} ${styles.sceneWide}`}>
                    <div className={styles.player} />
                  </div>
                </div>
              </div>
              <div className={styles.phone}>
                <div className={styles.phoneLabel}>
                  <span>With Tablet View</span>
                  <em>More view above &amp; below</em>
                </div>
                <div className={styles.screen}>
                  <div className={`${styles.scene} ${styles.sceneTall}`}>
                    <div className={styles.player} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow}>Features</p>
            <h2>Everything in one tap</h2>
            <p className={styles.sectionLead}>
              Pick your game once. The app handles the rest each time you play, and your phone is back to
              normal the moment you leave the game.
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
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section id="how-it-works" className={styles.section}>
          <div className={styles.wrap}>
            <p className={styles.eyebrow}>How it works</p>
            <h2>Ready in about 2 minutes</h2>
            <p className={styles.sectionLead}>A guided setup that ticks itself off as you go. You only do it once.</p>
            <ol className={styles.steps}>
              <li>
                <strong>Install</strong>
                Get Ultra GFX Tool Pro from Google Play. It is a one-time purchase with no ads or subscriptions.
              </li>
              <li>
                <strong>One-time setup</strong>
                Start the free Shizuku app and allow Ultra GFX Tool Pro. No root and no computer needed.
              </li>
              <li>
                <strong>Pick your game and shape</strong>
                Choose iPad, Tablet or Wide, turn it on, and open your game. Change it any time from the floating button.
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
              <strong>Fair play note:</strong> every game has its own rules. Check your game&apos;s terms before using
              screen or touch tools, and keep Full screen mode off if you are unsure.
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className={`${styles.section} ${styles.final}`}>
          <div className={styles.wrap}>
            <h2>Play wider today</h2>
            <p className={styles.sectionLead} style={{ marginLeft: "auto", marginRight: "auto" }}>
              Questions before you buy? Message us and we&apos;ll help you get set up.
            </p>
            <div className={styles.ctaRow}>
              <a href={ULTRA_GFX.playUrl} className={styles.btnPrimary} target="_blank" rel="noopener noreferrer">
                ▶ Get it on Google Play
              </a>
              <a href={ULTRA_GFX.whatsapp} className={styles.btnGhost} target="_blank" rel="noopener noreferrer">
                Help on WhatsApp
              </a>
              <Link href={ULTRA_GFX.privacyPath} className={styles.btnGhost}>
                Privacy policy
              </Link>
            </div>
            <p className={styles.finePrint}>
              {ULTRA_GFX.name} is an independent tool made by {siteConfig.name}. It is not affiliated with, endorsed
              by or sponsored by Krafton, Tencent or any other game publisher. Game names are trademarks of their
              owners. Google Play and the Google Play logo are trademarks of Google LLC.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
