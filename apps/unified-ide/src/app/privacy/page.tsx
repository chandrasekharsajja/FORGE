import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="legal-shell">
      <section className="legal-card">
        <span className="eyebrow">Privacy</span>
        <h1>FORGE workspace privacy preview</h1>
        <p className="legal-updated">Last updated July 29, 2026.</p>
        <p>
          This shell is designed as a local workspace view for repository evaluation and product
          demos. Prompt text, simulated agent logs, and editor drafts are displayed in the
          interface for the current session only.
        </p>
        <p>
          The repo itself does not currently ship a hosted backend for analytics, identity, or
          telemetry. If you add those systems later, this page should be revised before public
          deployment.
        </p>
        <p>
          If you are evaluating the public repository, assume that any real production privacy
          commitments still need a deployment-specific implementation and review.
        </p>
        <Link href="/" className="inline-link">
          Back to the shell
        </Link>
      </section>
    </main>
  );
}
