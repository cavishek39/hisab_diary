/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc,
  doc,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { Account, Transaction, UserProfile } from './types';
import { DEFAULT_CATEGORIES } from './constants';
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  Plus, 
  LogOut, 
  TrendingUp, 
  TrendingDown,
  ChevronRight,
  MessageSquareQuote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from './lib/utils';
import Dashboard from './components/Dashboard';
import Accounts from './components/Accounts';
import Transactions from './components/Transactions';
import AddTransaction from './components/AddTransaction';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'accounts' | 'transactions'>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Check if user profile exists, if not create default
        const userRef = doc(db, 'users', u.uid);
        try {
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            const newUser: UserProfile = {
              userId: u.uid,
              email: u.email || '',
              currency: 'USD',
              categories: DEFAULT_CATEGORIES,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(userRef, newUser);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${u.uid}`);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const accountsQuery = query(
      collection(db, 'accounts'),
      where('userId', '==', user.uid)
    );
    
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubAccounts = onSnapshot(accountsQuery, (snap) => {
      const accs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      setAccounts(accs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'accounts');
    });

    const unsubTransactions = onSnapshot(transactionsQuery, (snap) => {
      const trans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(trans);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubAccounts();
      unsubTransactions();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main text-[#F5F5F5] px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-12 brutalist-card text-center"
        >
          <div className="w-12 h-12 bg-brand-emerald rounded-full mx-auto mb-8 animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.4)]" />
          <h1 className="text-5xl font-black tracking-tighter mb-4">WEALTHFLOW</h1>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/40 mb-10 leading-relaxed">
            Aggregate Net Worth Monitoring • Local First
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-5 rounded-full bg-white text-black font-black uppercase tracking-widest text-xs transition-all hover:bg-brand-emerald hover:scale-[1.02] active:scale-95"
          >
            Authenticate via Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-[#F5F5F5] flex flex-col p-6 md:p-10 lg:p-12 overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-between items-center mb-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-emerald rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
          <span className="text-2xl font-black tracking-widest uppercase italic font-serif">WealthFlow</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
            <div className="w-2 h-2 bg-brand-emerald rounded-full animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest font-black opacity-60">Syncing Local First</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full border border-white/20 hover:border-brand-emerald transition-colors flex items-center justify-center bg-white/5"
          >
            <LogOut size={16} className="text-white/40" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative max-w-7xl mx-auto w-full">
        <div className="flex-1 pb-32">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-16"
              >
                <Dashboard 
                  accounts={accounts} 
                  transactions={transactions} 
                  onViewAllTransactions={() => setView('transactions')}
                />
              </motion.div>
            )}

            {view === 'accounts' && (
              <motion.div
                key="accounts"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Accounts accounts={accounts} userId={user.uid} />
              </motion.div>
            )}

            {view === 'transactions' && (
              <motion.div
                key="transactions"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Transactions transactions={transactions} accounts={accounts} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Navigation - Centered Bottom Bar */}
        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
          <div className="flex gap-1 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-full shadow-2xl">
            <NavButton 
              active={view === 'dashboard'} 
              onClick={() => setView('dashboard')}
              label="Vault"
            />
            <NavButton 
              active={view === 'accounts'} 
              onClick={() => setView('accounts')}
              label="Pulse"
            />
            <NavButton 
              active={view === 'transactions'} 
              onClick={() => setView('transactions')}
              label="Stream"
            />
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-2.5 bg-brand-emerald text-black rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:scale-110 active:scale-95"
            >
              Add
            </button>
          </div>
        </nav>
      </main>

      <AddTransaction 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        accounts={accounts}
        userId={user.uid}
      />
    </div>
  );
}

function NavButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
        active 
          ? "bg-white text-black" 
          : "text-white/40 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}

function MobileNavButton({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-xl transition-all",
        active ? "text-blue-600" : "text-gray-400"
      )}
    >
      {icon}
    </button>
  );
}

