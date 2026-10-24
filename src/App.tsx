import React, { useState, useEffect } from 'react';
import { api, setActivePersonaId } from './api';
import { User } from './types';
import { BrandHeader } from './components/BrandHeader';
import { BuyerDesk } from './components/BuyerDesk';
import { ProducerPortal } from './components/ProducerPortal';
import { ReviewerDesk } from './components/ReviewerDesk';
import { AnalyticsView } from './components/AnalyticsView';
import { TestRunnerView } from './components/TestRunnerView';
import {
  ShoppingBag, Sprout, ShieldCheck, BarChart3,
  Terminal, AlertCircle, CheckCircle2, Info
} from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [personas, setPersonas] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'buyer' | 'producer' | 'reviewer' | 'analytics' | 'tests'>('buyer');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const loadPersonas = async () => {
    try {
      const res = await api.getPersonas();
      setPersonas(res.users);
      if (res.users.length > 0) {
        // Default to Colombo Buyer
        const defaultBuyer = res.users.find(u => u.id === 'usr_buyer_colombo') || res.users[0];
        setCurrentUser(defaultBuyer);
        setActivePersonaId(defaultBuyer.id);
      }
    } catch (err: any) {
      showNotification('Failed to load personas: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    loadPersonas();
  }, []);

  const handleSelectPersona = (user: User) => {
    setCurrentUser(user);
    setActivePersonaId(user.id);
    // Automatically switch to the persona's natural tab
    if (user.role === 'buyer') setActiveTab('buyer');
    else if (user.role === 'producer') setActiveTab('producer');
    else if (user.role === 'reviewer') setActiveTab('reviewer');
    showNotification(`Switched persona to: ${user.name} (${user.role.toUpperCase()})`, 'info');
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const res = await api.resetDemo();
      showNotification(res.message, 'success');
      await loadPersonas();
      // Reset active tab to buyer
      setActiveTab('buyer');
    } catch (err: any) {
      showNotification('Reset failed: ' + err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-stone-900 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Brand Header & Legal Disclaimer */}
      <BrandHeader
        currentUser={currentUser}
        personas={personas}
        onSelectPersona={handleSelectPersona}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Tab Navigation */}
      <div className="border-b border-stone-200 bg-white shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('buyer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'buyer'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buyer Procurement Desk</span>
          </button>

          <button
            onClick={() => setActiveTab('producer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'producer'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span>Producer Stock & Fulfilment</span>
          </button>

          <button
            onClick={() => setActiveTab('reviewer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'reviewer'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Reviewer & Verification</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Operational Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tests'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Acceptance Tests (10/10)</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {/* Notification Toast */}
        {notification && (
          <div className={`mb-4 p-3 rounded-xl border flex items-center justify-between text-xs font-medium shadow-sm transition-all ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
            notification.type === 'error' ? 'bg-red-50 border-red-300 text-red-900' :
            'bg-blue-50 border-blue-300 text-blue-900'
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
              {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />}
              {notification.type === 'info' && <Info className="w-4 h-4 text-blue-700 shrink-0" />}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-stone-400 hover:text-stone-700 ml-3 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* View Switcher */}
        {activeTab === 'buyer' && <BuyerDesk onNotify={showNotification} />}
        {activeTab === 'producer' && <ProducerPortal currentUser={currentUser} onNotify={showNotification} />}
        {activeTab === 'reviewer' && <ReviewerDesk currentUser={currentUser} onNotify={showNotification} />}
        {activeTab === 'analytics' && <AnalyticsView onNotify={showNotification} />}
        {activeTab === 'tests' && <TestRunnerView onNotify={showNotification} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 px-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Aswanu Prototype — Sri Lankan Agricultural Procurement Coordination</span>
          <span className="font-mono text-[11px] text-stone-400">
            Node v26.3 | Built-in node:sqlite WAL | React + TypeScript | Express REST API
          </span>
        </div>
      </footer>
    </div>
  );
}
