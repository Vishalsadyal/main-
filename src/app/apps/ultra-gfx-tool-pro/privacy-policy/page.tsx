import type { Metadata } from "next";
import Link from "next/link";
import { generateMetadata as genMeta, siteConfig } from "@/lib/metadata";
import { Header } from "../../../components/Header";
import { Footer } from "../../../components/Footer";
import { ULTRA_GFX } from "../app-info";
import styles from "../app.module.css";

export const metadata: Metadata = genMeta({
  title: "Ultra GFX Tool Pro Privacy Policy",
  description:
    "Ultra GFX Tool Pro does not collect, store on a server or share any personal data. Learn what the app reads on your phone, which permissions it uses and why.",
  path: ULTRA_GFX.privacyPath,
});

export default function UltraGfxPrivacyPolicy() {
  const email = siteConfig.contact.email.general;

  return (
    <div className={styles.page}>
      <Header />

      <main id="main-content" tabIndex={-1}>
        <section className={styles.policyHero}>
          <div className={styles.wrap}>
            <Link href={ULTRA_GFX.path} className={styles.backLink}>
              ← {ULTRA_GFX.name}
            </Link>
            <h1>{ULTRA_GFX.name} Privacy Policy</h1>
            <p>Last updated: {ULTRA_GFX.policyUpdated}</p>
          </div>
        </section>

        <div className={styles.wrap}>
          <article className={styles.policy}>
            <div className={styles.summaryBox}>
              <p>
                <strong>In short:</strong> {ULTRA_GFX.name} does not collect, store on a server or share any personal
                data. It has no ads, no analytics, no account and no internet access. Everything it uses stays on your
                phone.
              </p>
            </div>

            <h2>1. Who we are</h2>
            <p>
              {ULTRA_GFX.name} (package <code>{ULTRA_GFX.packageName}</code>) is an Android app published on Google
              Play by {siteConfig.name}, {siteConfig.contact.offices.india.fullAddress}. This policy explains what the
              app does with information on your device.
            </p>

            <h2>2. Information the app uses on your phone</h2>
            <p>To work, the app reads the following on your device. None of it is sent to us or to anyone else.</p>
            <ul>
              <li>
                <strong>Device details:</strong> screen resolution and shape, refresh rate, RAM, device model and
                Android version, to show a preview and recommend graphics presets for your phone.
              </li>
              <li>
                <strong>Installed games and apps:</strong> whether supported games are installed, and the list of
                launchable apps when you choose &quot;Add game&quot;.
              </li>
              <li>
                <strong>Which app is open (Usage access):</strong> only to turn Tablet View on when your selected game
                opens and off when you leave it.
              </li>
              <li>
                <strong>Your settings:</strong> your selected game, view shape, graphics choices and app preferences,
                saved in the app&apos;s private storage on your phone.
              </li>
            </ul>

            <h2>3. Permissions and why we ask for them</h2>
            <ul>
              <li>
                <strong>Change system display settings (WRITE_SECURE_SETTINGS):</strong> granted once during setup
                through Shizuku or ADB, to change and restore the screen size.
              </li>
              <li>
                <strong>Display over other apps:</strong> for the floating in-game control, and so touch works across
                the whole screen in Full screen mode.
              </li>
              <li>
                <strong>Usage access:</strong> to detect when your selected game opens or closes (Auto mode).
              </li>
              <li>
                <strong>Foreground service and notifications:</strong> to keep Auto mode running while you play and to
                show a notification with a &quot;Restore&quot; button.
              </li>
              <li>
                <strong>Network state:</strong> only to check whether Wi-Fi is connected during setup, because
                Shizuku&apos;s wireless debugging needs it. The app does not use the internet.
              </li>
            </ul>

            <h2>4. Shizuku and the Full screen helper</h2>
            <p>
              With your permission, the app uses the Shizuku app to grant its own setup permissions and to run
              Android&apos;s screen size commands. If you turn on <strong>Full screen mode</strong>, a helper also
              reads your touchscreen input and replays it on a virtual input device, so your touches line up with the
              stretched picture. This happens in real time on your phone only: touches are never recorded, stored or
              sent anywhere. Full screen mode is off by default.
            </p>

            <h2>5. Data collection and sharing</h2>
            <p>
              We do not collect, sell or share any personal or device data. The app contains no advertising SDKs, no
              analytics or crash-reporting services, and does not request the internet permission.
            </p>

            <h2>6. Things you choose to share</h2>
            <ul>
              <li>
                <strong>Settings codes:</strong> &quot;Share my settings&quot; creates a code that you can copy and send
                to a friend yourself. The app does not send it anywhere.
              </li>
              <li>
                <strong>WhatsApp support:</strong> &quot;Help &amp; support&quot; opens WhatsApp with a message that
                includes the app version, phone model and Android version. Nothing is sent unless you press send in
                WhatsApp. Messages you send us are used only to help you and are handled under WhatsApp&apos;s own
                privacy policy.
              </li>
            </ul>

            <h2>7. Payments</h2>
            <p>
              The app is a paid download, processed entirely by Google Play. We never see your card or payment details.
              Google provides developers with standard order records (such as the order number, country and price).
              See the{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                Google Privacy Policy
              </a>
              .
            </p>

            <h2>8. Keeping and deleting your data</h2>
            <p>
              Your settings stay on your phone until you clear the app&apos;s data or uninstall it, which deletes them
              completely. The app does not create backups in the cloud. Because we hold no data about you, there is
              nothing for us to delete on a server.
            </p>

            <h2>9. Children</h2>
            <p>
              The app is not directed at children under 13, and we do not knowingly collect information from anyone.
            </p>

            <h2>10. Changes to this policy</h2>
            <p>
              If the app changes how it handles information, we will update this page and the &quot;Last updated&quot;
              date above before the new version is released.
            </p>

            <h2>11. Contact</h2>
            <p>
              Questions about this policy? Email <a href={`mailto:${email}`}>{email}</a>, message us on{" "}
              <a href={ULTRA_GFX.whatsapp} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>{" "}
              ({siteConfig.contact.phone.india}), or write to {siteConfig.name},{" "}
              {siteConfig.contact.offices.india.fullAddress}.
            </p>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
