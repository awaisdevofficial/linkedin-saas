import LegalPageLayout from '@/components/LegalPageLayout';

const TermsAndConditions = () => {
  const lastUpdated = 'March 16, 2025';

  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={lastUpdated}>
      <p>
        POSTORA (“Service”) is a LinkedIn content studio and assistant. By using it you agree to these terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. What we offer</h2>
      <p>
        The Service lets you connect your LinkedIn account to schedule posts, generate drafts with AI, and manage engagement (e.g. likes, comments, replies). We may change or discontinue features with reasonable notice.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must be 18+ and able to enter a binding agreement. You are responsible for your login details and all use of your account.
      </p>

      <h2>3. Rules of use</h2>
      <p>You must not:</p>
      <ul>
        <li>Break LinkedIn’s terms or any applicable law</li>
        <li>Use the Service for spam, misleading content, or abuse</li>
        <li>Try to access our systems or other users’ accounts without permission</li>
        <li>Resell or redistribute the Service without our written consent</li>
      </ul>
      <p>We may suspend or end your account if you break these rules.</p>

      <h2>4. Payment and access</h2>
      <p>
        Free access is offered as described on the site. Paid access and invoices are as agreed with us; payment terms are on the invoice. Fees are non-refundable except where our Refund Policy says otherwise. We may change pricing with notice; continued use means you accept the new terms.
      </p>

      <h2>5. Our rights</h2>
      <p>
        POSTORA’s name, product, and content are ours. You may not copy, modify, or reuse them without permission.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        To the fullest extent allowed by law, we are not liable for indirect, incidental, or consequential damages from your use of the Service. Our total liability is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about these terms: support@postora.io.
      </p>
    </LegalPageLayout>
  );
};

export default TermsAndConditions;
