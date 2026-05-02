import { GoogleGenAI, Type } from "@google/genai";
import { ParsedTransaction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function parseSmsTransaction(smsText: string): Promise<ParsedTransaction | null> {
  const model = "gemini-3-flash-preview";
  
  try {
    const result = await ai.models.generateContent({
      model,
      contents: `Extract financial transaction details from this SMS message: "${smsText}". 
      Identify the amount, transaction type (Expense, Income, or Transfer), a likely category (e.g., Food, Shopping, Salary, Bills), and a short description.
      If it's a debit or payment, it's an Expense. If it's a credit or refund, it's an Income.
      If it mentions moving money between accounts, it's a Transfer.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            type: { 
              type: Type.STRING, 
              enum: ["Expense", "Income", "Transfer"] 
            },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            date: { type: Type.STRING, description: "ISO 8601 date string if found" }
          },
          required: ["amount", "type", "category", "description"]
        }
      }
    });

    const text = result.text;
    if (!text) return null;
    
    return JSON.parse(text) as ParsedTransaction;
  } catch (error) {
    console.error("Error parsing SMS with Gemini:", error);
    return null;
  }
}
