"use client";

import { ReactFlow, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type Props = {
  title: string;
  related: any[];
};

export default function KnowledgeGraph({ title, related }: Props) {
  const nodes = [
    {
      id: "main",
      position: { x: 420, y: 80 },
      data: { label: title },
      style: {
        border: "1px solid #111",
        borderRadius: 999,
        padding: "22px 34px",
        fontWeight: 700,
        background: "#fff",
        fontSize: 20,
      },
    },
    ...related.slice(0, 8).map((article, index) => ({
      id: String(index),
      position: {
        x: 70 + (index % 4) * 250,
        y: 300 + Math.floor(index / 4) * 160,
      },
      data: { label: article.title },
      style: {
        border: "1px solid #d4d4d4",
        borderRadius: 999,
        padding: "16px 24px",
        background: "#fff",
        fontSize: 15,
        color: "#111",
      },
    })),
  ];

  const edges = related.slice(0, 8).map((_, index) => ({
    id: `e-${index}`,
    source: "main",
    target: String(index),
    style: {
      stroke: "#c7c7c7",
      strokeWidth: 1,
    },
  }));

  return (
    <section className="border-b border-neutral-200 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">
        Knowledge Map
      </p>

      <h2 className="mt-3 text-5xl font-bold">Connected Ideas</h2>

      <p className="mt-4 max-w-2xl text-xl leading-8 text-neutral-600">
        A visual map of articles connected through Wikipedia references.
      </p>

      <div className="mt-10 h-[560px] w-full border border-neutral-200 bg-white">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          zoomOnScroll={false}
          panOnScroll
          nodesDraggable={false}
          nodesConnectable={false}
        >
          <Background color="#f3f3f3" gap={42} />
        </ReactFlow>
      </div>
    </section>
  );
}