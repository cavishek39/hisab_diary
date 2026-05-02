import React from 'react';
import { UserProfile } from '../types';
import { 
  Moon, 
  Sun, 
  Globe, 
  User, 
  Shield, 
  Bell, 
  ChevronRight,
  LogOut,
  CreditCard,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface SettingsProps {
  profile: UserProfile | null;
  onLogout: () => void;
  isMasked: boolean;
  setIsMasked: (val: boolean) => void;
}

const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
];

export default function Settings({ profile, onLogout, isMasked, setIsMasked }: SettingsProps) {
  const toggleTheme = async () => {
    if (!profile) return;
    const newTheme = profile.theme === 'dark' ? 'light' : 'dark';
    try {
      await updateDoc(doc(db, 'users', profile.userId), {
        theme: newTheme,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.userId}`);
    }
  };

  const setCurrency = async (code: string) => {
    if (!profile) return;
    try {
      await updateDoc(doc(db, 'users', profile.userId), {
        currency: code,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.userId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-12">
      <header>
        <h2 className="text-5xl font-black tracking-tighter mb-4 italic font-serif">Preferences</h2>
        <p className="text-sm font-mono uppercase tracking-[0.3em] opacity-40">System Configuration & User Control</p>
      </header>

      <section className="space-y-6">
        <h3 className="label-caps opacity-40">Identity</h3>
        <div className="brutalist-card p-10 flex items-center gap-6">
          <div className="w-20 h-20 bg-brand-emerald rounded-full flex items-center justify-center text-black font-black text-3xl shadow-xl">
            {profile?.email?.[0].toUpperCase() || 'U'}
          </div>
          <div>
            <h4 className="text-2xl font-black tracking-tight">{profile?.email}</h4>
            <div className="flex items-center gap-2 mt-2 opacity-40 text-xs font-mono uppercase tracking-widest">
              <Shield size={12} />
              <span>Verified Account</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <h3 className="label-caps opacity-40">Appearance</h3>
          <div className="brutalist-card p-2 space-y-2">
            <button 
              onClick={toggleTheme}
              className={cn(
                "w-full flex items-center justify-between p-6 rounded-[2rem] transition-all",
                profile?.theme === 'dark' ? "bg-text-main/5 text-text-main" : "hover:bg-text-main/5"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                  <Moon size={18} />
                </div>
                <span className="font-bold">Dark Mode</span>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                profile?.theme === 'dark' ? "bg-brand-emerald" : "bg-white/10"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                  profile?.theme === 'dark' ? "left-7 shadow-lg" : "left-1"
                )} />
              </div>
            </button>

            <button 
              onClick={() => setIsMasked(!isMasked)}
              className="w-full flex items-center justify-between p-6 rounded-[2rem] hover:bg-text-main/5 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500">
                  {isMasked ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
                <span className="font-bold">Anonymize Balances</span>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                isMasked ? "bg-brand-emerald" : "bg-white/10"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                  isMasked ? "left-7 shadow-lg" : "left-1"
                )} />
              </div>
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="label-caps opacity-40">Financial Context</h3>
          <div className="brutalist-card p-6 space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-brand-emerald/10 rounded-xl flex items-center justify-center text-brand-emerald">
                <Globe size={18} />
              </div>
              <span className="font-bold">Base Currency</span>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl transition-all border",
                    profile?.currency === c.code 
                      ? "bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald" 
                      : "border-transparent hover:bg-text-main/5 opacity-40 hover:opacity-100"
                  )}
                >
                  <span className="font-mono text-xs uppercase tracking-widest">{c.name}</span>
                  {profile?.currency === c.code && <div className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="pt-10">
        <button 
          onClick={onLogout}
          className="w-full p-8 brutalist-card border-red-500/20 hover:border-red-500/50 hover:bg-red-500/5 transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
              <LogOut size={24} />
            </div>
            <div className="text-left">
              <h4 className="text-xl font-bold text-red-500">De-authenticate</h4>
              <p className="text-xs font-mono uppercase tracking-widest opacity-40 mt-1">End current secure session</p>
            </div>
          </div>
          <ChevronRight size={24} className="text-red-500/20 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
        </button>
      </section>

      <footer className="text-center pt-10 opacity-20 pointer-events-none">
        <p className="font-mono text-[9px] uppercase tracking-[0.5em]">WealthFlow Protocol v1.4.2 — Built for Eternity</p>
      </footer>
    </div>
  );
}
