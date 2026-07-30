import Link from 'next/link';
import type { ExplorerSection } from '../lib/dashboard-data';

function ItemLink({ href, label }: { href: string | undefined; label: string }) {
  if (!href) {
    return <span>{label}</span>;
  }

  if (href.startsWith('/')) {
    return <Link href={href}>{label}</Link>;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

export function ExplorerPanel({
  sections,
  note,
}: {
  sections: ExplorerSection[];
  note: {
    title: string;
    detail: string;
  };
}) {
  return (
    <aside className="panel explorer-panel">
      <div className="panel-header">
        <span className="eyebrow">Navigator</span>
        <h2>Workspace map</h2>
      </div>

      <div className="explorer-alert">
        <strong>{note.title}</strong>
        <p>{note.detail}</p>
      </div>

      {sections.map((section) => (
        <section key={section.title} className="explorer-section">
          <h3>{section.title}</h3>
          <ul>
            {section.items.map((item) => (
              <li key={item.label}>
                <span className={`node-pill node-pill-${item.kind}`}>{item.kind}</span>
                <div>
                  <ItemLink href={item.href} label={item.label} />
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}
