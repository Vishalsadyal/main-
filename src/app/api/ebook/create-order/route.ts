import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone } = body || {};

    if (!name || !email || !phone) {
      return NextResponse.json(
        { ok: false, error: 'Please provide full name, email, and mobile number' },
        { status: 400 }
      );
    }

    // Determine Razorpay credentials (default to LIVE if present, or TEST)
    const mode = process.env.RZP_MODE || 'LIVE';
    let keyId = process.env.RZP_KEY_ID_LIVE || process.env.RZP_KEY_ID_TEST;
    let keySecret = process.env.RZP_KEY_SECRET_LIVE || process.env.RZP_KEY_SECRET_TEST;

    if (mode === 'TEST') {
      keyId = process.env.RZP_KEY_ID_TEST || keyId;
      keySecret = process.env.RZP_KEY_SECRET_TEST || keySecret;
    }

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { ok: false, error: 'Razorpay payment gateway not configured in .env' },
        { status: 500 }
      );
    }

    const amountInPaise = 14900; // Rs. 149.00
    const receiptId = 'rcpt_ebk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    const auth = Buffer.from(keyId + ':' + keySecret).toString('base64');
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: {
          product: 'Shastra & Science 30-Day Master Field Guide',
          pages: '62 pages',
          customer_name: name.trim(),
          customer_email: email.trim().toLowerCase(),
          customer_phone: phone.trim(),
        },
      }),
    });

    const orderData = await rzpResponse.json();

    if (!rzpResponse.ok || !orderData.id) {
      console.error('Razorpay order creation failed:', orderData);
      return NextResponse.json(
        { ok: false, error: orderData.error?.description || 'Failed to create Razorpay order' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: keyId,
      customer: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      },
    });
  } catch (error: any) {
    console.error('Ebook create-order error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
