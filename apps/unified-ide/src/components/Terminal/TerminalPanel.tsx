'use client';

import { useState } from 'react';
import type {
  ArtifactCard,
  VerificationCheck,
} from '../../lib/dashboard-data';

type TerminalTab = 'terminal' | 'checks' | 'artifacts';

export function TerminalPanel({
  terminalLines,
  verificationChecks,
  generatedArtifacts,
}: {
  terminalLines: string[];
  verificationChecks: VerificationCheck[];
  generatedArtifacts: ArtifactCard[];
}) {
  const [activeTab, setActiveTab] = useState<TerminalTab>('terminal');

  return (
    <section className="panel terminal-shell">
      <div className="terminal-frame">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Validation lane</span>
            <h2>Terminal and checks</h2>
          </div>
          <span>Reference suite plus workspace signals</span>
        </div>

        <div className="terminal-tabs" aria-label="Terminal views">
          {(['terminal', 'checks', 'artifacts'] as TerminalTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab-button ${activeTab === tab ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'terminal' ? (
          <div className="terminal-output" role="log" aria-live="polite">
            <pre>{terminalLines.join('\n')}</pre>
          </div>
        ) : null}

        {activeTab === 'checks' ? (
          <ul className="verification-list">
            {verificationChecks.map((check) => (
              <li key={check.name} className="verification-item">
                <div>
                  <strong>{check.name}</strong>
                  <p>{check.detail}</p>
                </div>
                <span className={`status-chip status-${check.status}`}>{check.status}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {activeTab === 'artifacts' ? (
          <ul className="artifact-list">
            {generatedArtifacts.map((artifact) => (
              <li key={artifact.name} className="artifact-item">
                <div>
                  <strong>{artifact.name}</strong>
                  <p>{artifact.detail}</p>
                </div>
                <span>{artifact.type}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
