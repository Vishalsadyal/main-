// The video-call script shown on a lead's page (Hinglish), filled in with their name, city and your price.
import type { Lead } from '@/lib/leads-db';
import { shortName, type Settings } from '@/lib/outreach';

const MEDICAL = /dent|clinic|doctor|hospital|physician|eye|ophthal|child|paediat|pediat|gyn|skin|derma|plastic|physio|diet|nutrition|medical/i;

export type ScriptSection = { title: string; lines: string[] };

export function callScript(lead: Lead, s: Settings): ScriptSection[] {
  const medical = MEDICAL.test(`${lead.category || ''} ${lead.category_label || ''}`);
  const ji = medical ? 'Doctor ji' : `${shortName(lead.name)} ji`;
  const city = lead.city || 'aapke shehar';
  const place = medical ? 'clinic' : 'business';
  const people = medical ? 'patients' : 'customers';
  const price = s.price || '₹7,000';
  const search = medical ? `“dentist near me” ya “clinic near me”` : '“near me”';

  return [
    { title: '1. Opening (1 min)', lines: [
      `Good evening ${ji}! Time dene ke liye bahut thank you. Kaise hain aap? ${city} mein ${place} kaisa chal raha hai?`,
      'Main bas 15 minute lunga — designs dikhata hoon, package samjhata hoon, aur aapke jo bhi sawaal hain unka jawab deta hoon. Theek hai?',
    ] },
    { title: '2. Pehle unke baare mein poochiye (3 min)', lines: [
      `Abhi naye ${people} aapko kaise milte hain — word of mouth se, Google se, ya Justdial se?`,
      `Kabhi ${people} ne bola ki unhe aapki timing ya location online nahi mili?`,
      medical ? 'Aap kaunse treatments ke liye zyada patients chahte hain — implants, braces, root canal?' : 'Aap kaunsi services ke liye zyada customers chahte hain?',
      '👉 Dhyan se suniye aur unke answers note kar lijiye — aage ye kaam aayenge.',
    ] },
    { title: '3. Designs dikhaiye (5 min)', lines: [
      `Screen share karke unka design dikhaiye (${lead.name}).`,
      `Ye maine aapke ${place} ke naam se ek sample banaya hai — isme ${medical ? 'patient' : 'customer'} ek tap mein call ya WhatsApp kar sakta hai, services aur timings dekh sakta hai, aur Google Maps pe location bhi mil jaati hai.`,
      `Mobile view dikhaiye: “Zyada ${people} isse phone pe hi kholenge.”`,
      'Aapko kaunsa style pasand aaya? Hum isme aapki real photos, services aur timings daal denge.',
    ] },
    { title: '4. Kyun zaroori hai (2 min)', lines: [
      `Jab koi ${city} mein ${search} search karta hai, to jin ${place}s ki website aur strong Google profile hoti hai woh sabse upar aate hain. Log pehle 3–4 mein se hi choose karte hain.`,
      `Aapke paas skill aur trust pehle se hai — ye bas ensure karta hai ki naye ${people} aapko dhoondh sakein.`,
    ] },
    { title: `5. Package — ${price} (3 min)`, lines: [
      `Sab kuch milake ${price}, one time, koi hidden cost nahi:`,
      '• Aapki website — mobile-friendly, WhatsApp, call button aur map ke saath',
      '• Domain, hosting aur security — 1 saal ke liye',
      '• Google Business Profile setup — taaki aap “near me” search mein dikhein — saath mein Apple Maps bhi',
      `• Review boost — QR code aur review link, taaki happy ${people} se Google reviews le sakein`,
      '• Launch ke baad 30 din ka support',
      'Payment: 50% shuru mein, 50% jab aap website approve kar dein. Pehla version 2–3 din mein ready.',
    ] },
    { title: '6. Sawaal aur objections', lines: [
      `“Mehenga hai” → ${ji}, ye ek ${medical ? 'patient ke treatment' : 'order'} se bhi kam hai, aur ye roz aapke liye kaam karega. Ek-do naye ${people} se hi paisa wapas aa jayega.`,
      '“Sochta hoon” → Bilkul. Koi cheez hai jiske baare mein aap sure nahi hain? Design ya package aapke hisaab se badal sakte hain.',
      `“Justdial / Practo hai na” → Woh achhe hain, lekin website aur Google profile aapki apni hoti hai — wahan ${medical ? 'patient' : 'customer'} sirf aapko dekhta hai, saath mein baaki nahi.`,
      '“Aapka kaam dikhao” → w3tech.co.in aur apni banayi hui ek-do websites dikhaiye.',
    ] },
    { title: '7. Close (2 min)', lines: [
      `To shuru karein ${ji}? Aap haan bolein to main aaj hi kaam start kar deta hoon.`,
      `Bas WhatsApp pe bhej dijiye: 1) logo  2) ${place} ki kuch photos  3) services aur timings  4) address aur jo number website pe dikhana hai.`,
      '50% advance milte hi 2–3 din mein pehla version ready.',
    ] },
    { title: '8. Agar abhi ready nahi hain', lines: [
      `Koi baat nahi ${ji}. Main kab follow up karoon — 2 din baad ya agle hafte? → Woh date yahan “Follow up later” mein set kar dijiye.`,
    ] },
    { title: 'Tips', lines: [
      'Smile kariye, aaram se boliye, unka naam aur unka city use kariye.',
      'Sawaal poochiye, phir suniye — poora script padhne ki zaroorat nahi.',
      'Har call ek clear next step pe khatam kariye — abhi shuru karna, ya follow-up ki date.',
    ] },
  ];
}
