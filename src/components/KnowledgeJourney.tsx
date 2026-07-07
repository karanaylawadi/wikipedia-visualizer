"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Map } from "lucide-react";

type Props = {
  currentTopic: string;
  category: string;
  subcategory: string;
  relatedList: string[];
};

export default function KnowledgeJourney({ currentTopic, category, subcategory, relatedList }: Props) {
  const router = useRouter();

  const humanReadable = (text: string) => {
    if (!text) return "";
    return text
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Build the 5-node journey
  const nodes = useMemo(() => {
    const list = [];
    
    // Node 1: General Category
    if (category) {
      list.push({
        label: humanReadable(category),
        type: "category",
        query: humanReadable(category),
        isCurrent: false
      });
    }

    // Node 2: Subcategory
    if (subcategory && subcategory.toLowerCase() !== category.toLowerCase()) {
      list.push({
        label: humanReadable(subcategory),
        type: "subcategory",
        query: humanReadable(subcategory),
        isCurrent: false
      });
    }

    // Node 3: Current Topic (Highlighted)
    list.push({
      label: currentTopic,
      type: "current",
      query: currentTopic,
      isCurrent: true
    });

    // Node 4: Related Topic 1
    if (relatedList && relatedList.length > 0) {
      list.push({
        label: relatedList[0],
        type: "related",
        query: relatedList[0],
        isCurrent: false
      });
    }

    // Node 5: Related Topic 2
    if (relatedList && relatedList.length > 1) {
      list.push({
        label: relatedList[1],
        type: "related",
        query: relatedList[1],
        isCurrent: false
      });
    }

    return list;
  }, [currentTopic, category, subcategory, relatedList]);

  const handleNodeClick = (node: typeof nodes[0]) => {
    if (node.isCurrent) return;
    router.push(`/results?topic=${encodeURIComponent(node.query)}`);
  };

  const HorizontalConnector = () => (
    <div className="hidden md:block flex-grow h-10 min-w-[24px] self-center relative mx-0.5">
      <svg className="w-full h-full" overflow="visible">
        <line
          x1="0"
          y1="50%"
          x2="100%"
          y2="50%"
          stroke="rgba(6, 182, 212, 0.15)"
          strokeWidth="1.5"
        />
        <line
          x1="0"
          y1="50%"
          x2="100%"
          y2="50%"
          stroke="#00f5a0"
          strokeWidth="1.5"
          className="journey-glow-line"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );

  const VerticalConnector = () => (
    <div className="md:hidden w-10 h-6 flex items-center justify-center relative my-0.5">
      <svg className="w-full h-full" overflow="visible">
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke="rgba(6, 182, 212, 0.15)"
          strokeWidth="1.5"
        />
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          stroke="#00f5a0"
          strokeWidth="1.5"
          className="journey-glow-line"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );

  return (
    <section className="py-12 border-t border-white/5 animate-fade-in-up">
      <div className="flex flex-col gap-2 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400">
          Knowledge path
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
          Explore the Journey
        </h2>
      </div>

      <div className="premium-card p-8 md:p-10 flex flex-col md:flex-row items-center justify-between w-full gap-2 relative hover:border-cyan-500/10">
        <div className="absolute top-4 right-4 text-cyan-400 opacity-20 hidden md:block">
          <Map className="h-5 w-5" />
        </div>

        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;
          return (
            <React.Fragment key={index}>
              {/* Journey Node Button */}
              <button
                type="button"
                onClick={() => handleNodeClick(node)}
                disabled={node.isCurrent}
                className={`relative flex items-center gap-3 px-5 py-3 rounded-full border text-xs transition-all duration-300 w-full md:w-auto md:max-w-[200px] shrink-0 ${
                  node.isCurrent
                    ? "border-cyan-500/40 bg-cyan-950/15 text-white font-semibold shadow-[0_0_25px_rgba(6,182,212,0.15)] cursor-default"
                    : "border-white/5 bg-white/[0.01] text-neutral-400 hover:border-cyan-400/25 hover:bg-white/[0.03] hover:text-white cursor-pointer"
                }`}
              >
                {node.isCurrent ? (
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                ) : (
                  <span className="h-4 w-4 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[8px] font-bold text-neutral-500 select-none">
                    {index + 1}
                  </span>
                )}
                <span className="truncate">{node.label}</span>
              </button>

              {/* Animated Connector lines */}
              {!isLast && (
                <>
                  <HorizontalConnector />
                  <VerticalConnector />
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}
