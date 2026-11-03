import type { Metadata } from "next";
import Link from "next/link";
import { generateMetadata as genMeta, siteConfig } from "@/lib/metadata";
import { Header } from "../../../components/Header";
import { Footer } from "../../../components/Footer";
import { HOMEFIT } from "../app-info";
import styles from "../app.module.css";

export const metadata: Metadata = genMeta({
  title: "HomeFit Pro Privacy Policy",
  description:
    "HomeFit Pro does not collect, store on a server or share any personal data. Your workouts, progress and settings stay on your phone.",
  path: HOMEFIT.privacyPath,
});

export default function HomeFitPrivacyPolicy() {
  const email = siteConfig.contact.email.general;

  return (
    <div className={styles.page}>
      <Header />

      <main id="main-content" tabIndex={-1}>
        <section className={styles.policyHero}>
          <div className={styles.wrap}>
            <Link href={HOMEFIT.path} className={styles.backLink}>
              ← {HOMEFIT.name}
            </Link>
            <h1>{HOMEFIT.name} Privacy Policy</h1>
            <p>Last updated: {HOMEFIT.policyUpdated}</p>
          </div>
        </section>

        <div className={styles.wrap}>
          <article className={styles.policy}>
            <div className={styles.summaryBox}>
              <p>
                <strong>In short:</strong> {HOMEFIT.name} does not collect, store on a server or share any personal
                data. It has no ads, no analytics and no account. Your workouts, progress and settings stay on your
                phone.
              </p>
            </div>

            <h2>1. Who we are</h2>
            <p>
              {HOMEFIT.name} (package <code>{HOMEFIT.packageName}</code>) is an Android fitness app published on Google
              Play by {siteConfig.name}, {siteConfig.contact.offices.india.fullAddress}. This policy explains what the
              app does with information on your device.
            </p>

            <h2>2. Information stored on your phone</h2>
            <p>To work, the app saves the following in its private storage on your device. None of it is sent to us.</p>
            <ul>
              <li>
                <strong>Your name or nickname:</strong> the name you type on the welcome screen, used to greet you.
              </li>
              <li>
                <strong>Workout progress:</strong> which challenge days you finished, the date and how long they took,
                used for your streak, calendar and trophies.
              </li>
              <li>
                <strong>Your settings:</strong> difficulty, rest length, voice and sound options, reminder time,
                knee-friendly mode, train-ahead and language.
              </li>
            </ul>

            <h2>3. Permissions and why we ask for them</h2>
            <ul>
              <li>
                <strong>Notifications:</strong> only if you turn on the daily reminder. Reminders are scheduled on your
                phone; no push server is used.
              </li>
              <li>
                <strong>Vibration:</strong> for workout cues such as the start of an exercise and the countdown.
              </li>
              <li>
                <strong>Files you choose:</strong> only when you export or restore a backup, or share a progress card.
                You pick the file or the app it goes to.
              </li>
            </ul>
            <p>
              The app does not request your location, contacts, camera, microphone, health records or advertising ID.
            </p>

            <h2>4. Data collection and sharing</h2>
            <p>
              We do not collect, sell or share any personal or device data. The app contains no advertising SDKs and no
              analytics or crash-reporting services, and it does not send your information over the internet.
            </p>

            <h2>5. Things you choose to share</h2>
            <ul>
              <li>
                <strong>Progress backups:</strong> &quot;Export&quot; creates a small file with your progress and opens
                your phone&apos;s share sheet so you can save it where you like, for example Google Drive or email.
              </li>
              <li>
                <strong>Progress cards:</strong> &quot;Share my progress&quot; creates an image of your day card for
                you to share. Nothing is sent unless you pick an app and send it.
              </li>
              <li>
                <strong>Ratings:</strong> the app may show Google Play&apos;s rating prompt. Ratings and reviews are
                handled by Google Play.
              </li>
            </ul>
            <p>Any service you share to is governed by that service&apos;s own privacy policy.</p>

            <h2>6. Device backup</h2>
            <p>
              If Android backup is turned on in your phone settings, Android may include the app&apos;s data in your
              device&apos;s backup to your Google account so it can be restored on a new phone. This is handled by
              Google under your Google account&apos;s terms; we never receive it.
            </p>

            <h2>7. Payments</h2>
            <p>
              If you buy the app or anything in it, the payment is processed entirely by Google Play. We never see your
              card or payment details. See the{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                Google Privacy Policy
              </a>
              .
            </p>

            <h2>8. Keeping and deleting your data</h2>
            <p>
              Your data stays on your phone until you restart a challenge, clear the app&apos;s data or uninstall the
              app, which deletes it. Because we hold no data about you, there is nothing for us to delete on a server.
            </p>

            <h2>9. Children</h2>
            <p>
              The app is not directed at children under 13, and we do not knowingly collect information from anyone.
            </p>

            <h2>10. Health disclaimer</h2>
            <p>
              The workouts are for general fitness and are not medical advice. Consult a doctor before starting any
              exercise program, and stop if you feel pain, dizziness or shortness of breath.
            </p>

            <h2>11. Changes to this policy</h2>
            <p>
              If the app changes how it handles information, we will update this page and the &quot;Last updated&quot;
              date above before the new version is released.
            </p>

            <h2>12. Contact</h2>
            <p>
              Questions about this policy? Email <a href={`mailto:${email}`}>{email}</a>, message us on{" "}
              <a href={HOMEFIT.whatsapp} target="_blank" rel="noopener noreferrer">
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
