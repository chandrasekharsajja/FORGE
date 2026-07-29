import React, { useState } from 'react';

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
}

export function MonacoEditorContainer({ initialCode = '// Welcome to Autonomous AI IDE\nexport function example() {\n  return "Hello World";\n}', language = 'typescript' }: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);

  return (
    <div style={{ flex: 1, height: '100%', background: '#1e1e1e', color: '#d4d4d4', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#252526', padding: '6px 12px', fontSize: '12px', borderBottom: '1px solid #333' }}>
        <span>main.ts ({language})</span>
      </div>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{
          flex: 1,
          width: '100%',
          background: '#1e1e1e',
          color: '#d4d4d4',
          fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
          fontSize: '14px',
          border: 'none',
          padding: '12px',
          resize: 'none',
          outline: 'none'
        }}
      />
    </div>
  );
}
