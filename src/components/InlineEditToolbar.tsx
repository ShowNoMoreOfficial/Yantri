"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";

interface InlineEditToolbarProps {
  containerRef: React.RefObject<HTMLElement | null>;
  context?: string;
  onRewrite?: (original: string, rewritten: string) => void;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

export default function InlineEditToolbar({
  containerRef,
  context,
  onRewrite,
}: InlineEditToolbarProps) {
  const [selectedText, setSelectedText] = useState("");
  const [toolbarPos, setToolbarPos] = useState<ToolbarPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      // Small delay to avoid flickering when clicking toolbar buttons
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (toolbarRef.current?.contains(activeEl)) return;
        setToolbarPos(null);
        setSelectedText("");
        setShowCustom(false);
      }, 200);
      return;
    }

    const text = selection.toString().trim();
    if (!text || text.length < 5) return;

    // Ensure selection is within our container
    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setSelectedText(text);
    setToolbarPos({
      top: rect.top - containerRect.top - 48,
      left: rect.left - containerRect.left + rect.width / 2,
    });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
    };
  }, [handleSelection]);

  async function rewrite(instruction: string) {
    if (!selectedText || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/yantri/rewrite-segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalText: selectedText,
          userInstruction: instruction,
          context: context ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rewrite failed");

      if (onRewrite) {
        onRewrite(selectedText, data.rewrittenText);
      }

      setToolbarPos(null);
      setSelectedText("");
      setShowCustom(false);
      window.getSelection()?.removeAllRanges();
    } catch {
      // Silently fail — the parent can handle toast errors
    } finally {
      setLoading(false);
    }
  }

  if (!toolbarPos || !selectedText) return null;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 animate-fade-in"
      style={{
        top: `${toolbarPos.top}px`,
        left: `${toolbarPos.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl shadow-black/40 overflow-hidden">
        {showCustom ? (
          <div className="flex items-center gap-1 p-1.5">
            <input
              type="text"
              autoFocus
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customInstruction.trim()) rewrite(customInstruction);
                if (e.key === "Escape") { setShowCustom(false); setCustomInstruction(""); }
              }}
              placeholder="Rewrite instruction..."
              className="px-2 py-1 bg-transparent text-xs text-foreground focus:outline-none w-48"
            />
            <button
              onClick={() => { if (customInstruction.trim()) rewrite(customInstruction); }}
              disabled={loading || !customInstruction.trim()}
              className="px-2 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Go"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5 p-1">
            <button
              onClick={() => rewrite("Rewrite this to be clearer and more impactful")}
              disabled={loading}
              className="px-3 py-1.5 text-[11px] font-bold text-zinc-300 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Rewrite"}
            </button>
            <div className="w-px h-5 bg-zinc-700" />
            <button
              onClick={() => rewrite("Shorten this by at least 30% while keeping the key message")}
              disabled={loading}
              className="px-3 py-1.5 text-[11px] font-bold text-zinc-300 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
            >
              Shorten
            </button>
            <div className="w-px h-5 bg-zinc-700" />
            <button
              onClick={() => { setShowCustom(true); setCustomInstruction(""); }}
              disabled={loading}
              className="px-3 py-1.5 text-[11px] font-bold text-zinc-300 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
            >
              Custom
            </button>
          </div>
        )}
      </div>
      {/* Arrow */}
      <div className="flex justify-center">
        <div className="w-2.5 h-2.5 bg-zinc-900 border-r border-b border-zinc-700 rotate-45 -mt-[5px]" />
      </div>
    </div>
  );
}
