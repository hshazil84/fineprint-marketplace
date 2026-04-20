import Link from 'next/link'
import Footer from '@/app/components/Footer'

export default function TermsPage() {
  return (
    <div>
      <nav className="nav">
        <Link href="/storefront" className="nav-logo">Fine<span>Print</span> Studio</Link>
        <div className="nav-links">
          <Link href="/storefront" className="btn btn-sm">Browse prints</Link>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: 720, paddingTop: 48, paddingBottom: 60 }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>Legal</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: 8 }}>Terms & Conditions</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 40 }}>Last updated: April 2026</p>

        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <Section title="1. About FinePrint Studio">
            FinePrint Studio is a registered business in the Republic of Maldives. We operate an online marketplace at shop.fineprintmv.com that connects buyers with Maldivian artists for the sale of fine art giclée prints. All prints are produced and fulfilled by FinePrint Studio from our studio in Malé.
          </Section>
          <Section title="2. Acceptance of terms">
            By accessing or using shop.fineprintmv.com, placing an order, or registering as an artist, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use our platform.
          </Section>
          <Section title="3. For buyers">
            <b style={{ fontWeight: 500 }}>Ordering.</b> All orders are subject to availability and payment verification. We accept payment by BML bank transfer only. Your order is confirmed once payment has been verified and you receive an approval email with your invoice.
            <br /><br />
            <b style={{ fontWeight: 500 }}>Pricing.</b> All prices are in Maldivian Rufiyaa (MVR). A handling fee of MVR 100 applies for delivery orders. Pickup is free.
            <br /><br />
            <b style={{ fontWeight: 500 }}>Delivery.</b> We deliver to all islands in the Maldives. You are responsible for providing a correct delivery address. Uncollected pickup orders must be collected within 7 days of notification.
            <br /><br />
            <b style={{ fontWeight: 500 }}>Refund policy.</b> All sales are final. We do not offer refunds except in the case of a defective print. FinePrint Studio guarantees the quality of the physical print — paper, colour accuracy, and production — but does not guarantee the artistic content or style of the original artwork, which is the sole responsibility of the artist.
            <br /><br />
            <b style={{ fontWeight: 500 }}>Defective prints.</b> If your print arrives damaged, notify us within 48 hours at hello@fineprintmv.com with your invoice number and photo evidence. If approved, we will reprint and redeliver at no cost.
          </Section>
          <Section title="4. For artists">
            <b style={{ fontWeight: 500 }}>Eligibility.</b> Artists must be individuals or entities based in the Maldives. By registering, you confirm you hold full rights to the artwork you upload.
            <br /><br />
            <b style={{ fontWeight: 500 }}>Artwork standards.</b> You must upload a high-resolution print file (minimum 200 dpi) and a watermarked preview image. FinePrint Studio reserves the right to reject artwork that does not meet quality standards.
            <br /><br />
            <b style={{ fontWeight: 500 }}>Platform fee & confidentiality.</b> FinePrint Studio charges a platform fee on each sale. The fee structure is confidential and disclosed only to registered artists. Artists agree not to disclose this to buyers or third parties.
            <br /><br />
            <b style={{ fontWeight: 500 }}>Payouts.</b> Earnings are paid out upon artist request, subject to a monthly payout cycle.
            <br /><br />
            <b style={{ fontWeight: 500 }}>Intellectual property.</b> You retain full copyright of your artwork. By listing on FinePrint Studio, you grant us a non-exclusive licence to reproduce and display your artwork solely for fulfilling orders and promoting your listings.
          </Section>
          <Section title="5. Intellectual property">
            All content on shop.fineprintmv.com — including the FinePrint Studio name, logo, design, and platform software — is the property of FinePrint Studio and may not be reproduced without written permission.
          </Section>
          <Section title="6. Limitation of liability">
            FinePrint Studio's liability is limited to the value of the order in question. We are not liable for any indirect or consequential damages.
          </Section>
          <Section title="7. Governing law">
            These terms are governed by the laws of the Republic of Maldives.
          </Section>
          <Section title="8. Contact">
            For questions, contact us at <a href="mailto:hello@fineprintmv.com" style={{ color: 'var(--color-teal)' }}>hello@fineprintmv.com</a> or call 9998124.
          </Section>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: 10 }}>{title}</h2>
      <div style={{ color: 'var(--color-text-muted)' }}>{children}</div>
    </div>
  )
}
