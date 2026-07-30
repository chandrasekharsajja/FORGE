import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="utility-shell">
      <section className="utility-card">
        <span className="eyebrow">404</span>
        <h1>That workspace route does not exist</h1>
        <p>
          The command deck is available, but this address does not map to a current screen.
        </p>
        <Link href="/" className="primary-button">
          Return to the shell
        </Link>
      </section>
    </main>
  );
}
