'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, RefreshCw } from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  css: 'css',
  html: 'html',
  md: 'markdown',
  py: 'python',
  cpp: 'cpp',
};

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return LANGUAGE_MAP[ext] ?? 'plaintext';
}

// ─── File Tree Node ────────────────────────────────────────────────────────────

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (node: FileNode) => void;
}

function FileTreeNode({ node, depth, selectedPath, onSelect }: FileTreeNodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const isSelected = selectedPath === node.path;

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 w-full text-left px-2 py-0.5 hover:bg-zinc-800 rounded text-sm text-zinc-300"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {open ? (
            <ChevronDown size={12} className="shrink-0 text-gray-400" />
          ) : (
            <ChevronRight size={12} className="shrink-0 text-gray-400" />
          )}
          {open ? (
            <FolderOpen size={14} className="shrink-0 text-yellow-500" />
          ) : (
            <Folder size={14} className="shrink-0 text-yellow-500" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node)}
      className={`flex items-center gap-1 w-full text-left px-2 py-0.5 rounded text-sm truncate ${
        isSelected
          ? 'bg-zinc-700 text-zinc-50 font-medium'
          : 'hover:bg-zinc-800 text-zinc-400'
      }`}
      style={{ paddingLeft: `${depth * 12 + 22}px` }}
    >
      <File size={13} className="shrink-0 text-gray-400" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface CodeEditorProps {
  repoName: string;
}

export default function CodeEditor({ repoName }: CodeEditorProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  const fetchTree = useCallback(async (repo: string) => {
    if (!repo.trim()) {
      setTree([]);
      setTreeError(null);
      return;
    }
    setLoadingTree(true);
    setTreeError(null);
    try {
      const res = await fetch(`/api/repo-files?repoName=${encodeURIComponent(repo)}`);
      const json = await res.json();
      if (!res.ok) {
        setTreeError(json.error ?? 'Failed to load repository');
        setTree([]);
      } else {
        setTree(json.tree ?? []);
      }
    } catch {
      setTreeError('Network error loading repository');
      setTree([]);
    } finally {
      setLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    setSelectedFile(null);
    setFileContent('');
    fetchTree(repoName);
  }, [repoName, fetchTree]);

  const handleSelectFile = async (node: FileNode) => {
    setSelectedFile(node);
    setFileContent('');
    setLoadingFile(true);
    try {
      const res = await fetch(
        `/api/repo-files?repoName=${encodeURIComponent(repoName)}&filePath=${encodeURIComponent(node.path)}`
      );
      const json = await res.json();
      setFileContent(res.ok ? (json.content ?? '') : `// Error: ${json.error}`);
    } catch {
      setFileContent('// Network error loading file');
    } finally {
      setLoadingFile(false);
    }
  };

  const noRepo = !repoName.trim();

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-700 bg-zinc-900 shrink-0">
        <span className="text-sm font-semibold text-zinc-300">
          {repoName ? repoName : 'Code Explorer'}
        </span>
        {!noRepo && (
          <button
            onClick={() => fetchTree(repoName)}
            disabled={loadingTree}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={14} className={loadingTree ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        {/* File Explorer */}
        <div className="w-52 shrink-0 border-r border-zinc-700 overflow-y-auto bg-zinc-900 py-2">
          {noRepo && (
            <p className="text-xs text-zinc-500 px-3 mt-2">
              Enter a repository name to browse files.
            </p>
          )}
          {loadingTree && (
            <p className="text-xs text-zinc-500 px-3 mt-2 flex items-center gap-1">
              <RefreshCw size={12} className="animate-spin" /> Loading...
            </p>
          )}
          {treeError && (
            <p className="text-xs text-red-500 px-3 mt-2">{treeError}</p>
          )}
          {!loadingTree && !treeError && tree.length === 0 && !noRepo && (
            <p className="text-xs text-zinc-500 px-3 mt-2">No files found.</p>
          )}
          {tree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedFile?.path ?? null}
              onSelect={handleSelectFile}
            />
          ))}
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Tab bar */}
          {selectedFile && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-700 bg-zinc-900 text-xs text-zinc-400 shrink-0">
              <File size={12} className="text-gray-400" />
              <span className="font-mono">{selectedFile.path}</span>
            </div>
          )}

          {loadingFile && (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              <RefreshCw size={16} className="animate-spin mr-2" /> Loading file...
            </div>
          )}

          {!loadingFile && !selectedFile && (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Select a file to view its contents
            </div>
          )}

          {!loadingFile && selectedFile && (
            <div className="flex-1 min-h-0">
              <MonacoEditor
                height="100%"
                language={getLanguage(selectedFile.name)}
                value={fileContent}
                  theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  renderLineHighlight: 'line',
                  folding: true,
                  padding: { top: 8 },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
