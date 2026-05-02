import React from 'react';
import { Account, Transaction } from '../types';
import { formatCurrency } from '../lib/utils';
import { TrendingUp, TrendingDown, Wallet, CreditCard, PieChart as PieChartIcon, ArrowLeftRight } from 'lucide-react';
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
}

export default function Dashboard({ accounts, transactions, onViewAllTransactions }: DashboardProps) {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalBalanceStr = totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [whole, decimal] = totalBalanceStr.split('.');

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
    <div className="space-y-20">
      {/* Hero Metric: Net Worth */}
      <div>
        <p className="label-caps text-brand-emerald mb-4">Aggregate Net Worth</p>
        <h1 className="text-hero">
          ${whole}.<span className="opacity-30 tracking-tight">{decimal}</span>
        </h1>
        <div className="flex flex-wrap gap-8 mt-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black">+4.2%</span>
            <span className="text-xs uppercase tracking-widest opacity-40 italic font-serif text-brand-emerald">Positive Velocity</span>
          </div>
          <div className="w-[1px] h-4 bg-white/20 self-center hidden sm:block"></div>
          <div className="flex gap-4">
            <StatSmall label="Income" amount={income} color="text-brand-emerald" />
            <StatSmall label="Expense" amount={expenses} color="text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-10">
        {/* Activity Stream */}
        <div className="col-span-12 lg:col-span-7 brutalist-card p-10 flex flex-col">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-4xl font-black italic font-serif tracking-tight">Live Stream</h2>
            <button 
              onClick={onViewAllTransactions}
              className="text-[10px] uppercase tracking-widest font-black bg-white text-black px-4 py-1.5 hover:bg-brand-emerald transition-colors"
            >
              Full Ledger
            </button>
          </div>
          
          <div className="space-y-0">
            {recentTransactions.length > 0 ? (
              recentTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between py-6 border-b border-white/5 last:border-0 hover:bg-white/[0.02] -mx-4 px-4 transition-colors">
                  <div>
                    <p className="font-black text-xl tracking-tight leading-tight">{t.description || t.category}</p>
                    <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest mt-1">
                      {t.isAutomated ? 'Parsed via Smart AI' : 'Manual Entry'} • {format(new Date(t.date), 'hh:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-black text-2xl tracking-tighter",
                      t.type === 'Income' ? "text-brand-emerald" : "text-white"
                    )}>
                      {t.type === 'Income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <p className="text-[10px] opacity-40 font-bold uppercase tracking-[0.2em]">{t.category}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center opacity-20">
                <ArrowLeftRight size={48} className="mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-xs">No Recent Activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Assets & Allocation */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-10">
          <div className="h-64 bg-brand-emerald text-black rounded-[2rem] p-10 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-[10px] uppercase tracking-[0.2em] font-black mb-2 opacity-60">Liquid Capital</h3>
              <p className="text-6xl font-black tracking-tighter leading-none">${(totalBalance/1000).toFixed(1)}k</p>
              <div className="mt-8">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Active Accounts</p>
                <div className="flex gap-2 mt-2">
                  {accounts.slice(0, 3).map(a => (
                    <div key={a.id} className="w-8 h-8 rounded-full border-2 border-black/10 bg-black/5 flex items-center justify-center text-[10px] font-black">
                      {a.name[0]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-8 -right-8 text-[180px] font-black opacity-10 leading-none select-none group-hover:scale-110 transition-transform">
              $
            </div>
          </div>

          <div className="flex-1 brutalist-card p-10">
            <h3 className="label-caps opacity-40 mb-10">Revenue Cycle</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[2, 2, 0, 0]} barSize={12} />
                  <Bar dataKey="expense" fill="#f87171" radius={[2, 2, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatSmall({ label, amount, color }: { label: string, amount: number, color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase font-black opacity-30 tracking-[0.2em] mb-1">{label}</span>
      <span className={cn("text-lg font-black tracking-tight", color)}>{formatCurrency(amount)}</span>
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
