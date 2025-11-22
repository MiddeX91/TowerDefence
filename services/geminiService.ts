import { GoogleGenAI, Type } from "@google/genai";
import { TerrainType } from "../types";
import { GRID_W, GRID_H } from "../constants";

const getApiKey = () => process.env.API_KEY || "";

export const generateGameScenario = async (theme: string): Promise<{type:TerrainType, variant:number}[][] | undefined> => {
  const apiKey = getApiKey();
  if (!apiKey) return undefined;

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a 2D grid map for a Tower Defense game based on the theme: "${theme}".
      The grid size is ${GRID_W}x${GRID_H}.
      Return a JSON object containing a 'grid' property which is a 2D array of integers.
      
      Integer mappings:
      0 = Grass (Buildable)
      1 = Wall (Obstacle)
      2 = Swamp (Slows enemies)
      5 = Tree (Obstacle, decorative)
      6 = Water (Obstacle)
      
      Ensure there is a clear path from the top edge to the bottom edge.
      Do not block the path completely.
      Add some decorative clusters of trees or water appropriate for the theme.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grid: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER }
              }
            }
          },
          required: ["grid"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    if (data.grid && Array.isArray(data.grid) && data.grid.length === GRID_H) {
       return data.grid.map((row: number[]) => row.map((cell: number) => ({
         type: cell as TerrainType,
         variant: Math.floor(Math.random() * 3)
       })));
    }
    return undefined;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return undefined;
  }
};
