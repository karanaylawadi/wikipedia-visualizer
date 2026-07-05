"use client";

import { ReactFlow, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type RelatedArticleItem = {
  title: string;
  description?: string;
  thumbnail?: { source: string };
};

type Props = {
  title: string;
  related: RelatedArticleItem[];
  onSelectNode?: (topic: string) => void;
};

export default function KnowledgeGraph({ title, related, onSelectNode }: Props) {
  // Center main node, distribute related nodes in a circular or structured layout around it
  const mainNode = {
    id: "main",
    position: { x: 400, y: 150 },
    data: { label: title },
    style: {
      border: "1px solid rgba(0, 245, 160, 0.4)",
      borderRadius: 999,
      padding: "20px 32px",
      fontWeight: 700,
      background: "rgba(0, 245, 160, 0.05)",
      color: "#ffffff",
      fontSize: 18,
      boxShadow: "0 0 30px rgba(0, 245, 160, 0.15)",
      textAlign: "center" as const,
      cursor: "default",
    },
  };

  const relatedNodes = related.slice(0, 6).map((article, index) => {
    // Distribute nodes in a semi-circle or ring around the center
    const angle = (index * 2 * Math.PI) / Math.min(related.length, 6);
    const radius = 240;
    const x = 400 + radius * Math.cos(angle);
    const y = 150 + radius * Math.sin(angle);

    return {
      id: String(index),
      position: { x, y },
      data: { label: article.title },
      style: {
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 999,
        padding: "12px 20px",
        background: "rgba(15, 15, 20, 0.8)",
        backdropFilter: "blur(8px)",
        color: "#d4d4d8",
        fontSize: 14,
        textAlign: "center" as const,
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      },
    };
  });

  const nodes = [mainNode, ...relatedNodes];

  const edges = related.slice(0, 6).map((_, index) => ({
    id: `e-${index}`,
    source: "main",
    target: String(index),
    animated: true,
    style: {
      stroke: "rgba(0, 217, 245, 0.25)",
      strokeWidth: 2,
    },
  }));

  return (
    <section className="border-t border-white/5 py-12 md:py-16">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400">
            Knowledge Map
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Connected Ideas
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-neutral-400">
          A visual representation of topics connected through references. Click any connected node to explore its briefing.
        </p>
      </div>

      <div className="mt-8 h-[480px] w-full overflow-hidden rounded-[2rem] border border-white/5 bg-[#07070a] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          zoomOnScroll={false}
          panOnScroll
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, node) => {
            if (node.id === "main") return;
            onSelectNode?.(node.data.label);
          }}
        >
          <Background color="#222" gap={25} size={1} />
        </ReactFlow>
      </div>
    </section>
  );
}