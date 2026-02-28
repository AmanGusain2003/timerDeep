import { useEffect, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/index.js';
import { useTimerStore } from './store/useTimerStore.js';
import { useWakeLock } from './hooks/useWakeLock.js';
import { useSync } from './hooks/useSync.js';
import { Tank } from './components/Tank.js';
import { Controls } from './components/Controls.js';
import { Timeline } from './components/Timeline.js';
import { DashboardBattery } from './components/DashboardBattery.js';
import { AuthScreen } from './components/AuthScreen.js';


function App() {
  const { isDocked, toggleDock, activeMode, token, user, logout } = useTimerStore();
  const { isSupported, requestWakeLock, releaseWakeLock } = useWakeLock();
  const { fetchLogsByDate } = useSync();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);




  const [currentTimeMins, setCurrentTimeMins] = useState(0);
  const [currentView, setCurrentView] = useState<'TIMER' | 'DASHBOARD'>('TIMER');

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const nextStr = d.toISOString().split('T')[0];
    if (nextStr <= todayStr) {
      setSelectedDate(nextStr);
    }
  };

  const isToday = selectedDate === todayStr;
  const displayTimeMins = isToday ? currentTimeMins : 1440;

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle Dock Mode
  useEffect(() => {
    if (isDocked && isSupported) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isDocked, isSupported, requestWakeLock, releaseWakeLock]);

  // Fetch selected date logs from local DB
  const logs = useLiveQuery(() => db.timeLogs.where('date').equals(selectedDate).toArray(), [selectedDate]);

  // Also fetch from server when date changes
  useEffect(() => {
    if (token && selectedDate) {
      fetchLogsByDate(selectedDate);
    }
  }, [token, selectedDate, fetchLogsByDate]);


  const { deepWorkMins, officeMins, activeStartTime } = useMemo(() => {
    if (!logs) return { deepWorkMins: 0, officeMins: 0, activeStartTime: null };

    let deep = 0;
    let office = 0;

    // Add current active timer duration to the calculation
    let currentStartTime: Date | null = null;

    logs.forEach(log => {
      if (!log.endTime) {
        currentStartTime = log.startTime;
      } else {
        const duration = (log.endTime.getTime() - log.startTime.getTime()) / 60000;
        if (log.type === 'deep-work') deep += duration;
        if (log.type === 'office') office += duration;
      }
    });

    if (isToday && currentStartTime && activeMode !== 'waste') {
      const start = currentStartTime as Date;
      const activeDuration = (new Date().getTime() - start.getTime()) / 60000;
      if (activeMode === 'deep-work') deep += activeDuration;
      if (activeMode === 'office') office += activeDuration;
    }

    return { deepWorkMins: deep, officeMins: office, activeStartTime: currentStartTime };
  }, [logs, currentTimeMins, activeMode, isToday]);

  // Waste time is simply the displayed time of day minus logged productive time
  const wasteMins = Math.max(0, displayTimeMins - (deepWorkMins + officeMins));

  if (!token || !user) {
    return <AuthScreen />;
  }

  return (

    <div className="min-h-screen bg-black text-white p-4 pb-20 overflow-y-auto font-mono selection:bg-white selection:text-black">
      <header className="flex flex-col mb-8 max-w-md mx-auto pt-4 border-b-2 border-white pb-4 gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl tracking-widest uppercase">TIMER_DEEP</h1>
              {!isOnline && (
                <span className="bg-red-600 text-white text-[8px] px-1 font-bold animate-pulse">OFFLINE_MODE</span>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em]">OPERATOR: {user.username}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={logout}
              className="p-2 border-2 border-white bg-black text-white hover:bg-white hover:text-black transition-none uppercase text-xs font-bold tracking-widest"
              title="Logout"
            >
              [EXIT]
            </button>
            {isSupported && (
              <button
                onClick={toggleDock}
                className={`p-2 border-2 transition-none rounded-none uppercase text-xs font-bold tracking-widest ${isDocked ? 'bg-white text-black border-white' : 'bg-black text-white border-white hover:bg-white hover:text-black'}`}
                title="Dockable Mode (Keeps screen awake)"
              >
                [DOCK_MODE]
              </button>
            )}
          </div>
        </div>


        {/* VIEW NAVIGATION */}
        <div className="flex w-full mt-2 font-bold uppercase tracking-widest text-sm">
          <button
            onClick={() => setCurrentView('TIMER')}
            className={`flex-1 p-2 border-2 transition-none ${currentView === 'TIMER' ? 'bg-white text-black border-white' : 'bg-black text-white border-white hover:bg-white hover:text-black'}`}
          >
            [ TIMER_HUD ]
          </button>
          <button
            onClick={() => setCurrentView('DASHBOARD')}
            className={`flex-1 p-2 border-2 transition-none border-l-0 ${currentView === 'DASHBOARD' ? 'bg-white text-black border-white' : 'bg-black text-white border-white hover:bg-white hover:text-black'}`}
          >
            [ DATA_LOGS ]
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto">
        {currentView === 'TIMER' && (
          <section className="mb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* The Tank */}
            <Tank
              deepWorkMins={deepWorkMins}
              officeMins={officeMins}
              wasteMins={wasteMins}
              totalMins={currentTimeMins}
              isDocked={isDocked}
              activeStartTime={activeStartTime}
              activeMode={activeMode}
            />

            {/* Controls */}
            <section className="mt-8">
              <Controls />
            </section>
          </section>
        )}

        {currentView === 'DASHBOARD' && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Date Navigator */}
            <div className="flex items-center justify-between mb-4 border-2 border-white p-2">
              <button onClick={handlePrevDay} className="px-4 py-2 hover:bg-white hover:text-black transition-none font-bold">{'<<'}</button>
              <span className="font-bold tracking-widest">{selectedDate === todayStr ? 'TODAY' : selectedDate}</span>
              <button
                onClick={handleNextDay}
                disabled={selectedDate === todayStr}
                className={`px-4 py-2 font-bold transition-none ${selectedDate === todayStr ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:text-black'}`}
              >
                {'>>'}
              </button>
            </div>

            {/* Battery Banks Section */}
            <DashboardBattery
              deepMins={deepWorkMins}
              officeMins={officeMins}
              wasteMins={wasteMins}
              totalMins={displayTimeMins}
            />

            {/* List of today's blocks */}
            <section className="border-t-2 border-white pt-8">
              <h2 className="uppercase font-bold mb-4 tracking-widest text-lg">{'>> SYSTEM_LOG'}</h2>
              <Timeline selectedDate={selectedDate} />
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
