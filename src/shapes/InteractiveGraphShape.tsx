import React, { useMemo } from 'react';
import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw';
import { compile } from 'mathjs';
import { Mafs, Coordinates, Plot, Theme } from 'mafs';
import "mafs/core.css";
import "mafs/font.css";

export class InteractiveGraphShapeUtil extends ShapeUtil<any> {
  static override type = 'interactive-graph' as const;

  override getDefaultProps(): any {
    return {
      w: 400,
      h: 400,
      expression: 'x^2',
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
    const { expression, color, w, h } = shape.props;

    const compiledFunc = useMemo(() => {
      try {
        return compile(expression);
      } catch (e) {
        return null;
      }
    }, [expression]);

    const f = (x: number) => {
      if (!compiledFunc) return 0;
      try {
        const y = compiledFunc.evaluate({ x });
        return typeof y === 'number' && isFinite(y) ? y : NaN;
      } catch {
        return NaN;
      }
    };

    let mafsColor = Theme.blue;
    if (color === 'red') mafsColor = Theme.red;
    if (color === 'green') mafsColor = Theme.green;
    if (color === 'purple') mafsColor = Theme.indigo;

    return (
      <HTMLContainer>
        <div
          style={{
            width: w,
            height: h,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          <div
            style={{
              height: '32px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              fontWeight: 600,
              fontSize: '14px',
              color: '#475569',
              fontFamily: 'monospace'
            }}
          >
            f(x) = {expression}
          </div>
          <div
            style={{ flex: 1, position: 'relative', pointerEvents: 'auto' }}
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <Mafs viewBox={{ x: [-5, 5], y: [-5, 5] }} preserveAspectRatio="contain" pan={true} zoom={true}>
              <Coordinates.Cartesian />
              {compiledFunc && <Plot.OfX y={f} color={mafsColor} />}
            </Mafs>
          </div>
        </div>
      </HTMLContainer>
    );
  }
}
