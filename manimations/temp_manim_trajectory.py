from manim import *

class GenScene(Scene):
    def construct(self):
        # Set up the axes
        axes = Axes(
            x_range=[0, 10, 1],
            y_range=[0, 6, 1],
            axis_config={"color": BLUE},
        )
        labels = axes.get_axis_labels(x_label="X", y_label="Y")
        self.add(axes, labels)

        # Define projectile motion parametric equations (simplified)
        # x(t) = v0_x * t
        # y(t) = v0_y * t - 0.5 * g * t^2 (g=9.8, simplified to 1 for visualization)
        
        v0_x = 2
        v0_y = 3
        g = 1.5

        def x_func(t):
            return v0_x * t

        def y_func(t):
            return v0_y * t - 0.5 * g * t**2

        # Create the trajectory
        trajectory = ParametricFunction(
            lambda t: axes.coords_to_point(x_func(t), y_func(t)),
            t_range=[0, 2 * v0_y / g, 0.01],
            color=RED
        )

        # Add some explanation text
        title = Text("مسار القذيفة").to_edge(UP)
        self.play(Write(title))
        self.play(Create(trajectory))

        # Highlight horizontal and vertical components conceptually
        # Horizontal velocity is constant (ignoring air resistance)
        # Vertical velocity changes due to gravity
        
        v_x_text = Text("السرعة الأفقية (ثابتة)", font_size=24, color=GREEN).shift(DOWN*1.5 + LEFT*2)
        v_y_text = Text("السرعة العمودية (متغيرة)", font_size=24, color=PURPLE).shift(DOWN*2.5 + LEFT*2)

        self.play(Write(v_x_text), Write(v_y_text))
        self.wait(2)