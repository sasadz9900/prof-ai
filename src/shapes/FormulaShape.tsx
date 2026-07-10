import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export class FormulaShapeUtil extends ShapeUtil<any> {
  static override type = 'formula' as const;

  override getDefaultProps(): any {
    return {
      w: 400,
      h: 100,
      latex: 'x^2 + y^2 = r^2',
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
    const { latex, color, w, h } = shape.props;
    let htmlString = '';
    try {
      htmlString = katex.renderToString(latex, { throwOnError: false, displayMode: true });
    } catch (e) {
      htmlString = 'Invalid LaTeX';
    }

    const getColor = (c?: string) => {
      switch (c) {
        case 'blue': return '#2563eb';
        case 'green': return '#16a34a';
        case 'red': return '#dc2626';
        case 'purple': return '#9333ea';
        default: return '#1e293b';
      }
    };

    return (
      <HTMLContainer>
        <div
          className="formula-enter"
          style={{
            width: w,
            height: h,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: getColor(color),
            fontSize: '1.5rem',
            padding: '20px',
            backgroundColor: 'rgba(248, 250, 252, 0.85)',
            borderRadius: '12px',
            border: `2px solid ${getColor(color)}22`,
            backdropFilter: 'blur(4px)',
            boxShadow: `0 4px 24px ${getColor(color)}18`,
          }}
          dangerouslySetInnerHTML={{ __html: htmlString }}
        />
      </HTMLContainer>
    );
  }
}
