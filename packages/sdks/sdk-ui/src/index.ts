import React from 'react';

export interface UIPanelExtension {
  id: string;
  title: string;
  position: 'left' | 'right' | 'bottom';
  render: () => React.ReactNode;
}

export function registerUIPanel(extension: UIPanelExtension) {
  console.log(`[UI SDK] Extension panel registered: ${extension.title} (${extension.id})`);
}
