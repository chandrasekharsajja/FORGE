import type { GovernanceNote, ServiceHealth } from '../lib/dashboard-data';

export function SystemMap({
  serviceHealth,
  governanceNotes,
}: {
  serviceHealth: ServiceHealth[];
  governanceNotes: GovernanceNote[];
}) {
  return (
    <section className="panel system-map">
      <div className="panel-header">
        <span className="eyebrow">Signals</span>
        <h2>System status</h2>
      </div>

      <div className="service-grid">
        {serviceHealth.map((service) => (
          <article key={service.name} className={`service-card service-${service.state}`}>
            <div className="service-head">
              <strong>{service.name}</strong>
              <span>{service.signal}</span>
            </div>
            <p>{service.detail}</p>
          </article>
        ))}
      </div>

      <div className="notes-stack">
        <div className="section-heading">
          <h3>Operator notes</h3>
          <span>How to talk about the repo in public</span>
        </div>
        {governanceNotes.map((note) => (
          <article key={note.title} className="note-card">
            <strong>{note.title}</strong>
            <p>{note.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
