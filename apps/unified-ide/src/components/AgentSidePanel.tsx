'use client';

import { FormEvent, useState } from 'react';

type AgentStatus = 'idle' | 'running' | 'verified' | 'needs_review' | 'error';

interface RunHistoryItem {
  prompt: string;
  summary: string;
  status: string;
}

export function AgentSidePanel({
  promptSuggestions,
}: {
  promptSuggestions: string[];
}) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [message, setMessage] = useState('Use a release prompt or pick a suggestion below.');
  const [logs, setLogs] = useState<string[]>([]);
  const [history, setHistory] = useState<RunHistoryItem[]>([]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const missionPrompt = prompt.trim();

    if (!missionPrompt) {
      setMessage('Enter a mission before running the agent lane.');
      return;
    }

    setStatus('running');
    setMessage('Agent lane is calling the live mission API.');
    setLogs([`[User] ${missionPrompt}`]);

    try {
      const response = await fetch('/api/mission', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: missionPrompt }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Mission request failed.');
      }

      const missionLogs = Array.isArray(payload?.logs) ? payload.logs : [];
      setLogs([`[User] ${missionPrompt}`, ...missionLogs]);
      setStatus(payload?.status === 'verified' ? 'verified' : 'needs_review');
      setMessage(payload?.summary ?? 'Mission completed.');
      setHistory((current) =>
        [
          {
            prompt: missionPrompt,
            summary: payload?.summary ?? 'Mission completed.',
            status: payload?.status ?? 'needs_review',
          },
          ...current,
        ].slice(0, 3),
      );
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Mission request failed.');
      setLogs((current) => [...current, '[Error] Live mission API could not complete the request.']);
    }
  };

  return (
    <aside className="panel agent-panel">
      <div className="agent-shell">
        <div className="agent-header">
          <div className="agent-copy">
            <span className="eyebrow">Agent lane</span>
            <h2>Command center</h2>
            <p>Queue a mission, inspect the run log, and keep the public release story tight.</p>
          </div>
          <span className={`status-chip status-${status}`}>{status}</span>
        </div>

        <div className="agent-suggestions" aria-label="Prompt suggestions">
          {promptSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="suggestion-button"
              onClick={() => {
                setPrompt(suggestion);
                setMessage('Suggestion loaded. Run it when you are ready.');
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form className="agent-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <h3>Mission prompt</h3>
            <span>Local demo lane</span>
          </div>
          <label htmlFor="agent-prompt" className="sr-only">
            Mission prompt
          </label>
          <textarea
            id="agent-prompt"
            className="agent-input"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Audit the public workspace flow and flag what still feels prototype-grade."
          />
          <div className="agent-actions">
            <div className="message-line" aria-live="polite">
              {message}
            </div>
            <button type="submit" className="primary-button">
              {status === 'running' ? 'Running mission' : 'Run mission'}
            </button>
          </div>
        </form>

        {logs.length === 0 ? (
          <div className="empty-state">
            <strong>No manual run yet</strong>
            <p>The release board is ready. Start with a prompt to populate the mission log.</p>
          </div>
        ) : (
          <div className="activity-log" aria-live="polite">
            <div className="section-heading">
              <h3>Live log</h3>
              <span>{logs.length} events</span>
            </div>
            <ul>
              {logs.map((log) => {
                const [label, ...rest] = log.split(']');
                const title = `${label}]`;
                const detail = rest.join(']').trim();

                return (
                  <li key={log}>
                    <div>
                      <strong>{title}</strong>
                      <span>{detail}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="history-block">
          <div className="section-heading">
            <h3>Recent runs</h3>
            <span>{history.length || 0} stored</span>
          </div>
          {history.length === 0 ? (
            <p className="status-note">Completed missions will appear here.</p>
          ) : (
            <ul>
              {history.map((item) => (
                <li key={`${item.prompt}-${item.summary}`}>
                  <div>
                    <strong>{item.prompt}</strong>
                    <span>
                      {item.summary} • {item.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
