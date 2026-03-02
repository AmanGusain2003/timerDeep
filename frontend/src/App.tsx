import { useEffect, useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/index.js';
import { useTimerStore } from './store/useTimerStore.js';
import { useWakeLock } from './hooks/useWakeLock.js';
import { useSync } from './hooks/useSync.js';
import { addDaysToDateString, toLocalDateString } from './utils/date.js';
import { Tank } from './components/Tank.js';
import { Controls } from './components/Controls.js';
import { Timeline } from './components/Timeline.js';
import { DashboardBattery } from './components/DashboardBattery.js';
import { AuthScreen } from './components/AuthScreen.js';


function App() {
  const { isDocked, toggleDock, activeMode, activeLogId, token, user, logout, rehydrateActiveLog, endActiveLogAt, normalizeLogsAcrossMidnight, repairMalformedLogs, cleanupDuplicateClosedLogs, closeStaleOpenLogs } = useTimerStore();

  const { isSupported, requestWakeLock, releaseWakeLock } = useWakeLock();
  const { fetchLogsByDate, syncLogs, syncPhase, lastSyncAt, lastSyncError } = useSync();
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
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [presenceVisible, setPresenceVisible] = useState(false);
  const [presencePromptAt, setPresencePromptAt] = useState<number | null>(null);
  const [lastPresenceConfirmAt, setLastPresenceConfirmAt] = useState<number | null>(null);
  const presencePromptTimeoutRef = useRef<number | null>(null);
  const presenceGraceTimeoutRef = useRef<number | null>(null);

  const todayStr = toLocalDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const handlePrevDay = () => {
    setSelectedDate((prev) => addDaysToDateString(prev, -1));
  };

  const handleNextDay = () => {
    const nextStr = addDaysToDateString(selectedDate, 1);
    if (nextStr <= todayStr) setSelectedDate(nextStr);
  };

  const isToday = selectedDate === todayStr;
  const displayTimeMins = isToday ? currentTimeMins : 1440;

  const PRESENCE_INTERVAL_MS = 60 * 60 * 1000;
  const PRESENCE_GRACE_MS = 2 * 60 * 1000;

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

  const pendingSyncCount = useLiveQuery(() => db.timeLogs.filter((log) => !log.synced && !!log.endTime).count(), []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!token) {
        if (!cancelled) setIsBootstrapping(false);
        return;
      }

      await repairMalformedLogs();
      await closeStaleOpenLogs();
      await normalizeLogsAcrossMidnight();
      await cleanupDuplicateClosedLogs();
      await rehydrateActiveLog();

      if (!cancelled) setIsBootstrapping(false);
    };

    setIsBootstrapping(true);
    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token, repairMalformedLogs, closeStaleOpenLogs, normalizeLogsAcrossMidnight, cleanupDuplicateClosedLogs, rehydrateActiveLog]);

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
    if (!token || !selectedDate || isBootstrapping) return;
    const run = async () => {
      if (selectedDate === todayStr) {
        await syncLogs();
      }
      await fetchLogsByDate(selectedDate);
    };
    run();
  }, [token, selectedDate, todayStr, fetchLogsByDate, syncLogs, isBootstrapping]);


  const { deepWorkMins, officeMins, activeStartTime }: { deepWorkMins: number; officeMins: number; activeStartTime: Date | null } = useMemo(() => {
    if (!logs || isBootstrapping) return { deepWorkMins: 0, officeMins: 0, activeStartTime: null };

    let deep = 0;
    let office = 0;

    let currentStartTime: Date | null = null;

    logs.forEach(log => {
      // If the log is closed, always count its duration
      if (log.endTime) {
        const duration = (log.endTime.getTime() - log.startTime.getTime()) / 60000;
        if (log.type === 'deep-work') deep += duration;
        if (log.type === 'office') office += duration;
      }
      // If it is the true active log currently running
      else if (log.id === activeLogId && activeMode !== 'waste') {
        currentStartTime = log.startTime;
      }
      // Note: If log.endTime is undefined BUT it's NOT the activeLogId, it's an orphaned log 
      // from a race condition or crash. We ignore its ongoing tick to prevent double-counting.
    });

    if (isToday && currentStartTime && activeMode !== 'waste') {
      const start = currentStartTime as Date;
      const activeDuration = (new Date().getTime() - start.getTime()) / 60000;
      if (activeMode === 'deep-work') deep += activeDuration;
      if (activeMode === 'office') office += activeDuration;
    }

    return { deepWorkMins: deep, officeMins: office, activeStartTime: currentStartTime };
  }, [logs, currentTimeMins, activeMode, isToday, activeLogId, isBootstrapping]);

  const activeStartMs = activeStartTime ? (activeStartTime as Date).getTime() : null;
  const syncLabel = !isOnline
    ? 'OFFLINE'
    : syncPhase === 'syncing'
      ? 'SYNCING'
      : syncPhase === 'fetching'
        ? 'FETCHING'
        : syncPhase === 'error'
          ? 'SYNC_ERROR'
          : syncPhase === 'idle'
            ? 'IDLE'
            : 'SYNCED';
  const formattedSyncTime = lastSyncAt
    ? new Date(lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  const clearPresenceTimers = () => {
    if (presencePromptTimeoutRef.current) {
      clearTimeout(presencePromptTimeoutRef.current);
      presencePromptTimeoutRef.current = null;
    }
    if (presenceGraceTimeoutRef.current) {
      clearTimeout(presenceGraceTimeoutRef.current);
      presenceGraceTimeoutRef.current = null;
    }
  };

  // Schedule hourly presence prompt while deep/office session is active
  useEffect(() => {
    if (!activeLogId || activeMode === 'waste' || !activeStartMs) {
      setPresenceVisible(false);
      setPresencePromptAt(null);
      setLastPresenceConfirmAt(null);
      clearPresenceTimers();
      return;
    }

    if (presenceVisible) return;

    const base = lastPresenceConfirmAt ?? activeStartMs;
    const nextPromptAt = base + PRESENCE_INTERVAL_MS;
    const delay = Math.max(0, nextPromptAt - Date.now());

    clearPresenceTimers();
    presencePromptTimeoutRef.current = window.setTimeout(() => {
      presencePromptTimeoutRef.current = null;
      setPresencePromptAt(nextPromptAt);
      setPresenceVisible(true);
    }, delay);

    return () => {
      clearPresenceTimers();
    };
  }, [activeLogId, activeMode, activeStartMs, lastPresenceConfirmAt, presenceVisible]);

  // Grace window: if not confirmed, stop active log at prompt time
  useEffect(() => {
    if (!presenceVisible || !presencePromptAt || !activeLogId || activeMode === 'waste') return;

    if (presenceGraceTimeoutRef.current) {
      clearTimeout(presenceGraceTimeoutRef.current);
      presenceGraceTimeoutRef.current = null;
    }

    presenceGraceTimeoutRef.current = window.setTimeout(async () => {
      const endAt = new Date(presencePromptAt);
      await endActiveLogAt(endAt);
      setPresenceVisible(false);
      setPresencePromptAt(null);
      setLastPresenceConfirmAt(null);
      clearPresenceTimers();
    }, PRESENCE_GRACE_MS);

    return () => {
      if (presenceGraceTimeoutRef.current) {
        clearTimeout(presenceGraceTimeoutRef.current);
        presenceGraceTimeoutRef.current = null;
      }
    };
  }, [presenceVisible, presencePromptAt, activeLogId, activeMode, endActiveLogAt]);

  const handlePresenceConfirm = () => {
    setPresenceVisible(false);
    setPresencePromptAt(null);
    setLastPresenceConfirmAt(Date.now());
    clearPresenceTimers();
  };

  const handlePresenceStopNow = async () => {
    await endActiveLogAt(new Date());
    setPresenceVisible(false);
    setPresencePromptAt(null);
    setLastPresenceConfirmAt(null);
    clearPresenceTimers();
  };



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

        <div className="flex items-center justify-between border border-white/40 px-2 py-2 text-[10px] uppercase tracking-[0.2em]">
          <span className={`${syncPhase === 'error' ? 'text-red-400' : syncPhase === 'synced' ? 'text-emerald-400' : 'text-zinc-300'}`}>
            Sync: {syncLabel}
          </span>
          <span className="text-zinc-500">
            {pendingSyncCount ?? 0} pending{formattedSyncTime ? ` // ${formattedSyncTime}` : ''}
          </span>
        </div>
        {lastSyncError && isOnline && (
          <div className="text-[10px] uppercase tracking-[0.2em] text-red-400">
            {lastSyncError}
          </div>
        )}


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
              label={selectedDate === todayStr ? 'TODAY' : selectedDate}
            />

            {/* List of today's blocks */}
            <section className="border-t-2 border-white pt-8">
              <div className="mb-4 border border-white/40 px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                {syncLabel} // {pendingSyncCount ?? 0} pending records{formattedSyncTime ? ` // last success ${formattedSyncTime}` : ''}
              </div>
              <h2 className="uppercase font-bold mb-4 tracking-widest text-lg">{'>> SYSTEM_LOG'}</h2>
              <Timeline selectedDate={selectedDate} />
            </section>
          </section>
        )}
      </main>

      {presenceVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm border-2 border-white bg-black p-4">
            <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Presence Check</div>
            <h2 className="text-lg font-bold uppercase tracking-widest mb-2">STILL DEEP WORKING?</h2>
            <p className="text-xs text-zinc-300 mb-4">
              Confirm within 2 minutes or we&apos;ll switch to FREE_TIME from{' '}
              {presencePromptAt ? new Date(presencePromptAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'now'}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePresenceConfirm}
                className="flex-1 border-2 border-white bg-white text-black py-2 text-xs font-bold uppercase tracking-widest"
              >
                [ I&apos;M HERE ]
              </button>
              <button
                onClick={handlePresenceStopNow}
                className="flex-1 border-2 border-white bg-black text-white py-2 text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-none"
              >
                [ FREE_TIME ]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
