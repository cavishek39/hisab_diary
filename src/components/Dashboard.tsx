import React, { useState } from 'react';
import { Account, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, TrendingDown, Wallet, CreditCard, PieChart as PieChartIcon, ArrowLeftRight, Eye, EyeOff } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  onViewAllTransactions: () => void;
  currency?: string;
  isMasked: boolean;
  setIsMasked: (val: boolean) => void;
}

export default function Dashboard({ 
  accounts, 
  transactions, 
  onViewAllTransactions, 
  currency = 'USD',
  isMasked,
  setIsMasked
}: DashboardProps) {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalBalanceStr = totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [whole, decimal] = totalBalanceStr.split('.');

  const symbol = (0).toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, '').trim();

  const monthlyTransactions = transactions.filter(t => {
    const date = new Date(t.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const income = monthlyTransactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = monthlyTransactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);

  const recentTransactions = transactions.slice(0, 5);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  const chartData = last7Days.map(date => {
    const dayTransactions = transactions.filter(t => isSameDay(new Date(t.date), date));
    const dayIncome = dayTransactions.filter(t => t.type === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const dayExpense = dayTransactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
    return {
      name: format(date, 'MMM dd'),
      income: dayIncome,
      expense: dayExpense
    };
  });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="bg-white/[0.03] border border-white/5 p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-emerald">Aggregate Net Worth ({currency})</p>
            <button 
              onClick={() => setIsMasked(!isMasked)}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/30 hover:text-white"
              title={isMasked ? "Show balances" : "Hide balances"}
            >
              {isMasked ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8">
            {symbol}{isMasked ? '••••••' : whole}.<span className="opacity-20">{isMasked ? '••' : decimal}</span>
          </h1>
          
          <div className="flex flex-wrap gap-6 md:gap-12">
            <StatSmall label="Monthly Income" amount={income} color="text-brand-emerald" currency={currency} isMasked={isMasked} />
            <StatSmall label="Monthly Expense" amount={expenses} color="text-red-500" currency={currency} isMasked={isMasked} />
          </div>
        </div>
        {/* Subtle accent blur */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-emerald/5 blur-[100px] pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
        {/* Recent Activity */}
        <div className="md:col-span-2 lg:col-span-8 bg-white/[0.02] border border-white/5 rounded-[2rem] p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black tracking-tight">Recent Activity</h2>
            <button 
              onClick={onViewAllTransactions}
              className="text-[10px] uppercase tracking-widest font-black opacity-40 hover:opacity-100 transition-opacity"
            >
              View Full Ledger →
            </button>
          </div>
          
          <div className="space-y-2">
            {recentTransactions.length > 0 ? (
              recentTransactions.map(t => (
                <div key={t.id} className="group flex items-center justify-between p-4 rounded-3xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs",
                      t.type === 'Income' ? "bg-brand-emerald/10 text-brand-emerald" : "bg-white/5 text-white/40"
                    )}>
                      {t.category[0]}
                    </div>
                    <div>
                      <p className="font-bold text-base tracking-tight">{t.description || t.category}</p>
                      <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest mt-0.5">
                        {format(new Date(t.date), 'MMM dd')} • {t.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-black text-lg tracking-tight",
                      t.type === 'Income' ? "text-brand-emerald" : "text-white"
                    )}>
                      {t.type === 'Income' ? '+' : '-'}{isMasked ? '••••' : formatCurrency(t.amount, currency)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center opacity-10">
                <ArrowLeftRight size={48} className="mx-auto mb-4" />
                <p className="font-bold uppercase tracking-widest text-[10px]">No activity logged</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts & Breakdown */}
        <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 flex-1">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-30 mb-8">Spending Flow</h3>
            <div className="h-48 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase font-black opacity-30 mb-1">Top Expense Type</p>
                <p className="font-black text-xl tracking-tight">Food & Drink</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-brand-emerald/10 flex items-center justify-center">
                <TrendingDown size={14} className="text-red-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatSmall({ label, amount, color, currency, isMasked }: { label: string, amount: number, color: string, currency: string, isMasked?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase font-black opacity-30 tracking-[0.2em] mb-1">{label}</span>
      <span className={cn("text-lg font-black tracking-tight", color)}>
        {isMasked ? '••••••' : formatCurrency(amount, currency)}
      </span>
    </div>
  );
}

function StatCard({ title, amount, icon, trend, trendColor = "text-gray-400" }: { 
  title: string, 
  amount: number, 
  icon: React.ReactNode, 
  trend: string,
  trendColor?: string 
}) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight">{formatCurrency(amount)}</h3>
        <p className={cn("text-xs font-semibold mt-2", trendColor)}>
          {trend}
        </p>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
