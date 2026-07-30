import Link from 'next/link';
import { AgentSidePanel } from '../components/AgentSidePanel';
import { ExplorerPanel } from '../components/ExplorerPanel';
import { MonacoEditorContainer } from '../components/Editor/MonacoEditorContainer';
import { MissionBoard } from '../components/MissionBoard';
import { RunbookPanel } from '../components/RunbookPanel';
import { SystemMap } from '../components/SystemMap';
import { TerminalPanel } from '../components/Terminal/TerminalPanel';
import { buildDashboardSnapshot } from '../lib/dashboard-model';

export default async function UnifiedIDEPage() {
  const snapshot = await buildDashboardSnapshot();

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <div className="forge-shell">
        <header className="topbar">
          <div className="brand-block">
            <div className="brand-mark">FG</div>
            <div className="brand-copy">
              <strong>FORGE unified IDE</strong>
              <span>
                Public mission cockpit for a repo that now speaks honestly about what ships today
                and what is still prototype work.
              </span>
            </div>
          </div>

          <nav className="topbar-actions" aria-label="Primary">
            <a
              href="https://github.com/chandrasekharsajja/FORGE"
              target="_blank"
              rel="noreferrer"
              className="nav-chip"
            >
              GitHub repo
            </a>
            <Link href="/privacy" className="nav-chip">
              Privacy
            </Link>
            <Link href="/terms" className="nav-chip">
              Terms
            </Link>
          </nav>
        </header>

        <div className="shell-grid">
          <ExplorerPanel
            sections={snapshot.explorerSections}
            note={snapshot.governanceNotes[0] ?? {
              title: 'Live snapshot',
              detail: 'The workspace view is populated from the current service graph.',
            }}
          />

          <main id="main-content" className="workspace-column">
            <section className="hero-panel">
              <div className="hero-grid">
                <div className="hero-copy">
                  <span className="eyebrow">Public release pass</span>
                  <h1>Plan, edit, verify, and present the work from one command deck.</h1>
                  <p>
                    The studio shell now behaves like a real app instead of a static mock. It
                    gives the repo a credible front door while the deeper service layer continues
                    to evolve behind it.
                  </p>

                  <div className="hero-actions">
                    <a
                      href="https://github.com/chandrasekharsajja/FORGE/blob/main/README.md"
                      target="_blank"
                      rel="noreferrer"
                      className="primary-button"
                    >
                      Review public README
                    </a>
                    <a href="#release-board" className="ghost-button">
                      Open release board
                    </a>
                  </div>
                </div>

                <div className="stats-grid">
                  {snapshot.overviewStats.map((stat) => (
                    <article key={stat.label} className="stat-card">
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <p>{stat.caption}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <div className="workspace-grid">
              <div className="stack">
                <MonacoEditorContainer editorFiles={snapshot.editorFiles} />
                <TerminalPanel
                  terminalLines={snapshot.terminalLines}
                  verificationChecks={snapshot.verificationChecks}
                  generatedArtifacts={snapshot.generatedArtifacts}
                />
              </div>

              <div className="stack">
                <MissionBoard
                  missionTracks={snapshot.missionTracks}
                  releaseChecklist={snapshot.releaseChecklist}
                />
                <SystemMap
                  serviceHealth={snapshot.serviceHealth}
                  governanceNotes={snapshot.governanceNotes}
                />
                <RunbookPanel quickStartCards={snapshot.quickStartCards} />
              </div>
            </div>
          </main>

          <AgentSidePanel promptSuggestions={snapshot.agentPromptSuggestions} />
        </div>

        <footer className="shell-footer">
          <span>
            FORGE is strongest today as a polished shell plus architectural scaffolding. That is
            the story this workspace now tells clearly.
          </span>
          <div className="footer-links">
            <a
              href="https://github.com/chandrasekharsajja/FORGE/blob/main/Docs/governance/PROJECT-GOVERNANCE.md"
              target="_blank"
              rel="noreferrer"
              className="inline-link"
            >
              Governance
            </a>
            <a
              href="https://github.com/chandrasekharsajja/FORGE/blob/main/SECURITY.md"
              target="_blank"
              rel="noreferrer"
              className="inline-link"
            >
              Security
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
