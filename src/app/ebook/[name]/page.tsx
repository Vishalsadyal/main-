"use client";

import React, { useState, use } from 'react';
import Script from 'next/script';
import styles from './ebook.module.css';

interface OrderResponse {
  ok: boolean;
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  error?: string;
}

interface VerifyResponse {
  ok: boolean;
  verified?: boolean;
  downloadUrl?: string;
  filename?: string;
  paymentId?: string;
  error?: string;
}

export default function DynamicEbookPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const resolvedParams = use(params);
  const rawSlug = resolvedParams?.name || 'shastra-and-science';

  // Format readable title from slug
  const formattedSlugTitle = rawSlug
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState<{
    paymentId: string;
    downloadUrl: string;
  } | null>(null);

  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number for receipt updates.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create order on server
      const res = await fetch('/api/ebook/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          slug: rawSlug,
        }),
      });

      const data: OrderResponse = await res.json();

      if (!res.ok || !data.ok || !data.orderId || !data.keyId) {
        throw new Error(data.error || 'Failed to initialize payment gateway.');
      }

      // 2. Open Razorpay Checkout modal
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      const options = {
        key: data.keyId,
        amount: data.amount || 14900,
        currency: data.currency || 'INR',
        name: 'Shastra & Science',
        description: `${formattedSlugTitle} (62-Page Archival PDF)`,
        image: '/ebook/emblem_logo.png',
        order_id: data.orderId,
        prefill: {
          name: name.trim(),
          email: email.trim(),
          contact: phone.trim(),
        },
        theme: {
          color: '#d4af37',
        },
        handler: async function (response: any) {
          try {
            // 3. Verify payment on server
            const verifyRes = await fetch('/api/ebook/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim(),
                slug: rawSlug,
              }),
            });

            const verifyData: VerifyResponse = await verifyRes.json();

            if (verifyRes.ok && verifyData.ok && verifyData.downloadUrl) {
              setSuccessInfo({
                paymentId: response.razorpay_payment_id,
                downloadUrl: verifyData.downloadUrl,
              });

              // Automatically trigger the file download
              const downloadLink = document.createElement('a');
              downloadLink.href = verifyData.downloadUrl;
              downloadLink.download = 'Shastra_and_Science_30_Day_Master_Field_Guide.pdf';
              document.body.appendChild(downloadLink);
              downloadLink.click();
              document.body.removeChild(downloadLink);
            } else {
              setErrorMessage(verifyData.error || 'Payment verification failed. Please contact support.');
            }
          } catch (err: any) {
            console.error('Verification error:', err);
            setErrorMessage('Payment succeeded, but download verification timed out. Please contact support.');
          } finally {
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
          },
        },
      };

      const rzpInstance = new Razorpay(options);
      rzpInstance.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Razorpay Checkout Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className={styles.ambientGlow1} />
      <div className={styles.ambientGlow2} />

      {/* Top Announcement Bar */}
      <div className={styles.topBanner}>
        <span className={styles.bannerPulse} />
        <span>Limited Launch Offer: 70% Off • Only ₹149 for the first 500 copies</span>
      </div>

      {/* Custom Isolated Header (No W3Tech Global Nav/Footer) */}
      <header className={styles.customHeader}>
        <div className={styles.headerContainer}>
          <a href="#" className={styles.brandGroup}>
            <img
              src="/ebook/emblem_logo.png"
              alt="Shastra & Science Gold Emblem"
              className={styles.brandLogo}
            />
            <div className={styles.brandTextGroup}>
              <span className={styles.brandName}>SHASTRA &amp; SCIENCE</span>
              <span className={styles.brandBadge}>Official Field Guide</span>
            </div>
          </a>

          <nav className={styles.navLinks}>
            <a href="#curriculum" className={styles.navLink}>30-Day Curriculum</a>
            <a href="#preview" className={styles.navLink}>Sample Sneak Peek</a>
            <a href="#pillars" className={styles.navLink}>The Evidence</a>
            <a href="#faq" className={styles.navLink}>FAQ</a>
          </nav>

          <a href="#checkout-card" className={styles.headerCta}>
            Get eBook ₹149
          </a>
        </div>
      </header>

      {/* HERO SECTION (Netguru Split Pattern) */}
      <main>
        <section className={styles.heroSection}>
          <div className={styles.heroGrid}>
            {/* Left Column: Title, Book 3D Showcase & Metrics */}
            <div className={styles.heroLeft}>
              <div className={styles.archivalTag}>
                <span>⚜</span> Official 62-Page Archival Field Guide
              </div>

              <h1 className={styles.heroTitle}>
                Ancient Shastra Meets <br />
                <span className={styles.heroTitleGold}>Modern Science</span>
              </h1>

              <p className={styles.heroSubtitle}>
                The complete, peer-reviewed clinical companion guide to all 30 days of the viral explainer series (@shastraandscience). Exact Sanskrit verses, PubMed trials, and museum-grade archival plates in one collector’s edition.
              </p>

              {/* 3D Hardcover Book Mockup */}
              <div className={styles.bookDisplayContainer}>
                <div
                  className={styles.bookMockup3D}
                  onClick={() => {
                    const el = document.getElementById('checkout-card');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  title="Click to claim your copy"
                >
                  <img
                    src="/ebook/ebook_cover.jpg"
                    alt="Shastra & Science 30-Day Master Field Guide 3D Cover"
                    className={styles.bookCoverImg}
                  />
                </div>
              </div>

              {/* Metric Badges */}
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <span className={styles.metricNumber}>62</span>
                  <span className={styles.metricLabel}>Archival Pages</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricNumber}>30</span>
                  <span className={styles.metricLabel}>Days Verified</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricNumber}>120+</span>
                  <span className={styles.metricLabel}>PubMed Citations</span>
                </div>
                <div className={styles.metricCard}>
                  <span className={styles.metricNumber}>Instant</span>
                  <span className={styles.metricLabel}>PDF Download</span>
                </div>
              </div>
            </div>

            {/* Right Column: Netguru Direct Buy & Download Form Card */}
            <div className={styles.heroRight}>
              <div className={styles.checkoutCard} id="checkout-card">
                <div className={styles.checkoutHeader}>
                  <span className={styles.cardBadge}>
                    <span className={styles.pulseGreen} /> Instant PDF Access
                  </span>
                  <span className={styles.cardRating}>★ 4.98 / 5.0 Rating</span>
                </div>

                <h2 className={styles.checkoutTitle}>Claim Your Master Field Guide</h2>

                <div className={styles.pricingRow}>
                  <span className={styles.priceCurrent}>₹149</span>
                  <span className={styles.priceOriginal}>₹499</span>
                  <span className={styles.priceDiscountBadge}>Save 70% Today</span>
                </div>

                {errorMessage && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#fca5a5',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: 'var(--font-size-sm, 0.875rem)',
                    marginBottom: '16px',
                  }}>
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleCheckout}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Aryan Sharma"
                      className={styles.formInput}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Email Address (For Instant Download Link)</label>
                    <input
                      type="email"
                      required
                      placeholder="aryan@example.com"
                      className={styles.formInput}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>WhatsApp / Mobile Number (For Receipt)</label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      className={styles.formInput}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <ul className={styles.formFeatures}>
                    <li className={styles.formFeatureItem}>
                      <span className={styles.featureCheck}>✓</span> Complete 62-Page High-Res Field Guide (74.5 MB)
                    </li>
                    <li className={styles.formFeatureItem}>
                      <span className={styles.featureCheck}>✓</span> Sanskrit verses with chapter &amp; verse reference
                    </li>
                    <li className={styles.formFeatureItem}>
                      <span className={styles.featureCheck}>✓</span> 1-Click UPI Payment (GPay, PhonePe, Paytm, Cards)
                    </li>
                    <li className={styles.formFeatureItem}>
                      <span className={styles.featureCheck}>✓</span> Instant automated download on payment confirmation
                    </li>
                  </ul>

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span>Opening Secure Razorpay...</span>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Buy &amp; Download Guide (₹149)</span>
                      </>
                    )}
                  </button>
                </form>

                <div className={styles.paymentMethodsBar}>
                  <span className={styles.paymentMethodsText}>Supported Payment Options</span>
                  <div className={styles.upiPills}>
                    <span className={styles.upiPill}>Google Pay</span>
                    <span className={styles.upiPill}>PhonePe</span>
                    <span className={styles.upiPill}>Paytm</span>
                    <span className={styles.upiPill}>BHIM UPI</span>
                    <span className={styles.upiPill}>RuPay / Cards</span>
                    <span className={styles.upiPill}>NetBanking</span>
                  </div>
                </div>

                <div className={styles.securityNote}>
                  <span>🔒</span> 256-Bit SSL Encrypted Checkout via Razorpay
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 30-DAY MASTER CURRICULUM */}
        <section className={styles.sectionWrapper} id="curriculum">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>COMPREHENSIVE 30-DAY BREAKDOWN</span>
            <h2 className={styles.sectionHeading}>6 Thematic Modules • 30 Groundbreaking Days</h2>
            <p className={styles.sectionDescription}>
              From Sushruta’s operating table in 600 BCE to modern quantum physics and neurobiology, explore every chapter backed by direct historical manuscripts and peer-reviewed trials.
            </p>
          </div>

          <div className={styles.modulesGrid}>
            {/* Module 1 */}
            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 1 • Days 01–05</span>
              <h3 className={styles.moduleTitle}>The Surgical Legacy of Sushruta</h3>
              <ul className={styles.moduleDaysList}>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 01:</span> Rhinoplasty &amp; The Forehead Flap (Sutrasthana 16)
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 02:</span> Cataract Couching &amp; Ophthalmology
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 03:</span> Ancient Anesthesia &amp; Pain Protocols
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 04:</span> Complex Bone Setting &amp; Traction Splints
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 05:</span> 125 Surgical Yantras &amp; Modern Scalpels
                </li>
              </ul>
            </div>

            {/* Module 2 */}
            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 2 • Days 06–10</span>
              <h3 className={styles.moduleTitle}>Internal Medicine &amp; Charaka Samhita</h3>
              <ul className={styles.moduleDaysList}>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 06:</span> Charaka’s Cardiovascular Circulation
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 07:</span> Botanical Pharmacology &amp; Curcumin Bioavailability
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 08:</span> Janapadodhvamsa: Ancient Epidemic Protocols
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 09:</span> The 1794 Gentleman’s Magazine Proof Archive
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 10:</span> Mid-Series Milestone: The Surgical Synthesis
                </li>
              </ul>
            </div>

            {/* Module 3 */}
            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 3 • Days 11–15</span>
              <h3 className={styles.moduleTitle}>Consciousness &amp; Neurobiology</h3>
              <ul className={styles.moduleDaysList}>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 11:</span> Patanjali &amp; Harvard fMRI Meditation Trials
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 12:</span> Pranayama &amp; Vagus Nerve Stimulation
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 13:</span> Dinacharya &amp; Nobel Circadian Clock Science
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 14:</span> Sound Frequencies, Om &amp; Gamma Wave Entrainment
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 15:</span> Yoga Nidra &amp; Synaptic Pruning Neuroplasticity
                </li>
              </ul>
            </div>

            {/* Module 4 */}
            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 4 • Days 16–20</span>
              <h3 className={styles.moduleTitle}>Vedic Metallurgy &amp; Chemistry</h3>
              <ul className={styles.moduleDaysList}>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 16:</span> The Zawar Zinc Smelting Retorts (Rasaratna Samuccaya)
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 17:</span> Wootz Crucible Steel &amp; Damascus Swords
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 18:</span> The Delhi Iron Pillar &amp; Misawite Rust Resistance
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 19:</span> Rasashastra Alchemy: Purified Mineral Bhasmas
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 20:</span> Copper Antimicrobial Surfaces &amp; Water Purification
                </li>
              </ul>
            </div>

            {/* Module 5 */}
            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 5 • Days 21–25</span>
              <h3 className={styles.moduleTitle}>Mathematics &amp; Cosmic Cycles</h3>
              <ul className={styles.moduleDaysList}>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 21:</span> Pingala’s Chhandashastra: Binary Logic &amp; Combinatorics
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 22:</span> Aryabhata: Earth’s Rotation &amp; Trigonometric Sine
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 23:</span> Madhava of Sangamagrama: Infinite Calculus Series
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 24:</span> Brahmagupta &amp; The Operational Mathematics of Zero
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 25:</span> Surya Siddhanta: Precision Eclipse Calculations
                </li>
              </ul>
            </div>

            {/* Module 6 */}
            <div className={styles.moduleCard}>
              <span className={styles.moduleTag}>Module 6 • Days 26–30</span>
              <h3 className={styles.moduleTitle}>Ecology, Architecture &amp; The Future</h3>
              <ul className={styles.moduleDaysList}>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 26:</span> Vastu Purusha Mandala: Thermal Microclimate Physics
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 27:</span> Stepped Baolis &amp; Subterranean Water Engineering
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 28:</span> Vrikshayurveda: Ancient Botanical Agriculture
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 29:</span> Scientific Rigor: Separating Fact from Superstition
                </li>
                <li className={styles.dayItem}>
                  <span className={styles.dayNumber}>Day 30:</span> The Grand Finale: Grounded in Truth, Proud of Heritage
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 3: SNEAK PEEK GALLERY */}
        <section className={styles.sectionWrapper} id="preview">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>MUSEUM QUALITY ARCHIVE</span>
            <h2 className={styles.sectionHeading}>Take A Look Inside The Field Guide</h2>
            <p className={styles.sectionDescription}>
              Designed with double antique borders, Sanskrit slokas in Devanagari typography, English transliterations, and clinical comparative diagrams.
            </p>
          </div>

          <div className={styles.previewGrid}>
            <div className={styles.previewCard}>
              <div className={styles.previewImageContainer}>
                <img
                  src="/ebook/sample_surgery.jpg"
                  alt="Day 01 Reconstructive Surgery Plate"
                  className={styles.previewImage}
                />
              </div>
              <div className={styles.previewMeta}>
                <span className={styles.previewDayBadge}>Day 01 Preview</span>
                <h4 className={styles.previewTitle}>Sushruta's Forehead Flap</h4>
                <p className={styles.previewDesc}>The exact 4-step surgical method with leaf template, still used today in modern reconstructive rhinoplasty.</p>
              </div>
            </div>

            <div className={styles.previewCard}>
              <div className={styles.previewImageContainer}>
                <img
                  src="/ebook/sample_instruments.jpg"
                  alt="Day 05 Surgical Yantras Plate"
                  className={styles.previewImage}
                />
              </div>
              <div className={styles.previewMeta}>
                <span className={styles.previewDayBadge}>Day 05 Preview</span>
                <h4 className={styles.previewTitle}>125 Surgical Yantras</h4>
                <p className={styles.previewDesc}>Classified blunt and sharp surgical instruments, comparing ancient forged steel to contemporary modern scalpels.</p>
              </div>
            </div>

            <div className={styles.previewCard}>
              <div className={styles.previewImageContainer}>
                <img
                  src="/ebook/sample_synthesis.jpg"
                  alt="Day 09 Historical Proof Plate"
                  className={styles.previewImage}
                />
              </div>
              <div className={styles.previewMeta}>
                <span className={styles.previewDayBadge}>Day 09 Preview</span>
                <h4 className={styles.previewTitle}>The 1794 London Proof</h4>
                <p className={styles.previewDesc}>Gentleman's Magazine dispatch recording British surgeons learning rhinoplasty in Pune, altering European surgery forever.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: 4 SCIENTIFIC PILLARS */}
        <section className={styles.sectionWrapper} id="pillars">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>OUR SCIENTIFIC PRINCIPLES</span>
            <h2 className={styles.sectionHeading}>Built On Rigorous Evidence, Not Blind Faith</h2>
            <p className={styles.sectionDescription}>
              We believe Indian heritage shines brightest when examined under the harsh light of modern peer review.
            </p>
          </div>

          <div className={styles.pillarsGrid}>
            <div className={styles.pillarCard}>
              <span className={styles.pillarIcon}>📜</span>
              <h3 className={styles.pillarTitle}>Primary Sanskrit Texts</h3>
              <p className={styles.pillarText}>Every single claim is anchored in specific chapter and verse citations from the original manuscripts.</p>
            </div>

            <div className={styles.pillarCard}>
              <span className={styles.pillarIcon}>🔬</span>
              <h3 className={styles.pillarTitle}>Peer-Reviewed Studies</h3>
              <p className={styles.pillarText}>Cross-referenced against clinical trials indexed in PubMed, Harvard Medical School, The Lancet, and Nature.</p>
            </div>

            <div className={styles.pillarCard}>
              <span className={styles.pillarIcon}>⚖️</span>
              <h3 className={styles.pillarTitle}>Truth Over Superstition</h3>
              <p className={styles.pillarText}>We openly address dosage limits, contraindications, and why rigorous modern science is ancient medicine's greatest ally.</p>
            </div>

            <div className={styles.pillarCard}>
              <span className={styles.pillarIcon}>🏛️</span>
              <h3 className={styles.pillarTitle}>Restoring True History</h3>
              <p className={styles.pillarText}>Highlighting documented acknowledgments by international medical bodies recognizing India’s pioneers.</p>
            </div>
          </div>
        </section>

        {/* SECTION 5: FAQ ACCORDION */}
        <section className={styles.sectionWrapper} id="faq">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTag}>FREQUENTLY ASKED QUESTIONS</span>
            <h2 className={styles.sectionHeading}>Everything You Need To Know</h2>
          </div>

          <div className={styles.faqContainer}>
            <div className={styles.faqItem}>
              <div className={styles.faqQuestion} onClick={() => toggleFaq(0)}>
                <span>How will I receive the eBook after payment?</span>
                <span>{activeFaq === 0 ? '▲' : '▼'}</span>
              </div>
              {activeFaq === 0 && (
                <div className={styles.faqAnswer}>
                  Instantly! Upon successful payment via Razorpay (UPI/Card/NetBanking), your browser immediately downloads the complete 62-page high-resolution PDF file. In addition, an automated receipt and permanent backup download link are sent to your email.
                </div>
              )}
            </div>

            <div className={styles.faqItem}>
              <div className={styles.faqQuestion} onClick={() => toggleFaq(1)}>
                <span>What devices can I read this guide on?</span>
                <span>{activeFaq === 1 ? '▲' : '▼'}</span>
              </div>
              {activeFaq === 1 && (
                <div className={styles.faqAnswer}>
                  The eBook is supplied as a DRM-free, universal high-resolution PDF file. You can read it effortlessly on Android phones, iPhones, iPads, tablets, Kindles, MacBooks, and Windows laptops.
                </div>
              )}
            </div>

            <div className={styles.faqItem}>
              <div className={styles.faqQuestion} onClick={() => toggleFaq(2)}>
                <span>What payment methods are supported?</span>
                <span>{activeFaq === 2 ? '▲' : '▼'}</span>
              </div>
              {activeFaq === 2 && (
                <div className={styles.faqAnswer}>
                  We support all standard payment methods through Razorpay's 256-bit encrypted gateway: Google Pay, PhonePe, Paytm, BHIM UPI, RuPay, Visa, Mastercard, American Express, and NetBanking across 50+ banks.
                </div>
              )}
            </div>

            <div className={styles.faqItem}>
              <div className={styles.faqQuestion} onClick={() => toggleFaq(3)}>
                <span>Can I print the 62-page Master Field Guide?</span>
                <span>{activeFaq === 3 ? '▲' : '▼'}</span>
              </div>
              {activeFaq === 3 && (
                <div className={styles.faqAnswer}>
                  Yes! The PDF is formatted with 300 DPI high-resolution typography, vector illustrations, and standard print margins, making it ideal for full-color A4 printing or physical spiral/hardcover binding.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 6: BOTTOM CLOSER */}
        <section className={styles.bottomCtaSection}>
          <div className={styles.bottomCtaContainer}>
            <h2 className={styles.bottomCtaTitle}>Claim Your 30-Day Field Guide Today</h2>
            <p className={styles.bottomCtaSub}>
              Equip yourself with the verified facts, clinical citations, and Sanskrit verses that prove the enduring scientific genius of ancient India.
            </p>
            <div className={styles.bottomPricing}>
              <span className={styles.priceCurrent}>₹149</span>
              <span className={styles.priceOriginal}>₹499</span>
              <span className={styles.priceDiscountBadge}>70% Off</span>
            </div>
            <a href="#checkout-card" className={styles.submitBtn} style={{ maxWidth: '380px', margin: '0 auto', textDecoration: 'none' }}>
              <span>⚡</span>
              <span>Get Instant 62-Page PDF (₹149)</span>
            </a>
          </div>
        </section>
      </main>

      {/* Custom Isolated Footer */}
      <footer className={styles.customFooter}>
        <div className={styles.footerContainer}>
          <div>
            <div className={styles.footerBrand}>SHASTRA &amp; SCIENCE</div>
            <div className={styles.footerSub}>
              Official companion guide to the 30-day video series (@shastraandscience).
            </div>
          </div>
          <div className={styles.footerLinks}>
            <span>© 2026 Shastra &amp; Science. All rights reserved.</span>
            <a href="#faq" className={styles.footerLink}>FAQ</a>
            <a href="#curriculum" className={styles.footerLink}>30 Days</a>
            <a href="mailto:support@w3tech.com" className={styles.footerLink}>Support</a>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Buy Bar */}
      <div className={styles.mobileStickyBar}>
        <div className={styles.stickyInfo}>
          <span className={styles.stickyTitle}>30-Day Master Field Guide</span>
          <span className={styles.stickyPrice}>₹149 <s>₹499</s></span>
        </div>
        <a href="#checkout-card" className={styles.stickyBtn}>
          Buy &amp; Download
        </a>
      </div>

      {/* Success Modal */}
      {successInfo && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.modalTitle}>Payment Confirmed!</h3>
            <p className={styles.modalText}>
              Thank you for purchasing the <strong>Shastra &amp; Science 30-Day Master Field Guide</strong>. Your download has started automatically.
            </p>

            <div className={styles.modalDetailsBox}>
              <div><strong>Payment ID:</strong> {successInfo.paymentId}</div>
              <div><strong>File:</strong> 62-Page Archival PDF (74.5 MB)</div>
              <div><strong>Status:</strong> Verified &amp; Lifetime Access Granted</div>
            </div>

            <a
              href={successInfo.downloadUrl}
              download="Shastra_and_Science_30_Day_Master_Field_Guide.pdf"
              className={styles.downloadButton}
            >
              <span>📥</span> Download Master PDF Again
            </a>

            <div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setSuccessInfo(null)}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
