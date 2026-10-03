// The W3Tech demo library: every website design that can be sent to a lead, grouped by
// category. Each design is a showcase page in public/demos/<group>/<id>/index.html that
// /for/<id>/<slug>?n=…&c=…&p=…&l=… personalises with the lead's name, city and phone
// (and tracks with the lead id, l=).
//
// To add a design: put its folder under public/demos/medical/<id>/ and add a line below.

export type Design = {
  id: string;            // folder name under public/demos/medical
  name: string;          // shown to you and in messages
  category: string;      // library group
  style: string;
  trades: string[];      // lead categories it suits best (extension category keys)
  label: string;         // what the business is, used on the page title: "<name> — <label> in <city>"
};

export const DESIGNS: Design[] = [
  { id: 'dentist', name: 'Dental Clinic', category: 'Medical', style: 'Bright, appointment-focused', trades: ['dental'], label: 'Dental Clinic' },
  { id: 'medical', name: 'Clinic & Hospital', category: 'Medical', style: 'Clean, multi-department', trades: ['clinic', 'hospital', 'physio'], label: 'Clinic' },
  { id: 'ophthalmology', name: 'Eye Care', category: 'Medical', style: 'Calm, specialist', trades: ['eye'], label: 'Eye Care' },
  { id: 'pediatrics', name: 'Child Care', category: 'Medical', style: 'Friendly, colourful', trades: ['child'], label: 'Child Care' },
  { id: 'gynecology', name: "Women's Health", category: 'Medical', style: 'Soft, caring', trades: ['women'], label: "Women's Health" },
  { id: 'skincare', name: 'Skin Clinic', category: 'Medical', style: 'Elegant, beauty', trades: ['skin'], label: 'Skin Clinic' },
  { id: 'plasticsurgery', name: 'Cosmetic Surgery', category: 'Medical', style: 'Premium, before/after', trades: ['plastic_surgery'], label: 'Cosmetic Surgery' },
  { id: 'dieting', name: 'Diet & Nutrition', category: 'Medical', style: 'Fresh, lifestyle', trades: ['diet'], label: 'Diet & Nutrition' },
  { id: 'fatloss', name: 'Weight Loss', category: 'Medical', style: 'Bold, results-driven', trades: ['diet'], label: 'Weight Loss' },
];

// Lead categories that can be shown every medical design.
const MEDICAL_TRADES = ['dental', 'clinic', 'hospital', 'physio', 'eye', 'child', 'women', 'skin', 'plastic_surgery', 'diet'];

export function getDesign(id: string): Design | undefined {
  return DESIGNS.find((d) => d.id === id);
}

/** Designs that suit a lead, best match first (empty for trades with no design yet). */
export function designsFor(category: string | null, ownDesign?: string | null): Design[] {
  const cat = (category || '').toLowerCase();
  const pool = MEDICAL_TRADES.includes(cat) || (ownDesign && getDesign(ownDesign)) ? DESIGNS : [];
  const score = (d: Design) => (d.id === ownDesign ? 0 : d.trades.includes(cat) ? 1 : 2);
  return [...pool].sort((a, b) => score(a) - score(b));
}

export function categories(): { category: string; designs: Design[] }[] {
  const out = new Map<string, Design[]>();
  for (const d of DESIGNS) out.set(d.category, [...(out.get(d.category) || []), d]);
  return [...out].map(([category, designs]) => ({ category, designs }));
}
