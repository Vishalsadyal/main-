// Personalised client demo pages: w3tech.co.in/demo/<business-name-location>
//
// The W3Tech Sales Engine renders each demo and writes it (with its data) to the
// "W3Tech Demos" Google Sheet through an Apps Script web app. This route reads the
// row for the slug and serves the stored page, so new demos go live without a
// deploy. Only rows with status "published" are served.

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEMO_ID = /^[A-Z0-9]{4,12}$/i;

type DemoRow = { status?: string; html?: string; business_name?: string };

// `reason` goes in an X-Demo-Status header so a 404 can be diagnosed without logs.
function notFound(reason: string) {
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<meta name="robots" content="noindex"><title>Demo not found · W3Tech</title>' +
      '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f4f6fb;color:#0f172a;padding:16px}' +
      'main{text-align:center;max-width:460px}a{color:#2563eb}</style></head><body><main><h1>This demo isn’t available</h1>' +
      '<p>The link may have expired or been taken offline.</p><p><a href="https://w3tech.co.in">Visit W3Tech</a></p></main></body></html>',
    {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store',
        'X-Demo-Status': reason,
      },
    }
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sheetsUrl = process.env.DEMO_SHEETS_URL;
  if (!sheetsUrl) return notFound('not-configured');
  if (!(SLUG.test(slug) || DEMO_ID.test(slug)) || slug.length > 120) return notFound('bad-slug');

  let demo: DemoRow | undefined;
  try {
    const url = `${sheetsUrl}?action=demo&slug=${encodeURIComponent(slug)}`;
    // Cached for a minute: edits published from the dashboard show up quickly.
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = (await res.json()) as { ok?: boolean; demo?: DemoRow };
    demo = data.ok ? data.demo : undefined;
  } catch {
    return new Response('Demo temporarily unavailable, please try again shortly.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'X-Demo-Status': 'sheet-error' },
    });
  }

  if (!demo || demo.status !== 'published' || !demo.html) {
    return notFound('not-found');
  }

  return new Response(String(demo.html), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Demo-Status': 'ok',
    },
  });
}
