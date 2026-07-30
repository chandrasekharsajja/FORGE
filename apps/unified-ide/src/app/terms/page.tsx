import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="legal-shell">
      <section className="legal-card">
        <span className="eyebrow">Terms</span>
        <h1>FORGE public preview terms</h1>
        <p className="legal-updated">Last updated July 29, 2026.</p>
        <p>
          FORGE is currently published as a public code repository and preview workspace shell.
          The software is provided for evaluation, learning, contribution, and internal
          experimentation.
        </p>
        <p>
          The repository does not claim that all services are production-ready. Any commercial or
          hosted use should be reviewed against your own operational, legal, and security
          requirements before deployment.
        </p>
        <p>
          By using or extending this preview, you agree to respect the project license, the
          contribution rules in the repository, and the separate security reporting process.
        </p>
        <Link href="/" className="inline-link">
          Back to the shell
        </Link>
      </section>
    </main>
  );
}
