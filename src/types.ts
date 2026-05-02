export type AccountType = 'Bank' | 'Investment' | 'Cash' | 'Credit';
export type TransactionType = 'Expense' | 'Income' | 'Transfer';

export interface UserProfile {
  userId: string;
  email: string;
  currency: string;
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
  isAutomated: boolean;
  originalSms?: string;
  targetAccountId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedTransaction {
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date?: string;
}
