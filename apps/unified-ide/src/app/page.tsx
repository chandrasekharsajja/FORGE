import React from 'react';
import { MonacoEditorContainer } from '../components/Editor/MonacoEditorContainer';
import { AgentSidePanel } from '../components/AgentSidePanel';
import { TerminalPanel } from '../components/Terminal/TerminalPanel';

export default function UnifiedIDEPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: '#1e1e1e' }}>
      {/* Top Header Bar */}
      <div style={{ height: '36px', background: '#3c3c3c', color: '#ccc', display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '13px', borderBottom: '1px solid #222' }}>
        <strong>OpenCode Autonomous AI Platform</strong> &nbsp; | &nbsp; Model: Qwen3-Coder (via LiteLLM Router)
      </div>

      {/* Main Workspace Layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Directory Sidebar */}
        <div style={{ width: '220px', background: '#252526', borderRight: '1px solid #333', color: '#ccc', padding: '10px', fontSize: '13px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>EXPLORER</div>
          <div>📁 apps/unified-ide</div>
          <div>📁 services/orchestrator</div>
          <div>📁 services/model-router</div>
          <div>📁 services/memory-service</div>
          <div>📁 services/knowledge-service</div>
          <div>📁 services/execution-engine</div>
          <div>📁 services/mcp-gateway</div>
          <div>📄 docker-compose.yml</div>
        </div>

        {/* Center Editor + Terminal Stack */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <MonacoEditorContainer />
          <TerminalPanel />
        </div>

        {/* Right Cursor/Antigravity Agent Command Center */}
        <AgentSidePanel />
      </div>
    </div>
  );
}
