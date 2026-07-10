import React from 'react';
import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw';
import { evaluate } from 'mathjs';

// Approximate SVG path length from point count and step
function approximatePathLength(points: [number, number][]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.max(length, 100);
}

export class FunctionGraphShapeUtil extends ShapeUtil<any> {
  static override type = 'function-graph' as const;

  override getDefaultProps(): any {
    return {
      w: 400,
      h: 400,
      expression: 'x^2',
      domain: [-5, 5],
      color: 'blue'
    };
  }

  override getGeometry(shape: any) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false });
  }

  override getIndicatorPath(shape: any) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  override indicator(shape: any) {
    return <rect width={shape.props.w} height={shape.props.h} fill="none" stroke="blue" />;
  }

  override component(shape: any) {
    const { expression, domain, color, w, h } = shape.props;

    const scale = 40;
    const originX = w / 2;
    const originY = h / 2;

    const step = (domain[1] - domain[0]) / 300;
    const screenPoints: [number, number][] = [];

    for (let x = domain[0]; x <= domain[1]; x += step) {
      try {
        const y = evaluate(expression, { x });
        if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
          const px = originX + x * scale;
          const py = originY - y * scale;
          screenPoints.push([px, py]);
        }
      } catch (err) {
        // ignore
      }
    }

    if (screenPoints.length === 0) {
      return <HTMLContainer>Invalid Function</HTMLContainer>;
    }

    const pathData = screenPoints.map(([px, py], i) =>
      `${i === 0 ? 'M' : 'L'} ${px.toFixed(2)},${py.toFixed(2)}`
    ).join(' ');

    // Compute actual path length for accurate animation
    const pathLength = Math.ceil(approximatePathLength(screenPoints));

    const axisColor = '#cbd5e1';

    // Tick marks every 1 unit
    const ticks: React.ReactElement[] = [];
    for (let xi = Math.ceil(domain[0]); xi <= Math.floor(domain[1]); xi++) {
      if (xi === 0) continue;
      const px = originX + xi * scale;
      ticks.push(
        <g key={`tx-${xi}`}>
          <line x1={px} y1={originY - 4} x2={px} y2={originY + 4} stroke={axisColor} strokeWidth={1.5} />
          <text x={px} y={originY + 16} textAnchor="middle" fontSize="10" fill={axisColor}>{xi}</text>
        </g>
      );
    }
    for (let yi = -4; yi <= 4; yi++) {
      if (yi === 0) continue;
      const py = originY - yi * scale;
      if (py < 0 || py > h) continue;
      ticks.push(
        <g key={`ty-${yi}`}>
          <line x1={originX - 4} y1={py} x2={originX + 4} y2={py} stroke={axisColor} strokeWidth={1.5} />
          <text x={originX - 14} y={py + 4} textAnchor="middle" fontSize="10" fill={axisColor}>{yi}</text>
        </g>
      );
    }

    return (
      <HTMLContainer>
        <svg width={w} height={h} style={{ overflow: 'visible', background: 'transparent' }}>
          {/* Grid lines */}
          <line x1={0} y1={originY} x2={w} y2={originY} stroke={axisColor} strokeWidth={1.5} />
          <line x1={originX} y1={0} x2={originX} y2={h} stroke={axisColor} strokeWidth={1.5} />

          {/* Axis arrows */}
          <polygon points={`${w},${originY} ${w - 8},${originY - 4} ${w - 8},${originY + 4}`} fill={axisColor} />
          <polygon points={`${originX},0 ${originX - 4},8 ${originX + 4},8`} fill={axisColor} />

          {/* Axis labels */}
          <text x={w - 4} y={originY - 8} fontSize="12" fill={axisColor} textAnchor="end">x</text>
          <text x={originX + 8} y={12} fontSize="12" fill={axisColor}>y</text>

          {/* Tick marks */}
          {ticks}

          {/* Function curve with draw animation */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: pathLength,
              strokeDashoffset: pathLength,
              animation: `drawPath 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards`
            }}
          />

          <style>{`
            @keyframes drawPath {
              to { stroke-dashoffset: 0; }
            }
          `}</style>
        </svg>
      </HTMLContainer>
    );
  }
}
