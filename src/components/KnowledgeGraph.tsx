"use client";

import { useMemo } from "react";
import { ReactFlow, Background } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type RelatedArticleItem = {
  title: string;
  description?: string;
  relevanceScore?: number;
  category?: string;
  connections?: string[];
};

type Props = {
  title: string;
  related: RelatedArticleItem[];
  onSelectNode?: (topic: string) => void;
};

export default function KnowledgeGraph({ title, related, onSelectNode }: Props) {
  const { nodes, edges } = useMemo(() => {
    // 1. Initialize nodes list with seed circular coordinates
    const initialNodes = [
      { id: "main", title, x: 0, y: 0, fx: 0, fy: 0, isMain: true, relevanceScore: 1.0, category: "main" },
      ...related.map((item, index) => {
        const angle = (index * 2 * Math.PI) / Math.max(related.length, 1);
        const initRadius = 160 + (index % 5) * 12;
        return {
          id: String(index),
          title: item.title,
          x: Math.cos(angle) * initRadius,
          y: Math.sin(angle) * initRadius,
          fx: 0,
          fy: 0,
          isMain: false,
          relevanceScore: item.relevanceScore || 0.8,
          category: item.category || "concept",
        };
      }),
    ];

    // 2. Establish connections (edges)
    const activeEdges: Array<{ id: string; source: string; target: string; animated?: boolean; style?: React.CSSProperties }> = [];
    
    // Connect center node to all related nodes
    related.forEach((_, index) => {
      activeEdges.push({
        id: `edge-main-${index}`,
        source: "main",
        target: String(index),
        animated: true,
        style: { stroke: "rgba(255, 255, 255, 0.08)", strokeWidth: 1.5 },
      });
    });

    // Connect related nodes to each other based on their semantic connections
    related.forEach((item, i) => {
      if (Array.isArray(item.connections)) {
        item.connections.forEach((connTitle) => {
          const targetIndex = related.findIndex((r) => r.title.toLowerCase() === connTitle.toLowerCase());
          if (targetIndex !== -1 && targetIndex !== i) {
            const edgeId = i < targetIndex ? `edge-${i}-${targetIndex}` : `edge-${targetIndex}-${i}`;
            if (!activeEdges.some((e) => e.id === edgeId)) {
              activeEdges.push({
                id: edgeId,
                source: String(i),
                target: String(targetIndex),
                animated: false,
                style: { stroke: "rgba(0, 217, 245, 0.15)", strokeWidth: 1 },
              });
            }
          }
        });
      }
    });

    // 3. Run spring-embedder simulation (physics solver)
    const iterations = 80;
    const kRepel = 200000; // Repel constant
    const kSpring = 0.05;  // Spring constant
    const dRest = 200;     // Resting distance
    const dt = 0.4;        // Time delta

    for (let step = 0; step < iterations; step++) {
      // Repulsion force between all node pairs
      for (let i = 0; i < initialNodes.length; i++) {
        const n1 = initialNodes[i];
        for (let j = i + 1; j < initialNodes.length; j++) {
          const n2 = initialNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          
          if (dist < 600) {
            const force = kRepel / (dist * dist);
            const fx = force * (dx / dist);
            const fy = force * (dy / dist);
            
            n1.fx -= fx;
            n1.fy -= fy;
            n2.fx += fx;
            n2.fy += fy;
          }
        }
      }

      // Attraction force along connected edges
      activeEdges.forEach((edge) => {
        const sNode = initialNodes.find((n) => n.id === edge.source);
        const tNode = initialNodes.find((n) => n.id === edge.target);
        if (!sNode || !tNode) return;

        const dx = tNode.x - sNode.x;
        const dy = tNode.y - sNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = kSpring * (dist - dRest);
        const fx = force * (dx / dist);
        const fy = force * (dy / dist);
        
        sNode.fx += fx;
        sNode.fy += fy;
        tNode.fx -= fx;
        tNode.fy -= fy;
      });

      // Update positions
      initialNodes.forEach((node) => {
        if (node.isMain) {
          // Keep center node anchored at origin
          node.x = 0;
          node.y = 0;
        } else {
          // Apply forces with damping factor
          node.x += node.fx * dt;
          node.y += node.fy * dt;
        }
        node.fx = 0;
        node.fy = 0;
      });
    }

    // Map computed layout back to React Flow nodes structure
    const reactFlowNodes = initialNodes.map((node) => {
      // Determine category styling
      let borderCol = "rgba(0, 217, 245, 0.4)";
      let bgCol = "rgba(0, 217, 245, 0.05)";
      let textCol = "#d4d4d8";
      let glowShadow = "0 4px 20px rgba(0, 0, 0, 0.3)";

      if (node.isMain) {
        borderCol = "rgba(0, 245, 160, 0.5)";
        bgCol = "rgba(0, 245, 160, 0.05)";
        textCol = "#ffffff";
        glowShadow = "0 0 35px rgba(0, 245, 160, 0.25)";
      } else {
        switch (node.category.toLowerCase()) {
          case "person":
            borderCol = "rgba(121, 40, 202, 0.4)";
            bgCol = "rgba(121, 40, 202, 0.05)";
            break;
          case "place":
            borderCol = "rgba(59, 130, 246, 0.4)";
            bgCol = "rgba(59, 130, 246, 0.05)";
            break;
          case "event":
            borderCol = "rgba(239, 68, 68, 0.4)";
            bgCol = "rgba(239, 68, 68, 0.05)";
            break;
          case "period":
            borderCol = "rgba(245, 158, 11, 0.4)";
            bgCol = "rgba(245, 158, 11, 0.05)";
            break;
          case "organization":
            borderCol = "rgba(16, 185, 129, 0.4)";
            bgCol = "rgba(16, 185, 129, 0.05)";
            break;
        }
      }

      const baseScale = node.isMain ? 1.25 : 0.8 + node.relevanceScore * 0.45;

      return {
        id: node.id,
        position: { x: node.x, y: node.y },
        data: { label: node.title },
        style: {
          border: `1px solid ${borderCol}`,
          borderRadius: 999,
          padding: node.isMain ? "20px 32px" : "12px 20px",
          background: bgCol,
          backdropFilter: "blur(8px)",
          color: textCol,
          fontSize: `${13 * baseScale}px`,
          fontWeight: node.isMain ? 700 : 500,
          textAlign: "center" as const,
          cursor: node.isMain ? "default" : "pointer",
          transition: "all 0.3s ease",
          boxShadow: glowShadow,
          minWidth: node.isMain ? "160px" : "110px",
        },
      };
    });

    return { nodes: reactFlowNodes, edges: activeEdges };
  }, [title, related]);

  return (
    <section className="py-16 md:py-24 border-b border-white/5 animate-fade-in-up">
      <div className="flex flex-col gap-2 mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400 font-mono">
          Knowledge Map
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-white bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
          Connected Ideas
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-neutral-400 font-light">
          Click any connected node to explore its briefing.
        </p>
      </div>

      <div className="h-[420px] w-full overflow-hidden rounded-[2rem] border border-white/5 bg-[#07070a] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
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