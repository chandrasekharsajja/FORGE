import type { MissionTrack, ReleaseCheck } from '../lib/dashboard-data';

export function MissionBoard({
  missionTracks,
  releaseChecklist,
}: {
  missionTracks: MissionTrack[];
  releaseChecklist: ReleaseCheck[];
}) {
  return (
    <section className="panel mission-board">
      <div className="panel-header">
        <span className="eyebrow">Mission lane</span>
        <h2>Release board</h2>
      </div>

      <div className="mission-timeline">
        {missionTracks.map((track) => (
          <article key={track.stage} className={`timeline-item timeline-${track.state}`}>
            <div className="timeline-dot" aria-hidden="true" />
            <div>
              <div className="timeline-meta">
                <strong>{track.stage}</strong>
                <span>{track.owner}</span>
              </div>
              <p>{track.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="release-checklist" id="release-board">
        <div className="section-heading">
          <h3>Release checklist</h3>
          <span>What changed in this pass</span>
        </div>
        <ul>
          {releaseChecklist.map((item) => (
            <li key={item.title} className={`release-item release-${item.state}`}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <span className="state-badge">{item.state}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
