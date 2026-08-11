import { usePageTitle } from "@/hooks/use-page-title";

export default function Terms() {
  usePageTitle("Terms of Service — GrowPia");
  return (
    <div className="py-14 container mx-auto px-4 max-w-3xl prose prose-slate dark:prose-invert">
      <h1>Terms of Service</h1>
      <p className="lead">Last updated: October 2023</p>

      <p>Welcome to GrowPia. These Terms of Service govern your use of our website and marketplace platform.</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using GrowPia, you agree to be bound by these Terms. If you do not agree to these terms, please do not use our services.</p>

      <h2>2. Platform Usage</h2>
      <p>GrowPia is a marketplace connecting business owners (Clients) with business experts (Experts) for advisory sessions. We do not provide consulting services directly; we provide the platform for you to connect.</p>

      <h2>3. User Accounts</h2>
      <p>You must create an account to use certain features of the platform. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>

      <h2>4. Payments and Bookings</h2>
      <ul>
        <li>Clients pay the session fee listed on the Expert's profile at the time of booking.</li>
        <li>Experts set their own session fees.</li>
        <li>Payments are processed exclusively via M-Pesa.</li>
        <li>Cancellations and refunds are subject to our cancellation policy.</li>
      </ul>

      <h2>5. Session Conduct</h2>
      <p>Both Clients and Experts are expected to maintain professional conduct during sessions. Harassment, abuse, or inappropriate behavior will result in immediate account termination.</p>

      <h2>6. Liability</h2>
      <p>GrowPia is not responsible for the advice given by Experts. Experts provide opinions based on their experience; it is not guaranteed to produce specific financial or business results. Clients implement advice at their own risk.</p>

      <h2>7. Contact Information</h2>
      <p>If you have any questions about these Terms, please contact us at:</p>
      <p><a href="mailto:hello@scalewise.co.ke?subject=Terms%20Enquiry%20-%20GrowPia">hello@scalewise.co.ke</a></p>
    </div>
  );
}
