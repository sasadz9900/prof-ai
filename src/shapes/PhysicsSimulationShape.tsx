import React, { useEffect, useRef } from 'react';
import { ShapeUtil, HTMLContainer, Rectangle2d } from 'tldraw';
import Matter from 'matter-js';

export class PhysicsSimulationShapeUtil extends ShapeUtil<any> {
  static override type = 'physics-simulation' as const;

  override getDefaultProps(): any {
    return {
      w: 400,
      h: 400,
      scenario: 'freefall' // can be "freefall", "pendulum", "collision"
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
    const { w, h, scenario } = shape.props;
    const sceneRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const renderRef = useRef<Matter.Render | null>(null);

    useEffect(() => {
      if (!sceneRef.current) return;

      const Engine = Matter.Engine,
            Render = Matter.Render,
            Runner = Matter.Runner,
            Bodies = Matter.Bodies,
            Composite = Matter.Composite;

      const engine = Engine.create();
      engineRef.current = engine;

      const render = Render.create({
        element: sceneRef.current,
        engine: engine,
        options: {
          width: w,
          height: h - 32, // account for header
          wireframes: false,
          background: '#f8fafc'
        }
      });
      renderRef.current = render;

      // Create ground
      const ground = Bodies.rectangle(w / 2, h - 32, w, 60, { isStatic: true, render: { fillStyle: '#94a3b8' } });
      Composite.add(engine.world, [ground]);

      if (scenario === 'freefall') {
        const ball = Bodies.circle(w / 2, 50, 20, { restitution: 0.9, render: { fillStyle: '#ef4444' } });
        Composite.add(engine.world, [ball]);
      } else if (scenario === 'pendulum') {
        const pendulum = Bodies.circle(w / 2, 200, 20, { restitution: 0.9, render: { fillStyle: '#3b82f6' } });
        const constraint = Matter.Constraint.create({
          pointA: { x: w / 2, y: 50 },
          bodyB: pendulum,
          length: 150,
          stiffness: 0.9
        });
        Composite.add(engine.world, [pendulum, constraint]);
      } else if (scenario === 'collision') {
        const ball1 = Bodies.circle(w / 2 - 100, 150, 20, { restitution: 1, render: { fillStyle: '#ef4444' } });
        Matter.Body.setVelocity(ball1, { x: 5, y: 0 });
        const ball2 = Bodies.circle(w / 2, 150, 20, { restitution: 1, render: { fillStyle: '#3b82f6' } });
        Composite.add(engine.world, [ball1, ball2]);
        engine.world.gravity.y = 0; // zero gravity for collision demo
      }

      Render.run(render);
      const runner = Runner.create();
      Runner.run(runner, engine);

      return () => {
        Render.stop(render);
        Runner.stop(runner);
        Engine.clear(engine);
        if (render.canvas) render.canvas.remove();
      };
    }, [w, h, scenario]);

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
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            pointerEvents: 'auto'
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            style={{
              height: '32px',
              backgroundColor: '#e2e8f0',
              borderBottom: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              fontWeight: 600,
              fontSize: '14px',
              color: '#334155'
            }}
          >
            محاكاة فيزيائية: {scenario === 'freefall' ? 'سقوط حر' : scenario === 'pendulum' ? 'نواس (Pendulum)' : 'تصادم (Collision)'}
          </div>
          <div ref={sceneRef} style={{ flex: 1, overflow: 'hidden' }} />
        </div>
      </HTMLContainer>
    );
  }
}
