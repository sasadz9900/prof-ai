import { Type, Schema } from "@google/genai";

export const styleSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    color: { type: Type.STRING, description: "blue, green, red, purple, black" },
    emphasis: { type: Type.STRING, description: "box, underline, none" },
    connects_to: { type: Type.STRING, description: "id of previous element to connect to" }
  }
};

export const boardActionToolDefinitions = [
  {
    name: "write_note",
    description: "Write text, a definition, or a note on the board.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Unique ID for this note" },
        content: { type: Type.STRING, description: "The text to write" },
        style: styleSchema
      },
      required: ["id", "content"]
    }
  },
  {
    name: "write_formula",
    description: "Write a mathematical formula using LaTeX.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "Unique ID for this formula" },
        latex: { type: Type.STRING, description: "The LaTeX string" },
        color: { type: Type.STRING, description: "blue, green, red, purple, black" },
        style: styleSchema
      },
      required: ["id", "latex"]
    }
  },
  {
    name: "plot_function",
    description: "Plot a mathematical function (e.g. x^2).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        expression: { type: Type.STRING, description: "Math expression in terms of x" },
        domain: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[min, max]" },
        color: { type: Type.STRING }
      },
      required: ["id", "expression"]
    }
  },
  {
    name: "draw_shape",
    description: "Draw a geometric shape.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        shape: { type: Type.STRING, description: "triangle, rectangle, circle" },
        vertices: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } }, description: "Array of [x, y] coordinates" },
        labels: { type: Type.ARRAY, items: { type: Type.STRING } },
        color: { type: Type.STRING }
      },
      required: ["id", "shape"]
    }
  },
  {
    name: "simulate_physics",
    description: "Run a live 2D physics simulation for mechanical concepts.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        scenario: { type: Type.STRING, description: "freefall, pendulum, collision" }
      },
      required: ["id", "scenario"]
    }
  },
  {
    name: "draw_vector",
    description: "Draw a physical vector/arrow.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        from: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[x, y]" },
        to: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: "[x, y]" },
        label: { type: Type.STRING, description: "Vector label like F or v" },
        color: { type: Type.STRING }
      },
      required: ["id", "from", "to"]
    }
  },
  {
    name: "clear_board",
    description: "Clear all shapes on the current page.",
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },
  {
    name: "new_page",
    description: "Create a new whiteboard page for a new sub-topic and switch to it.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Title for the new page, e.g. 'التعريف', 'المثال', 'التطبيق'" }
      },
      required: ["title"]
    }
  },
  {
    name: "switch_page",
    description: "Switch to an existing whiteboard page by its index (0-based).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        index: { type: Type.NUMBER, description: "0-based page index to switch to" }
      },
      required: ["index"]
    }
  },
  {
    name: "set_page_title",
    description: "Rename the current whiteboard page.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "New title for the current page" }
      },
      required: ["title"]
    }
  },
  {
    name: "delete_shape",
    description: "Delete a specific shape from the board using its ID, or clear the board if no ID is specified.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING, description: "The ID of the shape to delete" }
      },
      required: ["id"]
    }
  },

  {
    name: "insert_thumbnail",
    description: "Insert a visual thumbnail image related to a concept (e.g. 'apple' or 'gravity').",
    parameters: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        query: { type: Type.STRING, description: "A short English keyword for the image search (e.g. 'physics', 'brain')" }
      },
      required: ["id", "query"]
    }
  }
];
