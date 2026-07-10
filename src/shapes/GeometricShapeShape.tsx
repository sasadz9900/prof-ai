import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw';

export class GeometricShapeShapeUtil extends ShapeUtil<any> {
  static override type = 'geometric-shape' as const;

  override getDefaultProps(): any {
    return {
      w: 400,
      h: 400,
      shapeType: 'polygon',
      vertices: [[0, 0], [4, 0], [2, 3]],
      labels: ['A', 'B', 'C'],
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
    const { vertices, labels, color, w, h } = shape.props;
    
    // Scale points to fit
    const scale = 40;
    const originX = w / 2;
    const originY = h / 2;

    const scaledVertices = vertices.map(([x, y]) => [originX + x * scale, originY - y * scale]);

    const pathData = scaledVertices.map(([x, y], i) => {
      return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
    }).join(' ') + ' Z'; // Close path

    return (
      <HTMLContainer>
        <svg width={w} height={h} style={{ overflow: 'visible' }}>
          <path 
            d={pathData} 
            fill="none" 
            stroke={color} 
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: '4000',
              strokeDashoffset: '4000',
              animation: 'drawGeoPath 2s ease-in-out forwards'
            }}
          />
          {scaledVertices.map(([x, y], i) => (
            <text 
              key={i} 
              x={x + 10} 
              y={y - 10} 
              fill={color} 
              fontSize={20}
              fontWeight="bold"
              style={{
                opacity: 0,
                animation: 'fadeIn 0.5s ease-in forwards 1.5s'
              }}
            >
              {labels[i] || ''}
            </text>
          ))}
          <style>{`
            @keyframes drawGeoPath {
              to {
                stroke-dashoffset: 0;
              }
            }
            @keyframes fadeIn {
              to {
                opacity: 1;
              }
            }
          `}</style>
        </svg>
      </HTMLContainer>
    );
  }
}
