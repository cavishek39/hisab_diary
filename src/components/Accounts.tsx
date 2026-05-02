import React, { useState } from 'react';
import { Account, AccountType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Wallet, Trash2, Landmark, CreditCard, PiggyBank, TrendingUp } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ACCOUNT_TYPES } from '../constants';
import { motion } from 'motion/react';

const ACCOUNT_TYPE_ICONS: Record<string, React.ReactNode> = {
  'Bank': <Landmark size={20} />,
  'Cash': <Wallet size={20} />,
  'Credit': <CreditCard size={20} />,
  'Investment': <TrendingUp size={20} />,
};

interface AccountsProps {
  accounts: Account[];
  userId: string;
  currency?: string;
  isMasked: boolean;
}

export default function Accounts({ accounts, userId, currency = 'USD', isMasked }: AccountsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Bank');
  const [balance, setBalance] = useState('');

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !balance) return;

    try {
      await addDoc(collection(db, 'accounts'), {
        userId,
        name,
        type,
        balance: parseFloat(balance),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setName('');
      setBalance('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'accounts');
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? all related transactions will remain but balance won\'t be tracked.')) return;
    try {
      await deleteDoc(doc(db, 'accounts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accounts/${id}`);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-4xl font-black tracking-tight mb-2">My Accounts</h2>
        <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Manage your banks, cash and wallets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <motion.div 
            key={acc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group brutalist-card p-8 flex flex-col min-h-[220px] bg-white/[0.03] hover:bg-white/[0.05] transition-all border border-white/5 hover:border-brand-emerald/30 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-emerald/10 flex items-center justify-center text-brand-emerald">
                  {ACCOUNT_TYPE_ICONS[acc.type] || <Wallet size={20} />}
                </div>
                <div>
                  <h3 className="font-black text-xl tracking-tight leading-tight">{acc.name}</h3>
                  <p className="text-[10px] opacity-40 font-black uppercase tracking-widest">{acc.type}</p>
                </div>
              </div>
              <button 
                onClick={() => deleteAccount(acc.id)}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-full text-red-500 transition-all active:scale-90"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-auto relative z-10">
              <p className="text-[10px] uppercase font-black opacity-30 tracking-[0.2em] mb-1">Available Balance</p>
              <h4 className="text-4xl font-black tracking-tighter">
                {isMasked ? '••••••' : formatCurrency(acc.balance, currency)}
              </h4>
            </div>

            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-brand-emerald/5 blur-[50px] pointer-events-none" />
          </motion.div>
        ))}

        <button 
          onClick={() => setIsModalOpen(true)}
          className="border-2 border-dashed border-white/10 p-10 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-white/20 hover:border-brand-emerald hover:text-white transition-all group min-h-[220px]"
        >
          <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-brand-emerald group-hover:text-black transition-colors">
            <Plus size={28} />
          </div>
          <span className="font-black uppercase tracking-widest text-[10px]">Add New Account</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 md:p-12 w-full max-w-lg shadow-2xl"
          >
            <h3 className="text-3xl font-black tracking-tight mb-8">Setup Account</h3>
            <form onSubmit={handleAddAccount} className="space-y-6">
              <div>
                <label className="text-[10px] uppercase font-black opacity-40 mb-2 block tracking-widest">Account Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:border-brand-emerald outline-none font-bold text-xl"
                  placeholder="e.g. HDFC Bank, My Wallet"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black opacity-40 mb-2 block tracking-widest">Account Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t as AccountType)}
                      className={cn(
                        "p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        type === t 
                          ? "bg-white border-white text-black" 
                          : "bg-transparent border-white/10 text-white/40 hover:border-white/30"
                      )}
                    >
                      {ACCOUNT_TYPE_ICONS[t]}
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-black opacity-40 mb-2 block tracking-widest">Initial Balance</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:border-brand-emerald outline-none font-bold text-xl"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 text-[10px] uppercase font-black opacity-40 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-brand-emerald text-black font-black uppercase tracking-widest text-[10px] rounded-full shadow-lg active:scale-95"
                >
                  Create Account
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
