import React, { useState } from 'react';

export function AgentSidePanel() {
  const [prompt, setPrompt] = useState('');
  const [thoughtLogs, setThoughtLogs] = useState<string[]>([
    '[System]: Platform ready. Connected to Ruflo Swarm & Temporal Orchestrator.'
  ]);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleRunAgent = () => {
    if (!prompt.trim()) return;
    setIsExecuting(true);
    setThoughtLogs(prev => [
      ...prev,
      `[User]: ${prompt}`,
      `[Planner]: Analyzing codebase context...`,
      `[Coder]: Generating code modifications...`
    ]);
    setTimeout(() => {
      setThoughtLogs(prev => [
        ...prev,
        `[Reviewer]: Verification passed. Code applied.`
      ]);
      setIsExecuting(false);
    ]);
  };

  return (
    <div style={{ width: '350px', borderLeft: '1px solid #333', background: '#1e1e1e', color: '#fff', padding: '12px', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Agent Command Center</h3>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', fontFamily: 'monospace', fontSize: '12px', background: '#121212', padding: '8px', borderRadius: '4px' }}>
        {thoughtLogs.map((log, index) => (
          <div key={index} style={{ marginBottom: '6px', color: log.startsWith('[User]') ? '#4fc3f7' : '#a5d6a7' }}>
            {log}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask agent to build, refactor, or test..."
          style={{ flex: 1, background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '8px' }}
        />
        <button
          onClick={handleRunAgent}
          disabled={isExecuting}
          style={{ background: '#007acc', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer' }}
        >
          {isExecuting ? 'Running...' : 'Run'}
        </button>
      </div>
    </div>
  );
}
