'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="utility-shell">
      <section className="utility-card">
        <span className="eyebrow">Runtime issue</span>
        <h1>The workspace could not render</h1>
        <p>
          {error.message || 'A rendering fault interrupted the shell. Try the route again.'}
        </p>
        <button type="button" className="primary-button" onClick={reset}>
          Retry shell
        </button>
      </section>
    </main>
  );
}
