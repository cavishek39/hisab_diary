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

export default function Accounts({ accounts, userId, currency = 'INR', isMasked }: AccountsProps) {
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
        <p className="opacity-40 text-sm font-medium uppercase tracking-widest">Manage your banks, cash and wallets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <motion.div 
            key={acc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative brutalist-card p-8 flex flex-col min-h-[240px] transition-all overflow-hidden"
          >
            {/* Subtle Grid Pattern Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className="flex justify-between items-start mb-auto relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/20 flex items-center justify-center text-brand-emerald shadow-inner">
                  {ACCOUNT_TYPE_ICONS[acc.type] || <Wallet size={20} />}
                </div>
                <div>
                  <h3 className="font-sans font-black text-2xl tracking-tight leading-tight">{acc.name}</h3>
                  <p className="text-[9px] opacity-40 font-mono uppercase tracking-[0.2em] font-medium mt-1">{acc.type} ACCOUNT</p>
                </div>
              </div>
              <button 
                onClick={() => deleteAccount(acc.id)}
                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-full text-red-500 transition-all active:scale-90"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-12 relative z-10 pt-6 border-t border-card-border">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-serif italic opacity-40 mb-2">Available Liquidity</p>
                  <h4 className="text-4xl font-mono font-medium tracking-tighter">
                    {isMasked ? '••••••' : formatCurrency(acc.balance, currency)}
                  </h4>
                </div>
                <div className="text-[8px] font-mono text-brand-emerald/40 uppercase tracking-widest hidden group-hover:block transition-all">
                  Synchronized
                </div>
              </div>
            </div>

            {/* Glowing Accent */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-emerald/10 blur-[60px] pointer-events-none group-hover:bg-brand-emerald/15 transition-all" />
          </motion.div>
        ))}

        <button 
          onClick={() => setIsModalOpen(true)}
          className="border-2 border-dashed border-card-border p-10 rounded-[2.5rem] flex flex-col items-center justify-center gap-5 opacity-40 hover:opacity-100 hover:border-brand-emerald hover:bg-brand-emerald/5 transition-all group min-h-[240px]"
        >
          <div className="w-16 h-16 border border-card-border rounded-full flex items-center justify-center group-hover:bg-brand-emerald group-hover:border-brand-emerald group-hover:text-black transition-all">
            <Plus size={32} />
          </div>
          <p className="font-mono uppercase tracking-[0.3em] text-[10px]">Initialize New Stream</p>
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card-bg border border-card-border rounded-[2.5rem] p-8 md:p-12 w-full max-w-lg shadow-2xl"
          >
            <h3 className="text-3xl font-black tracking-tight mb-8">Setup Account</h3>
            <form onSubmit={handleAddAccount} className="space-y-6">
              <div>
                <label className="text-[10px] uppercase font-black opacity-40 mb-2 block tracking-widest">Account Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-text-main/5 rounded-2xl border border-card-border focus:border-brand-emerald outline-none font-bold text-xl"
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
                          ? "bg-text-main text-bg-main border-text-main shadow-lg" 
                          : "bg-transparent border-card-border opacity-60 hover:opacity-100 hover:border-brand-emerald"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 flex items-center justify-center",
                        type === t ? "text-bg-main" : "text-brand-emerald"
                      )}>
                        {ACCOUNT_TYPE_ICONS[t]}
                      </div>
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
                  className="w-full p-4 bg-text-main/5 rounded-2xl border border-card-border focus:border-brand-emerald outline-none font-bold text-xl text-text-main"
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
