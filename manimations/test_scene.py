from manim import *

class GenScene(Scene):
    def construct(self):
        circle = Circle()
        self.play(Create(circle))
