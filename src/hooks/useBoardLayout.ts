import { useRef } from 'react';
import { Editor, TLShapeId } from 'tldraw';

interface BoardLayoutState {
  cursorY: number;
  pageWidth: number;
  marginTop: number;
  elementSpacing: number;
}

export function useBoardLayout() {
  const state = useRef<BoardLayoutState>({
    cursorY: 100,
    pageWidth: 800, // standard readable width
    marginTop: 100,
    elementSpacing: 40,
  });

  const getTextDimensions = (text: string, fontSize: number = 24, maxWidth: number = 500) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return { width: 400, height: 100 };

    // Guard: إذا كان النص فارغاً، أعد أبعاداً افتراضية
    if (!text || text.trim() === '') return { width: 200, height: 80 };
    
    // tldraw uses Inter or similar sans-serif. We approximate.
    ctx.font = `${fontSize}px sans-serif`;
    
    // word wrap logic
    const words = text.split(' ');
    let lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    
    const lineHeight = fontSize * 1.5;
    const height = lines.length * lineHeight;
    
    // calculate max width actually used
    const actualWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
    
    return {
      width: Math.max(actualWidth + 40, 200), // add padding
      height: Math.max(height + 40, 80) // add padding
    };
  };

  const getNextPosition = (editor: Editor, type: string, content?: string) => {
    const s = state.current;
    
    let w = 400;
    let h = 300; // default for shapes/graphs
    
    if (type === 'write_note' && content) {
      const dims = getTextDimensions(content);
      w = dims.width;
      h = dims.height;
    } else if (type === 'write_formula') {
      w = 500;
      h = 150;
    } else if (type === 'draw_vector') {
      return { x: 0, y: 0, w: 0, h: 0 };
    }
    
    // align to right for RTL (assuming page center is around x=0 or we can use fixed right margin)
    // Tldraw infinite canvas, so we can pick an arbitrary center, say x=500 is right edge.
    // Let's use x = 800 - w for right alignment.
    const x = 800 - w;
    const y = s.cursorY;
    
    // Advance cursor
    s.cursorY += h + s.elementSpacing;
    
    // Pan camera if needed
    const viewportBounds = editor.getViewportPageBounds();
    // If the newly added item is below the current viewport
    if (y + h > viewportBounds.maxY - 100) {
      editor.setCamera({ x: editor.getCamera().x, y: editor.getCamera().y - (y + h - viewportBounds.maxY + 200) });
    }
    
    return { x, y, w, h };
  };

  const getShapeCenter = (editor: Editor, shapeId: string) => {
    const shape = editor.getShape(shapeId as TLShapeId);
    if (!shape) return { x: 0, y: 0 };
    const bounds = editor.getShapePageBounds(shape.id);
    if (!bounds) return { x: shape.x, y: shape.y };
    return {
      x: bounds.midX,
      y: bounds.midY
    };
  };

  return {
    state,
    getNextPosition,
    getShapeCenter
  };
}
