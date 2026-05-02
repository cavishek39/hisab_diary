import React, { useState, useEffect } from 'react';
import { Account, TransactionType, Transaction } from '../types';
import { cn } from '../lib/utils';
import { X, MessageSquare, Plus, Loader2, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  increment,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { DEFAULT_CATEGORIES, TRANSACTION_TYPES } from '../constants';
import { parseSmsTransaction } from '../services/geminiService';

interface AddTransactionProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  userId: string;
  transactionToEdit?: Transaction;
}

export default function AddTransaction({ isOpen, onClose, accounts, userId, transactionToEdit }: AddTransactionProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'sms'>('manual');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('Expense');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [smsText, setSmsText] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (transactionToEdit) {
      setAmount(transactionToEdit.amount.toString());
      setType(transactionToEdit.type);
      setAccountId(transactionToEdit.accountId);
      setCategory(transactionToEdit.category);
      setDescription(transactionToEdit.description || '');
      setDate(new Date(transactionToEdit.date).toISOString().split('T')[0]);
      setActiveTab('manual');
    } else {
      resetForm();
    }
  }, [transactionToEdit, isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!amount || !accountId || !userId) return;

    try {
      const transactionData = {
        userId,
        accountId,
        amount: parseFloat(amount),
        type,
        category,
        description,
        date: new Date(date).toISOString(),
        isAutomated: transactionToEdit ? (transactionToEdit.isAutomated || false) : (activeTab === 'sms'),
        updatedAt: serverTimestamp()
      };

      if (transactionToEdit) {
        // Edit Mode
        await updateDoc(doc(db, 'transactions', transactionToEdit.id), transactionData);

        // Adjust balance
        const oldImpact = transactionToEdit.type === 'Income' ? transactionToEdit.amount : -transactionToEdit.amount;
        const newImpact = type === 'Income' ? parseFloat(amount) : -parseFloat(amount);

        if (transactionToEdit.accountId === accountId) {
          // Same account, adjust by difference
          const balanceDiff = newImpact - oldImpact;
          if (balanceDiff !== 0) {
            await updateDoc(doc(db, 'accounts', accountId), {
              balance: increment(balanceDiff),
              updatedAt: serverTimestamp()
            });
          }
        } else {
          // Changed accounts: reverse old impact and apply new impact
          await updateDoc(doc(db, 'accounts', transactionToEdit.accountId), {
            balance: increment(-oldImpact),
            updatedAt: serverTimestamp()
          });
          await updateDoc(doc(db, 'accounts', accountId), {
            balance: increment(newImpact),
            updatedAt: serverTimestamp()
          });
        }
      } else {
        // Create Mode
        await addDoc(collection(db, 'transactions'), {
          ...transactionData,
          createdAt: serverTimestamp(),
          originalSms: activeTab === 'sms' ? smsText : null,
        });

        const accountRef = doc(db, 'accounts', accountId);
        const impact = type === 'Income' ? parseFloat(amount) : -parseFloat(amount);
        await updateDoc(accountRef, {
          balance: increment(impact),
          updatedAt: serverTimestamp()
        });
      }

      onClose();
      resetForm();
    } catch (error) {
      handleFirestoreError(error, transactionToEdit ? OperationType.UPDATE : OperationType.WRITE, transactionToEdit ? `transactions/${transactionToEdit.id}` : 'transactions');
    }
  };

  const handleSmsParse = async () => {
    if (!smsText.trim()) return;
    setIsParsing(true);
    try {
      const parsed = await parseSmsTransaction(smsText);
      if (parsed) {
        setAmount(parsed.amount.toString());
        setType(parsed.type);
        setCategory(parsed.category);
        setDescription(parsed.description);
        if (parsed.date) setDate(new Date(parsed.date).toISOString().split('T')[0]);
        setActiveTab('manual');
      }
    } catch (error) {
      console.error("SMS parsing failed:", error);
    } finally {
      setIsParsing(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setType('Expense');
    setCategory(DEFAULT_CATEGORIES[0]);
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setSmsText('');
    setAccountId(accounts[0]?.id || '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-8 border-b border-white/5">
          <h3 className="text-3xl font-black italic font-serif tracking-tight">
            {transactionToEdit ? 'Edit Transaction' : 'Ledger Entry'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {!transactionToEdit && (
          <div className="flex p-1.5 bg-white/5 m-8 rounded-full">
            <button
              onClick={() => setActiveTab('manual')}
              className={cn(
                "flex-1 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'manual' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              Manual
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={cn(
                "flex-1 py-2 px-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === 'sms' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              Smart SMS
            </button>
          </div>
        )}

        <div className={cn("px-8 pb-10", transactionToEdit && "pt-10")}>
          <AnimatePresence mode="wait">
            {activeTab === 'manual' || transactionToEdit ? (
              <motion.form
                key="manual-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="label-caps opacity-40 block mb-3">Amount</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-2xl text-white/20">₹</span>
                      <input 
                        type="number"
                        step="0.01"
                        autoFocus
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full pl-10 pr-6 py-5 bg-white/5 border border-white/10 rounded-2xl text-4xl font-black tracking-tighter outline-none focus:border-brand-emerald"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label-caps opacity-40 block mb-3">Type</label>
                    <select 
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest outline-none focus:border-brand-emerald appearance-none text-white"
                    >
                      {TRANSACTION_TYPES.map(t => <option key={t} value={t} className="bg-zinc-900">{t}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="label-caps opacity-40 block mb-3">Vault</label>
                    <select 
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest outline-none focus:border-brand-emerald appearance-none text-white"
                      required
                    >
                      <option value="" disabled className="bg-zinc-900">Select Vault</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id} className="bg-zinc-900">{acc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="label-caps opacity-40 block mb-3">Designation / Category</label>
                    <input 
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Narrative Description"
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest outline-none focus:border-brand-emerald text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="label-caps opacity-40 block mb-3">Date</label>
                    <input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl font-black text-xs uppercase tracking-widest outline-none focus:border-brand-emerald text-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-4 label-caps opacity-40 hover:opacity-100"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-brand-emerald text-black font-black uppercase tracking-widest text-xs rounded-full shadow-lg active:scale-95"
                  >
                    {transactionToEdit ? 'Save Changes' : 'Commit Entry'}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="sms-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                <div className="bg-emerald-500/10 p-6 rounded-2xl text-brand-emerald text-xs font-bold leading-relaxed border border-brand-emerald/20 flex gap-4">
                  <Wand2 className="shrink-0" size={20} />
                  <p>Input raw transmission data (SMS). Neural parsing will extract velocity, type, and designation automatically.</p>
                </div>

                <div>
                  <textarea 
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    placeholder="Paste bank notification here..."
                    className="w-full h-48 p-6 bg-white/5 border border-white/10 rounded-[1.5rem] font-bold text-sm outline-none focus:border-brand-emerald resize-none text-white"
                  />
                </div>

                <button 
                  onClick={handleSmsParse}
                  disabled={isParsing || !smsText.trim()}
                  className="w-full py-5 bg-white disabled:bg-white/10 disabled:text-white/20 text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-full shadow-xl active:scale-95 flex items-center justify-center gap-3"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Neural Parsing...
                    </>
                  ) : (
                    <>
                      <Wand2 size={18} />
                      Execute Smart Parse
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
