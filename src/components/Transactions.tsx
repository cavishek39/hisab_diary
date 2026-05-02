import { Transaction, Account } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { Search, Filter, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import { deleteDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import AddTransaction from './AddTransaction';

interface TransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  userId: string;
  currency?: string;
  isMasked: boolean;
}

export default function Transactions({ transactions, accounts, userId, currency = 'INR', isMasked }: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Expense' | 'Income' | 'Transfer'>('All');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
        balance: increment(impact),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${t.id}`);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-[#F5F5F5]">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2">Logs</h2>
          <p className="text-white/40 text-sm font-medium uppercase tracking-widest">History of your financial activities</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              type="text" 
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:border-brand-emerald outline-none font-bold"
            />
          </div>
          <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl">
            {['All', 'Expense', 'Income'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t as any)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  filterType === t ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-8 py-6 text-[10px] uppercase font-black tracking-[0.2em] opacity-30">Transaction Details</th>
                <th className="px-8 py-6 text-[10px] uppercase font-black tracking-[0.2em] opacity-30">Category</th>
                <th className="px-8 py-6 text-[10px] uppercase font-black tracking-[0.2em] opacity-30 text-right">Value</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.map(t => {
                const account = accounts.find(a => a.id === t.accountId);
                return (
                  <tr key={t.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs",
                          t.type === 'Income' ? "bg-brand-emerald/10 text-brand-emerald" : "bg-white/5 text-white/40"
                        )}>
                          {t.type === 'Income' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-lg tracking-tight leading-tight">{t.description || t.category}</p>
                          <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest mt-1">
                            {format(new Date(t.date), 'MMM dd, yyyy')} • {account?.name || 'Local'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-white/40 border border-white/5">
                        {t.category}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className={cn(
                        "font-black text-xl tracking-tight leading-none",
                        t.type === 'Income' ? "text-brand-emerald" : "text-white"
                      )}>
                        {t.type === 'Income' ? '+' : t.type === 'Expense' ? '-' : ''}
                        {isMasked ? '••••••' : formatCurrency(t.amount, currency)}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setEditingTransaction(t)}
                          className="p-3 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all active:scale-95"
                          title="Edit Transaction"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t)}
                          className="p-3 hover:bg-red-500/10 rounded-xl text-red-500 transition-all active:scale-95"
                          title="Delete Transaction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="py-24 text-center opacity-10">
              <p className="font-black uppercase tracking-widest text-[10px]">No records found</p>
            </div>
          )}
        </div>
      </div>

      {editingTransaction && (
        <AddTransaction 
          isOpen={true} 
          onClose={() => setEditingTransaction(null)} 
          accounts={accounts} 
          userId={userId} 
          transactionToEdit={editingTransaction}
        />
      )}
    </div>
  );
}
