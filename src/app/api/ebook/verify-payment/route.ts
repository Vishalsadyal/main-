import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, paymentId, signature, name, email, phone } = body || {};

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { ok: false, error: 'Missing payment verification parameters' },
        { status: 400 }
      );
    }

    const mode = process.env.RZP_MODE || 'LIVE';
    let keySecret = process.env.RZP_KEY_SECRET_LIVE || process.env.RZP_KEY_SECRET_TEST;
    if (mode === 'TEST') {
      keySecret = process.env.RZP_KEY_SECRET_TEST || keySecret;
    }

    if (!keySecret) {
      return NextResponse.json(
        { ok: false, error: 'Payment gateway secret not configured' },
        { status: 500 }
      );
    }

    // Verify Razorpay HMAC SHA256 signature: hmac_sha256(order_id + '|' + razorpay_payment_id, secret)
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(orderId + '|' + paymentId);
    const generatedSignature = hmac.digest('hex');

    const isValid = generatedSignature === signature;

    if (!isValid) {
      // Also check test key secret just in case the order was placed in test mode
      const testSecret = process.env.RZP_KEY_SECRET_TEST;
      let isTestValid = false;
      if (testSecret && testSecret !== keySecret) {
        const testHmac = crypto.createHmac('sha256', testSecret);
        testHmac.update(orderId + '|' + paymentId);
        isTestValid = testHmac.digest('hex') === signature;
      }

      if (!isTestValid) {
        console.error('Invalid signature verification for order:', orderId);
        return NextResponse.json(
          { ok: false, error: 'Invalid payment signature' },
          { status: 400 }
        );
      }
    }

    console.log('[EBOOK_PURCHASE] Verified payment ' + paymentId + ' for order ' + orderId + ' by ' + email);

    // Return direct download URL and success response
    return NextResponse.json({
      ok: true,
      verified: true,
      paymentId: paymentId,
      orderId: orderId,
      downloadUrl: '/ebook/Shastra_and_Science_30_Day_Master_Field_Guide.pdf',
      filename: 'Shastra_and_Science_30_Day_Master_Field_Guide.pdf',
      message: 'Payment verified successfully. Download your 62-page Master Field Guide.',
    });
  } catch (error: any) {
    console.error('Ebook payment verification error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
