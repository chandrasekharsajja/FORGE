import React from 'react';

export function TerminalPanel() {
  return (
    <div style={{ height: '180px', background: '#181818', borderTop: '1px solid #333', color: '#00ff00', fontFamily: 'monospace', padding: '8px', fontSize: '13px' }}>
      <div style={{ color: '#888', marginBottom: '4px' }}>xterm.js Integrated Terminal & MicroVM Sandbox Stream</div>
      <div>platform-dev@ai-os:~$ docker-compose -f deploy/docker-compose.yml up -d</div>
      <div style={{ color: '#aaa' }}>[+] Running 5/5</div>
      <div style={{ color: '#aaa' }}> ✔ Container ai_platform_postgres Started</div>
      <div style={{ color: '#aaa' }}> ✔ Container ai_platform_redis Started</div>
      <div style={{ color: '#aaa' }}> ✔ Container ai_platform_qdrant Started</div>
      <div>platform-dev@ai-os:~$ <span style={{ animation: 'blink 1s infinite' }}>_</span></div>
    </div>
  );
}
