"use client";

import { useRef, useState, useEffect } from "react";
import { X, Check, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getStroke } from "perfect-freehand";

interface DrawingCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

export function DrawingCanvas({ isOpen, onClose, onSave }: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [lines, setLines] = useState<number[][][]>([]);
  const [currentLine, setCurrentLine] = useState<number[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Clear canvas when opened
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLines([]);
      setCurrentLine([]);
      setIsDrawing(false);
    }
  }, [isOpen]);

  const getCoordinates = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return [0, 0, e.pressure];
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    // Calculate scale to account for CSS transforms (like framer-motion scale)
    const scaleX = rect.width ? svg.clientWidth / rect.width : 1;
    const scaleY = rect.height ? svg.clientHeight / rect.height : 1;
    
    return [
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top) * scaleY,
      e.pressure
    ];
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDrawing(true);
    setCurrentLine([getCoordinates(e)]);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    setCurrentLine((prev) => [...prev, getCoordinates(e)]);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    setIsDrawing(false);
    if (currentLine.length > 0) {
      setLines((prev) => [...prev, currentLine]);
      setCurrentLine([]);
    }
  };

  const clearCanvas = () => {
    setLines([]);
    setCurrentLine([]);
  };

  const handleSave = () => {
    if (!svgRef.current || !containerRef.current) return;
    
    const svg = svgRef.current;
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    
    // Create a canvas to render the SVG
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Fill white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    
    // Serialize SVG
    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl);
      onClose();
    };
    img.src = url;
  };

  const strokeOptions = {
    size: 4,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t: number) => t,
    start: {
      taper: 0,
      easing: (t: number) => t,
      cap: true
    },
    end: {
      taper: 0,
      easing: (t: number) => t,
      cap: true
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-3xl h-[80vh] max-h-[800px] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Draw Equation</h3>
                <p className="text-sm text-zinc-500">Use your finger or stylus to write</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Canvas Area */}
            <div 
              ref={containerRef}
              className="flex-1 relative bg-zinc-50 cursor-crosshair touch-none overflow-hidden"
            >
              <svg
                ref={svgRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="absolute inset-0 w-full h-full"
                style={{ touchAction: "none" }}
              >
                {lines.map((line, i) => (
                  <path
                    key={i}
                    d={getSvgPathFromStroke(getStroke(line, strokeOptions))}
                    fill="#000000"
                  />
                ))}
                {currentLine.length > 0 && (
                  <path
                    d={getSvgPathFromStroke(getStroke(currentLine, strokeOptions))}
                    fill="#000000"
                  />
                )}
              </svg>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-100 bg-white">
              <button
                onClick={clearCanvas}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <RotateCcw size={16} />
                Clear
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-black hover:bg-zinc-800 rounded-xl transition-colors shadow-sm"
                >
                  <Check size={16} />
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
