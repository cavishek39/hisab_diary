import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function main() {
  try {
    const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'add 500 to cash',
      config: {
        tools: [{ functionDeclarations: [{ name: 'addTransaction', description: 'desc' }] }]
      }
    });
    console.log(JSON.stringify(res.functionCalls, null, 2));
  } catch(e) {
    console.error(e);
  }
}
main();
