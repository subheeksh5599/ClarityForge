"use client";

import { useState, useRef, useEffect } from "react";

interface FileTab {
  id: string;
  name: string;
  code: string;
}

interface Props {
  files: FileTab[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onAddFile: (name: string) => void;
  onRenameFile: (id: string, name: string) => void;
  onDeleteFile: (id: string) => void;
  unsavedFiles: Set<string>;
}

export default function FileExplorer({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onRenameFile,
  onDeleteFile,
  unsavedFiles,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const createRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating && createRef.current) {
      createRef.current.focus();
    }
  }, [creating]);

  useEffect(() => {
    if (renamingId && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingId]);

  const handleCreate = () => {
    setCreating(true);
    setNewName("");
  };

  const commitCreate = () => {
    const name = newName.trim();
    if (name) {
      onAddFile(name.endsWith(".clar") ? name : `${name}.clar`);
    }
    setCreating(false);
    setNewName("");
  };

  const handleRenameStart = (f: FileTab) => {
    setRenamingId(f.id);
    setRenameValue(f.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      const name = renameValue.endsWith(".clar") ? renameValue : `${renameValue}.clar`;
      onRenameFile(renamingId, name);
    }
    setRenamingId(null);
  };

  return (
    <div className="w-52 shrink-0 border-r border-line bg-bg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-line shrink-0">
        <span className="text-[10px] font-mono text-muted/60 uppercase tracking-[0.12em]">
          Files
        </span>
        <button
          onClick={handleCreate}
          className="text-muted/50 hover:text-text text-sm leading-none font-mono transition-colors"
          title="New file"
        >
          +
        </button>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((f) => (
          <div key={f.id} className="group relative">
            {renamingId === f.id ? (
              <div className="px-3 py-1.5">
                <input
                  ref={renameRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  className="w-full bg-surface text-text text-[11px] font-mono outline-none border border-text/20 px-1.5 py-0.5"
                />
              </div>
            ) : (
              <button
                onClick={() => onSelectFile(f.id)}
                onDoubleClick={() => handleRenameStart(f)}
                className={`w-full text-left px-3 py-1.5 text-[11px] font-mono flex items-center gap-2 transition-colors ${
                  f.id === activeFileId
                    ? "text-text bg-text/[0.04] border-r-2 border-text"
                    : "text-muted/60 hover:text-text hover:bg-text/[0.02] border-r-2 border-transparent"
                }`}
              >
                <span className="shrink-0 text-[10px]">
                  {f.name.endsWith(".clar") ? "◆" : "◇"}
                </span>
                <span className="truncate flex-1 flex items-center gap-1">
                  {unsavedFiles.has(f.id) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-text/60 shrink-0" />
                  )}
                  {f.name}
                </span>
                {files.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(f.id);
                    }}
                    className="text-muted/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-auto text-xs"
                  >
                    ×
                  </span>
                )}
              </button>
            )}
          </div>
        ))}

        {/* Inline create */}
        {creating && (
          <div className="px-3 py-1.5">
            <input
              ref={createRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              placeholder="filename.clar"
              className="w-full bg-surface text-text text-[11px] font-mono outline-none border border-text/30 px-1.5 py-0.5 placeholder:text-muted/30"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-line shrink-0">
        <p className="text-[9px] text-muted/30 font-mono">
          {files.length} file{files.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
