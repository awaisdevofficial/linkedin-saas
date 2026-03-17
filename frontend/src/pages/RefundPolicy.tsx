import LegalPageLayout from '@/components/LegalPageLayout';

const RefundPolicy = () => {
  const lastUpdated = 'March 16, 2025';

  return (
    <LegalPageLayout title="Refund Policy" lastUpdated={lastUpdated}>
      <p>
        This policy states how we handle refunds for POSTORA. Please read it before paying.
      </p>

      <h2>1. Free access</h2>
      <p>
        No payment is required for free use. Refunds do not apply.
      </p>

      <h2>2. Paid access and invoices</h2>
      <p>
        All payments for paid access or invoices are <strong>final</strong>. We do not offer refunds for any reason, including unused time, change of mind, or cancellation after payment.
      </p>

      <h2>3. Exceptions</h2>
      <p>
        Refunds may be considered only at our sole discretion in exceptional cases (e.g. duplicate charge or clear billing error). We are not obliged to grant any refund. Contact support@postora.io to request; we will respond and decide on a case-by-case basis.
      </p>

      <h2>4. Cancellation</h2>
      <p>
        You may stop using paid access at any time. Stopping does not entitle you to a refund for any period already paid.
      </p>

      <h2>5. Contact</h2>
      <p>
        Refund requests or questions: support@postora.io.
      </p>
    </LegalPageLayout>
  );
};

export default RefundPolicy;
