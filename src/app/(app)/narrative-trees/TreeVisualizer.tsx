"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Badge } from "@/components/ui/badge";

// ─── Types ──────────────────────────────────────────────────────────────────

interface NarrativeNodeData {
  id: string;
  signalTitle: string;
  signalScore: number;
  nodeType: string;
  identifiedAt: string;
}

interface TreeData {
  id: string;
  rootTrend: string;
  status: string;
  nodes: NarrativeNodeData[];
  dossier: { id: string } | null;
  contentPieces: { id: string; platform: string; status: string }[];
}

interface TreeVisualizerProps {
  tree: TreeData;
  allTrees?: { id: string; rootTrend: string; status: string }[];
  onMerge?: (sourceId: string, targetId: string) => void;
  onAddHypothesis?: () => void;
}

// ─── Custom Nodes ───────────────────────────────────────────────────────────

function RootNode({ data }: NodeProps) {
  const d = data as { label: string; status: string; hasDossier: boolean };
  return (
    <div className="px-5 py-4 bg-gradient-to-br from-indigo-900/80 to-indigo-950/80 border-2 border-indigo-500/40 rounded-2xl shadow-lg shadow-indigo-500/10 min-w-[200px] max-w-[280px]">
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-indigo-300" />
      <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
        Root Trend
      </div>
      <div className="text-sm font-bold text-white leading-snug line-clamp-3">
        {d.label}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <Badge className="text-[9px] bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
          {d.status}
        </Badge>
        {d.hasDossier && (
          <Badge className="text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            Dossier
          </Badge>
        )}
      </div>
    </div>
  );
}

function SignalNode({ data }: NodeProps) {
  const d = data as { label: string; score: number; date: string };
  return (
    <div className="px-4 py-3 bg-zinc-900/90 border border-zinc-700/60 rounded-xl shadow-md min-w-[180px] max-w-[240px] hover:border-zinc-600 transition-colors">
      <Handle type="target" position={Position.Top} className="!bg-zinc-500 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-500 !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
          Signal
        </span>
        {d.score > 0 && (
          <span className="text-[9px] font-bold text-zinc-500 ml-auto">{d.score}</span>
        )}
      </div>
      <div className="text-xs font-semibold text-zinc-300 leading-snug line-clamp-2">
        {d.label}
      </div>
      <div className="text-[9px] text-zinc-600 mt-1">{d.date}</div>
    </div>
  );
}

function HypothesisNode({ data }: NodeProps) {
  const d = data as { label: string; date: string };
  return (
    <div className="px-4 py-3 bg-amber-950/40 border border-amber-500/30 rounded-xl shadow-md min-w-[180px] max-w-[240px] border-dashed">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
          What-If
        </span>
      </div>
      <div className="text-xs font-semibold text-amber-200 leading-snug line-clamp-2">
        {d.label}
      </div>
      <div className="text-[9px] text-zinc-600 mt-1">{d.date}</div>
    </div>
  );
}

function ContentNode({ data }: NodeProps) {
  const d = data as { platform: string; status: string };
  return (
    <div className="px-4 py-3 bg-violet-950/40 border border-violet-500/30 rounded-xl shadow-md min-w-[140px]">
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">
          {d.platform.replace(/_/g, " ")}
        </span>
      </div>
      <Badge className="text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/20 mt-1">
        {d.status}
      </Badge>
    </div>
  );
}

const nodeTypes = {
  root: RootNode,
  signal: SignalNode,
  hypothesis: HypothesisNode,
  content: ContentNode,
};

// ─── Layout Logic ───────────────────────────────────────────────────────────

function buildGraph(tree: TreeData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Root node
  nodes.push({
    id: tree.id,
    type: "root",
    position: { x: 300, y: 0 },
    data: { label: tree.rootTrend, status: tree.status, hasDossier: !!tree.dossier },
  });

  // Signal & hypothesis nodes — arrange in rows
  const signals = tree.nodes.filter((n) => n.nodeType !== "HYPOTHESIS");
  const hypotheses = tree.nodes.filter((n) => n.nodeType === "HYPOTHESIS");

  signals.forEach((node, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    nodes.push({
      id: node.id,
      type: "signal",
      position: { x: col * 260, y: 140 + row * 120 },
      data: {
        label: node.signalTitle,
        score: node.signalScore,
        date: new Date(node.identifiedAt).toLocaleDateString([], { month: "short", day: "numeric" }),
      },
    });
    edges.push({
      id: `e-${tree.id}-${node.id}`,
      source: tree.id,
      target: node.id,
      type: "smoothstep",
      style: { stroke: "#3f3f46", strokeWidth: 1.5 },
    });
  });

  // Hypothesis nodes on the right side
  hypotheses.forEach((node, i) => {
    const yBase = 140 + Math.ceil(signals.length / 3) * 120;
    nodes.push({
      id: node.id,
      type: "hypothesis",
      position: { x: 650, y: yBase + i * 120 },
      data: {
        label: node.signalTitle,
        date: new Date(node.identifiedAt).toLocaleDateString([], { month: "short", day: "numeric" }),
      },
    });
    edges.push({
      id: `e-${tree.id}-${node.id}`,
      source: tree.id,
      target: node.id,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#f59e0b", strokeWidth: 1.5, strokeDasharray: "5 5" },
    });
  });

  // Content piece nodes below signals
  const contentY = 140 + Math.ceil(signals.length / 3) * 120 + hypotheses.length * 120 + 40;
  tree.contentPieces.forEach((piece, i) => {
    const col = i % 4;
    nodes.push({
      id: piece.id,
      type: "content",
      position: { x: col * 200, y: contentY },
      data: { platform: piece.platform, status: piece.status },
    });
    edges.push({
      id: `e-root-${piece.id}`,
      source: tree.id,
      target: piece.id,
      type: "smoothstep",
      style: { stroke: "#5b21b6", strokeWidth: 1.5 },
    });
  });

  return { nodes, edges };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TreeVisualizer({
  tree,
  allTrees,
  onMerge,
  onAddHypothesis,
}: TreeVisualizerProps) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildGraph(tree),
    [tree]
  );

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [mergeTarget, setMergeTarget] = useState("");

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {onAddHypothesis && (
          <button
            onClick={onAddHypothesis}
            className="px-3 py-1.5 text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
          >
            + Add What-If Scenario
          </button>
        )}

        {onMerge && allTrees && allTrees.filter((t) => t.id !== tree.id && t.status === "ACTIVE").length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={mergeTarget}
              onChange={(e) => setMergeTarget(e.target.value)}
              className="px-2 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">Merge into...</option>
              {allTrees
                .filter((t) => t.id !== tree.id && t.status === "ACTIVE")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.rootTrend.slice(0, 50)}
                  </option>
                ))}
            </select>
            <button
              onClick={() => {
                if (mergeTarget) onMerge(tree.id, mergeTarget);
              }}
              disabled={!mergeTarget}
              className="px-3 py-1.5 text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-40"
            >
              Merge
            </button>
          </div>
        )}
      </div>

      {/* Graph */}
      <div className="h-[600px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          className="[&_.react-flow__background]:!bg-zinc-950"
        >
          <Background color="#27272a" gap={20} />
          <Controls className="[&_button]:!bg-zinc-800 [&_button]:!border-zinc-700 [&_button]:!text-zinc-400 [&_button:hover]:!bg-zinc-700" />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case "root": return "#6366f1";
                case "signal": return "#3f3f46";
                case "hypothesis": return "#f59e0b";
                case "content": return "#7c3aed";
                default: return "#27272a";
              }
            }}
            className="!bg-zinc-900 !border-zinc-800"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
