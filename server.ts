import 'dotenv/config'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import path from 'path'
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai'

async function startServer() {
  const app = express()
  const PORT = 3000

  app.use(express.json())

  // Gemini Setup
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing API key. Set VITE_GEMINI_API_KEY or GEMINI_API_KEY in .env')
  }
  const ai = new GoogleGenAI({ apiKey })

  const createAccountDeclaration: FunctionDeclaration = {
    name: 'createAccount',
    description:
      'Create a new financial account (bank, cash, investment, credit).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description:
            "The name of the account, e.g., 'Bank Account', 'Cash Wallet'.",
        },
        type: {
          type: Type.STRING,
          enum: ['Bank', 'Investment', 'Cash', 'Credit'],
          description: 'The type of the account.',
        },
        balance: {
          type: Type.NUMBER,
          description: 'The initial balance of the account.',
        },
      },
      required: ['name', 'type', 'balance'],
    },
  }

  const addTransactionDeclaration: FunctionDeclaration = {
    name: 'addTransaction',
    description: 'Log a new transaction (expense or income).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: {
          type: Type.NUMBER,
          description: 'The amount of the transaction.',
        },
        type: {
          type: Type.STRING,
          enum: ['Expense', 'Income'],
          description: 'The type of the transaction.',
        },
        category: {
          type: Type.STRING,
          description:
            "The category of the transaction, e.g., 'Food', 'Salary'.",
        },
        description: {
          type: Type.STRING,
          description: 'A short description of the transaction.',
        },
        accountName: {
          type: Type.STRING,
          description:
            'The name of the account to log the transaction against.',
        },
      },
      required: ['amount', 'type', 'category', 'accountName'],
    },
  }

  // API Routes
  app.post('/api/voice-assistant', async (req, res) => {
    try {
      const { prompt, accountNames } = req.body

      const accountsContext =
        accountNames && accountNames.length > 0
          ? `Available accounts: ${accountNames.join(', ')}.`
          : 'No accounts created yet.'

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are a specialized financial parsing agent for 'Hisab Diary'. 
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
5. NO SMALL TALK: Only return function calls. If no action is possible, return no functional calls.

User input: ${prompt}`,
              },
            ],
          },
        ],
        config: {
          temperature: 0,
          topP: 0.9,
          candidateCount: 1,
          tools: [
            {
              functionDeclarations: [
                createAccountDeclaration,
                addTransactionDeclaration,
              ],
            },
          ],
        },
      })

      const calls = result.functionCalls

      res.json({ success: true, calls: calls || [] })
    } catch (error) {
      console.error('Voice Assistant API Error:', error)
      res
        .status(500)
        .json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to process command',
        })
    }
  })

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

startServer()
