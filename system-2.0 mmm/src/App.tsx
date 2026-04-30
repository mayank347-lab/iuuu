import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  RefreshCcw, 
  MoreVertical,
  Check,
  BarChart2,
  Calendar as CalendarIcon,
  X,
  Edit2,
  Download,
  Upload,
  Printer,
  CloudCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface HabitLogs {
  [monthYear: string]: {
    [day: number]: boolean;
  };
}

interface Habit {
  id: string;
  name: string;
  category?: string;
  logs: HabitLogs;
  createdAt: number;
}

// --- Constants ---

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_IN_MONTH = (month: number, year: number) => new Date(year, month + 1, 0).getDate();

// --- Components ---

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('ritual_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [habits, setHabits] = useState<Habit[]>(() => {
    // Load immediately on initialization to prevent empty state flashes
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ritual_habits');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse habits", e);
        }
      }
    }
    // Seed with examples if empty
    return [
      { id: '1', name: 'Morning Meditation', logs: {}, createdAt: Date.now() },
      { id: '2', name: 'Read for 30 min', logs: {}, createdAt: Date.now() },
      { id: '3', name: 'Hydrate (2L)', logs: {}, createdAt: Date.now() },
    ];
  });
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [activeTab, setActiveTab] = useState<'monthly' | 'insights'>('monthly');
  
  // Helpers
  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const monthKey = `${currentMonth}-${currentYear}`;
  const isSelectedMonthToday = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  const daysInMonth = DAYS_IN_MONTH(currentMonth, currentYear);
  
  // Daily Progress Calculation
  const getDailyProgress = () => {
    if (habits.length === 0) return 0;
    const todayNum = today.getDate();
    const currentMonthKey = `${today.getMonth()}-${today.getFullYear()}`;
    const doneToday = habits.filter(h => h.logs[currentMonthKey]?.[todayNum]).length;
    return Math.round((doneToday / habits.length) * 100);
  };

  const dailyProgress = getDailyProgress();

  const [monthlyNotes, setMonthlyNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('ritual_notes');
    return saved ? JSON.parse(saved) : {};
  });
  const [saveStatus, setSaveStatus] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- Auth Logic ---

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = end.getTime() - now.getTime();

      setTimeLeft({
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Sound Engine ---

  const playSynth = (type: 'check' | 'uncheck' | 'click' | 'sweep') => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      
      if (type === 'check') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start();
        osc.stop(now + 0.1);
      } else if (type === 'uncheck') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start();
        osc.stop(now + 0.1);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start();
        osc.stop(now + 0.05);
      } else if (type === 'sweep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start();
        osc.stop(now + 0.2);
      }
    } catch (e) {
      // Silent fail if audio is blocked
    }
  };

  const handleAuth = () => {
    if (passwordInput === 'eren30') {
      playSynth('sweep');
      setIsAuthenticated(true);
      sessionStorage.setItem('ritual_auth', 'true');
    } else {
      playSynth('uncheck');
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 500);
    }
  };

  // --- Persistence ---

  useEffect(() => {
    // Mark as loaded after first render to enable saving
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return; // Don't save empty state during initialization

    localStorage.setItem('ritual_habits', JSON.stringify(habits));
    localStorage.setItem('ritual_notes', JSON.stringify(monthlyNotes));
    
    // Trigger "Saved" feedback
    setSaveStatus(true);
    const timer = setTimeout(() => setSaveStatus(false), 2000);
    return () => clearTimeout(timer);
  }, [habits, monthlyNotes, isLoaded]);

  // --- Data Operations ---

  const exportData = () => {
    const data = JSON.stringify(habits, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ritual-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          setHabits(data);
        }
      } catch (err) {
        alert('Invalid backup file formatting.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const printRitual = () => {
    window.print();
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const handleResetMonth = () => setCurrentDate(new Date());

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    
    if (editingHabitId) {
      setHabits(prev => prev.map(h => h.id === editingHabitId ? { ...h, name: newHabitName } : h));
      setEditingHabitId(null);
    } else {
      const newHabit: Habit = {
        id: Math.random().toString(36).substr(2, 9),
        name: newHabitName,
        logs: {},
        createdAt: Date.now()
      };
      setHabits(prev => [...prev, newHabit]);
    }
    
    setNewHabitName('');
    setIsAddModalOpen(false);
  };

  const deleteHabit = (id: string) => {
    if (confirm('Delete this habit?')) {
      setHabits(prev => prev.filter(h => h.id !== id));
    }
  };

  const toggleDay = (habitId: string, day: number) => {
    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit;
      
      const newLogs = { ...habit.logs };
      if (!newLogs[monthKey]) newLogs[monthKey] = {};
      const wasDone = newLogs[monthKey][day];
      newLogs[monthKey][day] = !wasDone;
      
      playSynth(wasDone ? 'uncheck' : 'check');
      
      return { ...habit, logs: newLogs };
    }));
  };

  const clearMonth = () => {
    if (confirm('Reset all progress for this month?')) {
      setHabits(prev => prev.map(habit => {
        const newLogs = { ...habit.logs };
        delete newLogs[monthKey];
        return { ...habit, logs: newLogs };
      }));
    }
  };

  const getCompletionPercentage = (habit: Habit) => {
    const logs = habit.logs[monthKey] || {};
    const completedDays = Object.values(logs).filter(Boolean).length;
    return Math.round((completedDays / daysInMonth) * 100);
  };

  const calculateStreak = (habit: Habit) => {
    let currentStreak = 0;
    const now = new Date();
    let checkDate = new Date();

    // Work backwards starting from today
    while (true) {
      const mKey = `${checkDate.getMonth()}-${checkDate.getFullYear()}`;
      const d = checkDate.getDate();
      if (habit.logs[mKey]?.[d]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // If we found a hole on a day BEFORE today, break.
        // Today can be a hole (not done yet), so we check yesterday first if today is missing.
        if (checkDate.toDateString() === now.toDateString()) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue; 
        }
        break;
      }
      
      // Safety break for 1 year
      if (currentStreak > 365) break;
    }
    return currentStreak;
  };

  const globalMonthlyProgress = useMemo(() => {
    if (habits.length === 0) return 0;
    const totalPossible = habits.length * daysInMonth;
    let totalCompleted = 0;
    habits.forEach(h => {
      const logs = h.logs[monthKey] || {};
      totalCompleted += Object.values(logs).filter(Boolean).length;
    });
    return Math.round((totalCompleted / totalPossible) * 100);
  }, [habits, monthKey, daysInMonth]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-ritual-bg flex items-center justify-center p-6 text-black">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-ritual-card border border-black/10 p-12 rounded-none w-full max-w-sm shadow-2xl text-center"
        >
          <div className="w-20 h-20 bg-black/5 border-2 border-black/10 rounded-none flex items-center justify-center mx-auto mb-8">
            <CalendarIcon className="text-black/40" size={28} />
          </div>
          <h1 className="font-display font-black text-5xl mb-2 tracking-tighter uppercase text-black">ACCESS</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-black/30 mb-8">Verification Required</p>
          
          <motion.div
            animate={passwordError ? { x: [-10, 10, -10, 10, 0] } : {}}
            className="space-y-4"
          >
            <input 
              type="password"
              placeholder="PASSKEY"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              className="w-full bg-white border-2 border-black/10 rounded-none p-5 text-center tracking-[0.8em] focus:border-black outline-none transition-all uppercase font-black placeholder:text-black/5"
            />
            <button 
              onClick={handleAuth}
              className="w-full bg-black text-white py-5 rounded-none font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black/80 transition-all active:scale-95"
            >
              Authorize Entry
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-[1600px] mx-auto bg-ritual-bg text-ritual-ink transition-colors duration-700">
      {/* Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-display text-4xl md:text-8xl font-extrabold tracking-tighter uppercase mb-2"
          >
            SYSTEM 2.0
          </motion.h1>

          <div className="flex gap-8 mb-8 no-print px-2 lg:px-0">
            <button 
              onClick={() => { setActiveTab('monthly'); playSynth('click'); }}
              className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all relative py-2 ${activeTab === 'monthly' ? 'text-black' : 'text-black/20 hover:text-black/40'}`}
            >
              Log
              {activeTab === 'monthly' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
            </button>
            <button 
              onClick={() => { setActiveTab('insights'); playSynth('click'); }}
              className={`text-[10px] font-black uppercase tracking-[0.4em] transition-all relative py-2 ${activeTab === 'insights' ? 'text-black' : 'text-black/20 hover:text-black/40'}`}
            >
              Matrix
              {activeTab === 'insights' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-8 no-print bg-black/[0.02] border border-black/5 p-6 w-full lg:max-w-fit">
            <div className="flex-1">
              <span className="text-[8px] font-black uppercase tracking-[0.5em] text-black/20 block mb-4">Cycle Remaining</span>
              <div className="flex justify-between sm:justify-start gap-4 md:gap-8 font-display font-black text-2xl tracking-tighter sm:text-4xl text-black">
                 <div className="flex flex-col items-center">
                    <span className="leading-none">{timeLeft.d}d</span>
                 </div>
                 <span className="opacity-10">:</span>
                 <div className="flex flex-col items-center">
                    <span className="leading-none">{String(timeLeft.h).padStart(2, '0')}h</span>
                 </div>
                 <span className="opacity-10">:</span>
                 <div className="flex flex-col items-center">
                    <span className="leading-none">{String(timeLeft.m).padStart(2, '0')}m</span>
                 </div>
                 <span className="opacity-10 hidden sm:inline">:</span>
                 <div className="flex flex-col items-center text-black">
                    <motion.span
                      key={timeLeft.s}
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className="leading-none"
                    >
                      {String(timeLeft.s).padStart(2, '0')}s
                    </motion.span>
                 </div>
              </div>
            </div>
            
            <div className="h-px sm:h-12 w-full sm:w-px bg-black/5 mx-2"></div>
            
            <div className="flex-1 min-w-[140px]">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black">Today</span>
                <span className="font-display font-black text-2xl text-black">{dailyProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-black"
                />
              </div>
            </div>

            <div className="h-px sm:h-12 w-full sm:w-px bg-black/5 mx-2"></div>
            
            <div className="flex-1 min-w-[140px]">
              <div className="flex justify-between items-end mb-3">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/30">Month</span>
                <span className="font-display font-black text-2xl text-black/40">{globalMonthlyProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${globalMonthlyProgress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-black/30"
                />
              </div>
            </div>

            <div className="h-px sm:h-12 w-full sm:w-px bg-black/5 mx-2"></div>

            <div className="flex-1 min-w-[200px]">
              <span className="text-[8px] font-black uppercase tracking-[0.5em] text-black/20 block mb-2">Cycle Objectives</span>
              <textarea
                value={monthlyNotes[monthKey] || ''}
                onChange={(e) => setMonthlyNotes(prev => ({ ...prev, [monthKey]: e.target.value }))}
                placeholder="INPUT MISSION GOALS..."
                className="w-full bg-transparent border-b border-black/5 p-0 text-[10px] font-bold tracking-tight text-black placeholder:text-black/10 focus:border-black outline-none transition-all resize-none h-10 scrollbar-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-black/40 font-bold tracking-tight border-t-2 border-black pt-4 mt-2">
            <button 
              onClick={handlePrevMonth} 
              className="hover:bg-black hover:text-white p-2 transition-all active:scale-90 border border-black/5"
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="flex flex-col items-center flex-1 min-w-[200px]">
              <span className="text-[8px] font-black uppercase tracking-[0.5em] text-black/30 mb-1">Active Cycle</span>
              <span className="text-xl md:text-3xl text-center uppercase tracking-[0.3em] font-display font-black text-black">
                {MONTHS[currentMonth]} {currentYear}
              </span>
            </div>

            <button 
              onClick={handleNextMonth} 
              className="hover:bg-black hover:text-white p-2 transition-all active:scale-90 border border-black/5"
            >
              <ChevronRight size={24} />
            </button>
            
            <div className="h-8 w-px bg-black/10 hidden lg:block mx-4"></div>

            <div className="flex items-center gap-4 no-print order-last sm:order-none w-full sm:w-auto mt-4 sm:mt-0">
              <button 
                onClick={exportData}
                title="Export Backup (JSON)"
                className="hover:text-black p-1 transition-colors"
              >
                <Download size={18} />
              </button>
              <label className="cursor-pointer hover:text-black p-1 transition-colors" title="Import Rituals">
                <Upload size={18} />
                <input type="file" className="hidden" accept=".json" onChange={importData} />
              </label>
              <button 
                onClick={printRitual}
                title="Print Ritual"
                className="hover:text-black p-1 transition-colors"
              >
                <Printer size={18} />
              </button>
              
              <AnimatePresence>
                {saveStatus && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase text-white bg-black px-2.5 py-1 rounded-none shadow-sm"
                  >
                    <CloudCheck size={10} /> Sync Complete
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              onClick={handleResetMonth}
              className="sm:ml-auto text-[9px] font-black uppercase tracking-[0.3em] bg-black/5 hover:bg-black hover:text-white px-6 py-2 rounded-none transition-all border border-black/5 flex items-center gap-2"
            >
              <CalendarIcon size={12} className="text-black/40 group-hover:text-white" /> Present
            </button>
          </div>
        </div>

        <div className="flex gap-4 no-print">
          <button 
            onClick={clearMonth}
            className="p-3 border border-black/5 rounded-none hover:bg-black/5 transition-all active:scale-90 group"
            title="Reset Month"
          >
            <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-700 text-black/20" />
          </button>
          <button 
            onClick={() => { setEditingHabitId(null); setNewHabitName(''); setIsAddModalOpen(true); }}
            className="px-6 py-4 bg-black text-white rounded-none flex items-center gap-3 transition-all active:scale-95 font-black uppercase tracking-[0.2em] text-[10px]"
          >
            <Plus size={18} strokeWidth={3} /> New Ritual
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === 'monthly' ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="brutalist-card mt-6"
        >
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* Grid Header */}
              <div className="grid grid-cols-[200px_1fr] md:grid-cols-[280px_1fr] border-b border-black/5">
                <div className="p-4 md:p-8 border-r border-black/5 flex flex-col justify-end sticky left-0 bg-ritual-bg z-10">
                  <span className="text-[8px] font-black uppercase tracking-[0.5em] text-black/20 mb-1">Ritual Log</span>
                  <span className="font-display font-black text-xl md:text-2xl leading-none">OBJECTIVE</span>
                </div>
                <div className="flex h-20 md:h-24 items-end px-4">
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday = isSelectedMonthToday && today.getDate() === day;
                    return (
                      <div 
                        key={day} 
                        className="flex-1 flex flex-col items-center justify-center p-1 md:p-2 min-w-[34px]"
                      >
                        <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-tight mb-1 ${isToday ? 'text-black' : 'text-black/10'}`}>
                          {new Date(currentYear, currentMonth, day).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                        </span>
                        <span className={`text-xs font-bold ${isToday ? 'text-black underline underline-offset-4 decoration-2' : 'text-black/20'}`}>
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid Body */}
              <div>
                <AnimatePresence mode="popLayout">
                  {habits.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-20 md:p-32 text-center"
                    >
                      <p className="font-display font-black text-xl md:text-2xl text-white/10 uppercase tracking-widest">Initialization Pending...</p>
                    </motion.div>
                  ) : (
                    habits.map((habit, hIdx) => {
                      const completion = getCompletionPercentage(habit);
                      return (
                        <motion.div 
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: hIdx * 0.03 }}
                          key={habit.id} 
                          className="grid grid-cols-[200px_1fr] md:grid-cols-[280px_1fr] border-t border-black/5 group/row hover:bg-black/[0.01] transition-colors"
                        >
                          <div className="p-4 md:p-8 border-r border-black/5 flex items-center justify-between sticky left-0 bg-ritual-bg z-10">
                            <div className="flex-1 min-w-0 mr-2 md:mr-4">
                              <h3 className="font-black text-black text-xs md:text-lg tracking-tighter uppercase group-hover/row:text-black transition-colors truncate">{habit.name}</h3>
                              <div className="w-full bg-black/5 h-[2px] mt-2 overflow-hidden no-print">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${completion}%` }}
                                  className="h-full bg-black/40"
                                />
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity no-print">
                              <button 
                                onClick={() => { setEditingHabitId(habit.id); setNewHabitName(habit.name); setIsAddModalOpen(true); playSynth('click'); }}
                                className="p-1.5 md:p-2 hover:text-black text-black/10 transition-colors"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button 
                                onClick={() => { deleteHabit(habit.id); playSynth('uncheck'); }}
                                className="p-1.5 md:p-2 hover:text-red-500 text-black/10 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="flex px-4 py-2 items-center">
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                              const day = i + 1;
                              const isDone = habit.logs[monthKey]?.[day];
                              const isToday = isSelectedMonthToday && today.getDate() === day;
                              
                              return (
                                <div key={day} className={`flex-1 flex justify-center p-1.5 min-w-[34px] ${isToday ? 'bg-black/[0.02]' : ''}`}>
                                  <button
                                    onClick={() => toggleDay(habit.id, day)}
                                    className={`
                                      w-8 h-8 rounded-none transition-all duration-300 flex items-center justify-center border
                                      ${isDone 
                                        ? 'bg-black border-black text-white' 
                                        : isToday
                                          ? 'bg-transparent border-black shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]'
                                          : 'bg-transparent border-black/5 hover:border-black/20'
                                      }
                                    `}
                                  >
                                    {isDone && <Check size={14} strokeWidth={4} />}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6"
        >
          {habits.map((habit, idx) => {
            const streak = calculateStreak(habit);
            const monthlyStrength = getCompletionPercentage(habit);
            
            return (
              <motion.div 
                key={habit.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="brutalist-card p-6 flex flex-col justify-between h-full"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-black/20">Metric {idx + 1}</span>
                  </div>
                  <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-6">{habit.name}</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-black/30 block mb-1">Streak</span>
                      <span className="text-3xl font-display font-black text-black">{streak} Days</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-black/30 block mb-1">Accuracy</span>
                      <span className="text-2xl font-display font-black text-black">{monthlyStrength}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-black/5 pt-4">
                  <div className="flex gap-1.5 justify-between">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - i));
                      const mKey = `${date.getMonth()}-${date.getFullYear()}`;
                      const d = date.getDate();
                      const isDone = habit.logs[mKey]?.[d];
                      
                      return (
                        <div key={i} className={`h-1.5 flex-1 ${isDone ? 'bg-black' : 'bg-black/5'}`}></div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <footer className="mt-24 pb-12 text-center no-print border-t border-black/5 pt-12">
        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="text-xl md:text-2xl font-black uppercase tracking-tighter text-black mb-8 max-w-2xl mx-auto leading-tight py-6 border-y-2 border-black/5"
        >
          "AT THIS INSTANT YOUR ENEMY IS TRAINING HARD TO KILL YOU. WHAT ARE YOU DOING??"
        </motion.p>
        <div className="flex items-center justify-center gap-4 text-[8px] font-black uppercase tracking-[0.6em] text-black/5">
          <span>System 2.0.4</span>
          <div className="w-1 h-1 bg-black rounded-full"></div>
          <span>Operative Ritual Log</span>
        </div>
      </footer>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-ritual-bg/90 backdrop-blur-xl"
            />
            <motion.div 
              style={{ x: '-50%', y: '-50%', position: 'absolute', top: '50%', left: '50%' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-ritual-card w-full max-w-md p-8 shadow-2xl z-10 border border-black/10"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-[0.5em] text-black/20 mb-2 block">Inscription</span>
                  <h2 className="text-3xl font-display font-black uppercase tracking-tighter text-black">{editingHabitId ? 'Refine Objective' : 'New Objective'}</h2>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:text-black text-black/20 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-[8px] uppercase font-black tracking-widest text-black/20 mb-3">Define the commitment</p>
                  <input 
                    autoFocus
                    placeholder="E.G. DAILY TRAINING"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addHabit()}
                    className="w-full bg-white border border-black/10 p-5 outline-none focus:border-black transition-all font-black uppercase tracking-widest text-sm placeholder:text-black/5"
                  />
                </div>
                
                <button 
                  onClick={() => { addHabit(); playSynth('sweep'); }}
                  disabled={!newHabitName.trim()}
                  className="w-full bg-black text-white py-5 font-black uppercase tracking-[0.3em] text-[10px] hover:bg-black/90 transition-all active:scale-95 disabled:opacity-10"
                >
                  {editingHabitId ? 'Override Protocol' : 'Initialize Protocol'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
