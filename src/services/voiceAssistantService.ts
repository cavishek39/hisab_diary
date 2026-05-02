import { GoogleGenAI, Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export const createAccountDeclaration: FunctionDeclaration = {
  name: "createAccount",
  description: "Create a new financial account (bank, cash, investment, credit).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: "The name of the account, e.g., 'Bank Account', 'Cash Wallet'.",
      },
      type: {
        type: Type.STRING,
        enum: ["Bank", "Investment", "Cash", "Credit"],
        description: "The type of the account.",
      },
      balance: {
        type: Type.NUMBER,
        description: "The initial balance of the account.",
      },
    },
    required: ["name", "type", "balance"],
  },
};

export const addTransactionDeclaration: FunctionDeclaration = {
  name: "addTransaction",
  description: "Log a new transaction (expense or income).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: {
        type: Type.NUMBER,
        description: "The amount of the transaction.",
      },
      type: {
        type: Type.STRING,
        enum: ["Expense", "Income"],
        description: "The type of the transaction.",
      },
      category: {
        type: Type.STRING,
        description: "The category of the transaction, e.g., 'Food', 'Salary'.",
      },
      description: {
        type: Type.STRING,
        description: "A short description of the transaction.",
      },
      accountName: {
        type: Type.STRING,
        description: "The name of the account to log the transaction against.",
      },
    },
    required: ["amount", "type", "category", "accountName"],
  },
};

export async function processVoiceCommand(prompt: string, accountNames: string[]) {
  const accountsContext = accountNames.length > 0 
    ? `Available accounts: ${accountNames.join(', ')}.` 
    : "No accounts created yet.";

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `You are a specialized financial parsing agent for 'Hisab Diary'. 
Your sole task is to map user speech to financial function calls.

User Context:
${accountsContext}

STRICT PARSING RULES:
1. CURRENCY: Always extract numeric values. If the user says "Rs 20", "20 rupees", or "₹20", the amount is 20.
2. ACCOUNT MATCHING:
   - Match the user's mentioned account to the provided list.
   - If "Cash" is mentioned and a "Cash" account exists, use it.
   - If no account is mentioned and there is only ONE account available, use it.
   - If multiple accounts exist and none match, DO NOT guess a name that doesn't exist. Instead, try to find the closest match.
3. TRANSACTION TYPE:
   - "Spent", "Paid", "Bought", "Cost" -> Expense
   - "Earned", "Salary", "Received", "Found" -> Income
4. CATEGORIES: Use reasonable categories like 'Food', 'Transport', 'Utilities', 'Salary', 'Rent'. Default to 'General' if unclear.
5. NO SMALL TALK: Only return function calls. If no action is possible, return no functional calls.`,
        tools: [{ functionDeclarations: [createAccountDeclaration, addTransactionDeclaration] }],
      },
    });

    return result.functionCalls || [];
  } catch (error) {
    console.error('Gemini Voice Command Error:', error);
    throw error;
  }
}
