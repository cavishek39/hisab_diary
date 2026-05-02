import React, { useState } from 'react';
import { Account, AccountType } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Wallet, MoreVertical, Trash2, Edit2, Landmark, CreditCard, PiggyBank, TrendingUp as TrendingUpIcon } from 'lucide-react';
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

interface AccountsProps {
  accounts: Account[];
  userId: string;
}

export default function Accounts({ accounts, userId }: AccountsProps) {
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
        <h2 className="text-4xl font-black italic font-serif tracking-tight mb-2">Connected Vaults</h2>
        <p className="label-caps opacity-40">Financial Entity Management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {accounts.map(acc => (
          <div key={acc.id} className="brutalist-card p-10 relative group overflow-hidden hover:bg-white/[0.03]">
            <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => deleteAccount(acc.id)}
                className="text-white/20 hover:text-red-500 p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="flex flex-col h-full">
              <div className="mb-8">
                <span className="label-caps opacity-30 block mb-2">{acc.type}</span>
                <h3 className="font-black text-2xl tracking-tighter uppercase">{acc.name}</h3>
              </div>

              <div className="mt-auto">
                <p className="label-caps text-brand-emerald mb-1">Balance</p>
                <h4 className="text-4xl font-black tracking-tighter">{formatCurrency(acc.balance)}</h4>
              </div>

              {/* Decorative background letter */}
              <div className="absolute -bottom-6 -right-4 text-[100px] font-black opacity-[0.03] select-none pointer-events-none uppercase">
                {acc.name[0]}
              </div>
            </div>
          </div>
        ))}

        <button 
          onClick={() => setIsModalOpen(true)}
          className="border-4 border-dashed border-white/5 p-10 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-white/20 hover:border-brand-emerald hover:text-white transition-all group min-h-[250px]"
        >
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-brand-emerald group-hover:text-black transition-colors">
            <Plus size={32} />
          </div>
          <span className="font-black uppercase tracking-widest text-[10px]">Initialize New Vault</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-900 border border-white/10 rounded-[2.5rem] p-12 w-full max-w-lg shadow-2xl"
          >
            <h3 className="text-4xl font-black italic font-serif tracking-tight mb-8">New Vault</h3>
            <form onSubmit={handleAddAccount} className="space-y-8">
              <div>
                <label className="label-caps opacity-40 block mb-3">Vault Designation</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:border-brand-emerald outline-none font-black text-xl uppercase tracking-tighter"
                  placeholder="Designation Name"
                />
              </div>
              <div>
                <label className="label-caps opacity-40 block mb-3">Entity Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {ACCOUNT_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t as AccountType)}
                      className={cn(
                        "p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                        type === t 
                          ? "bg-white border-white text-black" 
                          : "bg-transparent border-white/10 text-white/40 hover:border-white/30"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-caps opacity-40 block mb-3">Initial Liquidity</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 focus:border-brand-emerald outline-none font-black text-xl tracking-tighter"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 label-caps opacity-40 hover:opacity-100 transition-opacity"
                >
                  Abort
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-4 bg-brand-emerald text-black font-black uppercase tracking-widest text-xs rounded-full shadow-lg active:scale-95"
                >
                  Establish Vault
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
