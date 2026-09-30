// White-label website previews: w3tech.co.in/for/<template>/<business-slug>?n=Name&c=City&p=Phone
//
// Serves one of the medical template showcases (public/demos/medical/<template>) with the
// business's own name, city and phone in place of the theme's sample content — logo, title,
// WhatsApp/link preview, contact details and footer. Nothing is stored: everything comes
// from the link, which the W3Tech Outreach Ext browser extension builds for each lead.

const TEMPLATES: Record<string, string> = {
  dentist: 'Dental Clinic',
  medical: 'Clinic',
  ophthalmology: 'Eye Care',
  pediatrics: 'Child Care',
  gynecology: "Women's Health",
  skincare: 'Skin Clinic',
  plasticsurgery: 'Cosmetic Surgery',
  dieting: 'Diet & Nutrition',
  fatloss: 'Weight Loss',
};

// The theme's sample contact details, replaced with the business's.
const SAMPLE_PHONE = /\+1 123 456 7890|\+91 123 456 7890/g;
const SAMPLE_TEL = /tel:\+?(?:1|91)1234567890/g;
const SAMPLE_EMAIL = /info@example\.com|contact@company\.com/g;
const SAMPLE_ADDRESSES = [
  /764 15768 Delmer Shoals,\s*<br>\s*Eliasport, FL 04331-6195/g,
  /234 Oak Drive, Villagetown, USA/g,
  /785 15h Street, Office 478 Berlin, De 81566/g,
  />New York</g,
];

function esc(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function clean(value: string | null, max: number) {
  return (value || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// "919876543210" -> "+91 98765 43210"; other countries: "+" and the digits.
function displayPhone(digits: string) {
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return `+${digits}`;
}

function notFound(reason: string) {
  return new Response('This preview link is not valid.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex', 'X-Preview-Status': reason },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ template: string; slug: string }> }) {
  const { template } = await params;
  const label = TEMPLATES[template];
  if (!label) return notFound('unknown-template');

  const url = new URL(request.url);
  const name = clean(url.searchParams.get('n'), 80);
  if (!name) return notFound('no-name');
  const city = clean(url.searchParams.get('c'), 60);
  const address = clean(url.searchParams.get('a'), 150) || city;
  const phoneDigits = (url.searchParams.get('p') || '').replace(/\D/g, '');
  const phone = phoneDigits.length >= 8 && phoneDigits.length <= 15 ? phoneDigits : '';

  let html: string;
  try {
    const res = await fetch(new URL(`/demos/medical/${template}/index.html`, url.origin), { next: { revalidate: 3600 } });
    if (!res.ok) return notFound('template-missing');
    html = await res.text();
  } catch {
    return new Response('Preview temporarily unavailable, please try again shortly.', { status: 503 });
  }

  const n = esc(name);
  const where = city ? ` in ${esc(city)}` : '';
  const title = `${n} — ${esc(label)}${where}`;
  const description = `${n}${where}: book an appointment, call or message us on WhatsApp.`;
  const self = esc(url.pathname + url.search);
  const wa = phone ? `https://wa.me/${phone}` : '';

  const logo = (tone: 'light' | 'dark') =>
    `<span class="w3-brand w3-brand-${tone}">${n}</span>`;

  html = html
    // Page title and link previews (WhatsApp, Facebook…)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}">`)
    .replace(/<meta name="keywords"[^>]*>\s*/, '')
    .replace(/<meta name="author"[^>]*>/, `<meta name="author" content="${n}">`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}">`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${description}">`)
    .replace(/<meta property="og:image"[^>]*>\s*/, '')
    .replace(/<meta name="twitter:[^>]*>\s*/g, '')
    .replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow">')
    // Logos -> the business name
    .replace(/<img[^>]*src="[^"]*\/images\/logo-white\.svg"[^>]*>/g, logo('light'))
    .replace(/<img[^>]*src="[^"]*\/images\/logo\.svg"[^>]*>/g, logo('dark'))
    // Theme name and credits
    .replace(/ClinicMaster/g, n)
    .replace(/<p class="copyright-text">[\s\S]*?<\/p>/,
      `<p class="copyright-text">© ${new Date().getFullYear()} ${n}. All Rights Reserved.</p>`)
    .replace(/<a[^>]*themeforest\.net[^>]*>[\s\S]*?<\/a>/g, n)
    .replace(/DexignZone/g, n)
    // Contact details
    .replace(SAMPLE_TEL, phone ? `tel:+${phone}` : 'tel:')
    .replace(SAMPLE_PHONE, phone ? displayPhone(phone) : 'Call us')
    .replace(/mailto:(?:info@example\.com|contact@company\.com)/g, wa || '#contact')
    .replace(SAMPLE_EMAIL, wa ? 'Chat on WhatsApp' : 'Message us');
  for (const sample of SAMPLE_ADDRESSES) {
    html = html.replace(sample, (m) => (m.startsWith('>') ? `>${esc(city || address)}<` : esc(address)));
  }
  // "Home" links stay on this personalised page.
  html = html.replace(new RegExp(`href="/demos/medical/${template}/?"`, 'g'), `href="${self}"`);

  const extras = `
<style>
  .w3-brand { display: inline-block; font-weight: 800; font-size: 22px; line-height: 1.15; letter-spacing: -.01em; max-width: 260px; }
  .w3-brand-light { color: #fff; } .w3-brand-dark { color: var(--bs-primary, #1a3b6e); }
  .footer-logo .w3-brand { font-size: 24px; }
  .w3-preview { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); z-index: 99999; display: flex; gap: 10px;
    align-items: center; padding: 9px 16px; border-radius: 999px; background: rgba(15, 23, 42, .92); color: #fff;
    font: 500 13px/1.3 system-ui, sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,.25); max-width: calc(100vw - 24px); }
  .w3-preview a { color: #93c5fd; font-weight: 600; text-decoration: none; white-space: nowrap; }
  .w3-preview button { background: none; border: 0; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0 0 0 4px; }
</style>
<div class="w3-preview" role="note">
  <span>Website preview for <strong>${n}</strong> · by <a href="https://www.w3tech.co.in" target="_blank" rel="noopener">W3Tech</a></span>
  <button type="button" aria-label="Hide" onclick="this.parentNode.remove()">×</button>
</div>
</body>`;
  html = html.replace(/<\/body>/i, extras);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Preview-Status': 'ok',
    },
  });
}
