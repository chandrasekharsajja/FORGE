'use client';

import { useState } from 'react';
import type { EditorFile } from '../../lib/dashboard-data';

export function MonacoEditorContainer({ editorFiles }: { editorFiles: EditorFile[] }) {
  const [activeFileId, setActiveFileId] = useState(editorFiles[0]!.id);
  const [fileDrafts, setFileDrafts] = useState<Record<string, string>>(
    Object.fromEntries(editorFiles.map((file) => [file.id, file.content])),
  );
  const [message, setMessage] = useState('Choose a file, make a note, and stage the draft for review.');

  const activeFile = editorFiles.find((file) => file.id === activeFileId) ?? editorFiles[0]!;
  const activeDraft = fileDrafts[activeFile.id];
  const isDirty = activeDraft !== activeFile.content;

  return (
    <section className="panel workspace-editor">
      <div className="editor-shell">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Editor</span>
            <h2>Focused workspace</h2>
          </div>
          <span>{activeFile.path}</span>
        </div>

        <div className="tab-row" aria-label="Open files">
          {editorFiles.map((file) => (
            <button
              key={file.id}
              type="button"
              className={`tab-button ${file.id === activeFileId ? 'tab-active' : ''}`}
              onClick={() => {
                setActiveFileId(file.id);
                setMessage(`Opened ${file.path}.`);
              }}
            >
              {file.label}
            </button>
          ))}
        </div>

        <div className="editor-layout">
          <div className="editor-pane">
            <div className="editor-toolbar">
              <div>
                <strong>{activeFile.label}</strong>
                <span>{activeFile.summary}</span>
              </div>

              <div className="editor-toolbar-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setFileDrafts((current) => ({
                      ...current,
                      [activeFile.id]: activeFile.content,
                    }));
                    setMessage(`Reset ${activeFile.path} to the current repo snapshot.`);
                  }}
                >
                  Reset draft
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!isDirty}
                  onClick={() => {
                    setMessage(`Draft for ${activeFile.path} staged for review.`);
                  }}
                >
                  Stage draft
                </button>
              </div>
            </div>

            <textarea
              className="editor-textarea"
              value={activeDraft}
              onChange={(event) => {
                const nextValue = event.target.value;
                setFileDrafts((current) => ({
                  ...current,
                  [activeFile.id]: nextValue,
                }));
                setMessage(`Editing ${activeFile.path}.`);
              }}
              spellCheck={false}
            />
          </div>

          <div className="editor-detail-column">
            <article className="detail-card">
              <strong>File details</strong>
              <dl className="detail-list">
                <div>
                  <dt>Path</dt>
                  <dd>{activeFile.path}</dd>
                </div>
                <div>
                  <dt>Language</dt>
                  <dd>{activeFile.language}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{activeFile.status}</dd>
                </div>
                <div>
                  <dt>Kind</dt>
                  <dd>{activeFile.kind}</dd>
                </div>
              </dl>
            </article>

            <article className="detail-card">
              <strong>Review lens</strong>
              <p>
                The highest-value edits in this repo improve honesty, usability, and confidence
                for public visitors.
              </p>
            </article>

            <article className="detail-card editor-hint">
              <strong>Draft status</strong>
              <span>{isDirty ? 'Unsaved edits in this tab' : 'In sync with the current snapshot'}</span>
              <p>{message}</p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
