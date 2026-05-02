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
  orderBy,
  serverTimestamp,
  addDoc,
  updateDoc,
  increment
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
  MessageSquareQuote,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from './lib/utils';
import { detectLocalCurrency } from './lib/currency';
import Dashboard from './components/Dashboard';
import Accounts from './components/Accounts';
import Transactions from './components/Transactions';
import AddTransaction from './components/AddTransaction';
import VoiceAssistant from './components/VoiceAssistant';
import Settings from './components/Settings';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'accounts' | 'transactions' | 'settings'>('dashboard');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMasked, setIsMasked] = useState(false);

  useEffect(() => {
    if (profile?.theme) {
      document.documentElement.classList.toggle('dark', profile.theme === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [profile?.theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    let isInitialized = false;

    const setupProfile = async () => {
      try {
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          const local = await detectLocalCurrency();
          const newUser = {
            userId: user.uid,
            email: user.email || '',
            currency: local.code || 'INR',
            theme: 'dark' as const,
            categories: DEFAULT_CATEGORIES,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(userRef, newUser);
          // Snapshot will trigger setProfile
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      }
    };

    if (!isInitialized) {
      setupProfile();
      isInitialized = true;
    }

    const unsubProfile = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return unsubProfile;
  }, [user]);

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

  const handleVoiceAction = async (action: string, args: any) => {
    if (!user) return;

    try {
      if (action === 'createAccount') {
        const balance = typeof args.balance === 'string' ? parseFloat(args.balance.replace(/[^0-9.]/g, '')) : (args.balance || 0);
        await addDoc(collection(db, 'accounts'), {
          userId: user.uid,
          name: args.name,
          type: args.type,
          balance: balance,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (action === 'addTransaction') {
        const amount = typeof args.amount === 'string' ? parseFloat(args.amount.replace(/[^0-9.]/g, '')) : (args.amount || 0);
        if (amount <= 0) throw new Error("Invalid amount");

        // Robust account matching
        let account = accounts.find(a => a.name.toLowerCase() === args.accountName.toLowerCase()) ||
                     accounts.find(a => a.name.toLowerCase().includes(args.accountName.toLowerCase())) ||
                     (accounts.length === 1 ? accounts[0] : null);

        if (!account) {
          throw new Error(`Account "${args.accountName}" not found.`);
        }

        const transactionData = {
          userId: user.uid,
          accountId: account.id,
          amount: amount,
          type: args.type,
          category: args.category || 'General',
          description: args.description || `Voice entry: ${args.category || 'Transaction'}`,
          date: new Date().toISOString(),
          isAutomated: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await addDoc(collection(db, 'transactions'), transactionData);

        // Update account balance
        const accountRef = doc(db, 'accounts', account.id);
        const impact = args.type === 'Income' ? amount : -amount;
        await updateDoc(accountRef, {
          balance: increment(impact),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Failed to execute voice action:', error);
      throw error;
    }
  };

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main text-text-main px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-12 brutalist-card text-center shadow-2xl"
        >
          <div className="w-12 h-12 bg-brand-emerald rounded-full mx-auto mb-8 animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.4)]" />
          <h1 className="text-5xl font-black tracking-tighter mb-4">WEALTHFLOW</h1>
          <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-40 mb-10 leading-relaxed">
            Aggregate Net Worth Monitoring • Local First
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-5 rounded-full bg-text-main text-bg-main font-black uppercase tracking-widest text-xs transition-all hover:bg-brand-emerald hover:text-black hover:scale-[1.02] active:scale-95"
          >
            Authenticate via Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-text-main flex flex-col p-4 md:p-10 lg:p-12 overflow-x-hidden">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 md:mb-16">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-emerald rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]"></div>
          <span className="text-2xl font-black tracking-widest uppercase italic font-serif">Hisab Diary</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-text-main/5 border border-card-border rounded-full">
            <div className="w-2 h-2 bg-brand-emerald rounded-full animate-pulse"></div>
            <span className="text-[9px] uppercase tracking-widest font-black opacity-60">Verified Sync</span>
          </div>
          <button 
            onClick={handleLogout}
            className="w-9 h-9 rounded-full border border-card-border hover:border-brand-emerald transition-colors flex items-center justify-center bg-card-bg shadow-sm"
          >
            <LogOut size={14} className="opacity-40" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative max-w-7xl mx-auto w-full">
        <div className="flex-1 pb-32">
          <AnimatePresence mode="wait">
            {accounts.length === 0 && view === 'dashboard' ? (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto py-10"
              >
                <div className="brutalist-card p-10 text-center space-y-8 shadow-xl">
                  <div className="w-20 h-20 bg-brand-emerald/10 rounded-full flex items-center justify-center mx-auto border border-brand-emerald/20">
                    <Globe className="text-brand-emerald" size={40} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter mb-4">Welcome to your Diary</h2>
                    <p className="opacity-60 leading-relaxed font-medium">
                      Let's start your financial journey. First, add an account like your Bank, Cash wallet, or Savings to track your net worth.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => setView('accounts')}
                      className="p-6 border-2 border-card-border rounded-3xl hover:border-brand-emerald transition-all text-left group bg-card-bg/50"
                    >
                      <p className="text-[10px] uppercase font-black opacity-40 mb-2 tracking-widest">Step 1</p>
                      <h4 className="text-xl font-bold group-hover:text-brand-emerald transition-colors">Create Account</h4>
                    </button>
                    <button 
                      onClick={() => setIsAddModalOpen(true)}
                      className="p-6 border-2 border-card-border rounded-3xl opacity-40 cursor-not-allowed text-left bg-card-bg/50"
                    >
                      <p className="text-[10px] uppercase font-black opacity-40 mb-2 tracking-widest">Step 2</p>
                      <h4 className="text-xl font-bold">Log Transaction</h4>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
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
                      currency={profile?.currency || 'INR'}
                      isMasked={isMasked}
                      setIsMasked={setIsMasked}
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
                    <Accounts 
                      accounts={accounts} 
                      userId={user.uid} 
                      currency={profile?.currency || 'INR'} 
                      isMasked={isMasked}
                    />
                  </motion.div>
                )}

                {view === 'transactions' && (
                  <motion.div
                    key="transactions"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Transactions 
                      transactions={transactions} 
                      accounts={accounts} 
                      userId={user.uid} 
                      currency={profile?.currency || 'INR'} 
                      isMasked={isMasked}
                    />
                  </motion.div>
                )}

                {view === 'settings' && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Settings 
                      profile={profile} 
                      onLogout={handleLogout} 
                      isMasked={isMasked}
                      setIsMasked={setIsMasked}
                    />
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Global Navigation - Bottom Bar */}
        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl">
          <div className="flex items-center bg-card-bg/80 backdrop-blur-3xl border border-card-border p-2 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.3)]">
            <div className="flex bg-text-main/5 rounded-full p-1 mr-4">
              <NavButton 
                active={view === 'dashboard'} 
                onClick={() => setView('dashboard')}
                label="Home"
              />
              <NavButton 
                active={view === 'accounts'} 
                onClick={() => setView('accounts')}
                label="Ledger"
              />
              <NavButton 
                active={view === 'transactions'} 
                onClick={() => setView('transactions')}
                label="Logs"
              />
              <NavButton 
                active={view === 'settings'} 
                onClick={() => setView('settings')}
                label="Settings"
              />
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="w-12 h-12 bg-text-main text-bg-main rounded-full flex items-center justify-center transition-all hover:bg-brand-emerald hover:text-black hover:scale-105 active:scale-95 shadow-lg group"
              >
                <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
              
              <div className="h-8 w-px bg-text-main/10 mx-1" />
              
              <VoiceAssistant 
                onAction={handleVoiceAction} 
                accountNames={accounts.map(a => a.name)} 
              />
            </div>
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
        "px-5 py-2.5 rounded-full text-[9px] font-mono font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden",
        active 
          ? "bg-text-main text-bg-main shadow-lg" 
          : "text-text-main/40 hover:text-text-main/70 hover:bg-text-main/5"
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

