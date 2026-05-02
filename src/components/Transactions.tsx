import { Transaction, Account } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { deleteDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface TransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
}

export default function Transactions({ transactions, accounts }: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Expense' | 'Income' | 'Transfer'>('All');

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (t: Transaction) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', t.id));
      
      // Reverse the balance impact
      const accountRef = doc(db, 'accounts', t.accountId);
      const impact = t.type === 'Income' ? -t.amount : t.amount;
      await updateDoc(accountRef, {
        balance: increment(impact)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${t.id}`);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div>
          <h2 className="text-4xl font-black italic font-serif tracking-tight mb-2">Live Stream</h2>
          <p className="label-caps opacity-40">Financial Velocity Monitoring</p>
        </div>

        <div className="flex gap-2 p-1.5 bg-white/5 rounded-full border border-white/10">
          {['All', 'Expense', 'Income', 'Transfer'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                filterType === type 
                  ? "bg-white text-black" 
                  : "text-white/40 hover:text-white"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
        <input 
          type="text" 
          placeholder="Filter Stream by Narrative..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-16 pr-8 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] focus:border-brand-emerald outline-none font-bold text-sm tracking-tight"
        />
      </div>

      {/* List */}
      <div className="brutalist-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/[0.02] text-left border-b border-white/5">
                <th className="px-8 py-6 label-caps opacity-30">Date</th>
                <th className="px-8 py-6 label-caps opacity-30">Narrative</th>
                <th className="px-8 py-6 label-caps opacity-30">Vault</th>
                <th className="px-8 py-6 label-caps opacity-30 text-right">Velocity</th>
                <th className="px-8 py-6 label-caps opacity-30 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.map(t => {
                const account = accounts.find(a => a.id === t.accountId);
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <p className="text-sm font-black uppercase tracking-tight">{format(new Date(t.date), 'MMM dd')}</p>
                      <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest">{format(new Date(t.date), 'yyyy')}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-lg font-black tracking-tighter leading-tight uppercase">{t.category}</p>
                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1 italic">{t.description}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        {account?.name || 'External'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className={cn(
                        "text-xl font-black tracking-tighter",
                        t.type === 'Income' ? "text-brand-emerald" : "text-white"
                      )}>
                        {t.type === 'Income' ? '+' : t.type === 'Expense' ? '-' : ''}
                        {formatCurrency(t.amount)}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => handleDelete(t)}
                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-500 transition-all p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center text-white/20">
            <Search size={64} className="mb-6 opacity-[0.05]" />
            <p className="font-black uppercase tracking-[0.3em] text-xs">No Data Synchronized</p>
          </div>
        )}
      </div>
    </div>
  );
}
