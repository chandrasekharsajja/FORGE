import Link from 'next/link';
import type { QuickStartCard } from '../lib/dashboard-data';

export function RunbookPanel({
  quickStartCards,
}: {
  quickStartCards: QuickStartCard[];
}) {
  return (
    <section className="panel runbook-panel">
      <div className="panel-header">
        <span className="eyebrow">Guide rails</span>
        <h2>Runbook</h2>
      </div>

      <div className="runbook-grid">
        {quickStartCards.map((card) => (
          <article key={card.title} className="runbook-card">
            <strong>{card.title}</strong>
            <p>{card.detail}</p>
            {card.href.startsWith('/') ? (
              <Link href={card.href} className="inline-link">
                Open
              </Link>
            ) : (
              <a href={card.href} target="_blank" rel="noreferrer" className="inline-link">
                Open
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
