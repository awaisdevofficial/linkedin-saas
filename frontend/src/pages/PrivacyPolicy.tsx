import LegalPageLayout from '@/components/LegalPageLayout';

const PrivacyPolicy = () => {
  const lastUpdated = 'March 16, 2025';

  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={lastUpdated}>
      <p>
        POSTORA (“we”) respects your privacy. This policy explains what we collect and how we use it when you use our Service.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account:</strong> email, name, password (when you sign up or log in)</li>
        <li><strong>LinkedIn:</strong> profile and content you connect or publish through the Service</li>
        <li><strong>Usage:</strong> how you use the product (e.g. pages, actions)</li>
        <li><strong>Technical:</strong> IP, browser, device (for security and operation)</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>Run and improve the Service</li>
        <li>Send invoices and support messages</li>
        <li>Prevent abuse and comply with the law</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>
        We do not sell your data. We may share it with providers that help us run the Service (e.g. hosting, auth) under strict confidentiality, or when the law requires it.
      </p>

      <h2>4. Retention</h2>
      <p>
        We keep your data while your account is active and as needed for the Service or legal obligations. You can ask for deletion by contacting us.
      </p>

      <h2>5. Security</h2>
      <p>
        We use standard measures (e.g. encryption, access control). We cannot guarantee total security online.
      </p>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, delete, or port your data. To use them, contact support@postora.io.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use cookies and similar tech to run the Service and remember preferences. You can control them in your browser.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update this policy. We will notify you of important changes by email or in the product. Continued use means you accept the updated policy.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions: support@postora.io.
      </p>
    </LegalPageLayout>
  );
};

export default PrivacyPolicy;
