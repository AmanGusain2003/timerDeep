# TimerDeep - Brutalist UI Correction Plan

## Goal Description
Correct the brutalist UI implementation based on a rigorous multi-agent design review. The previous execution failed to deliver two critical components:
1. **The Navigation Paradigm:** There was no way to switch to the Dashboard. We will implement a massive, unmissable brutalist "View Switcher" at the top of the app.
2. **The "Always Ticking" State Machine:** The user specified that time should "tick by default as free time/waste time". We will replace the standard Start/Stop buttons with a unified 3-way toggle switch. Waste time will explicitly tick as the default state.

## User Review Required
> [!IMPORTANT]
> Please review this corrected plan. Once approved, I will implement the 3-state switcher, the isolated digital clock, and the global navigation view switcher.

## Proposed Changes

---

### Global Navigation & View Routing
We must separate the Timer (Terminal HUD) and Dashboard (Data Logs) views with a highly visible brutalist toggle.
#### [MODIFY] `frontend/src/App.tsx`
- Introduce a high-level state: `const [currentView, setCurrentView] = useState<'TIMER' | 'DASHBOARD'>('TIMER')`.
- Create a massive, stark navigation header: `VIEW :: [ TIMER_HUD ] / [ DATA_LOGS ]`.
- Conditionally render the Tank/Controls vs. the Battery Banks/Timeline based on this view state.

---

### The Brutalist Mode Switcher
Replace the action buttons with a strict 3-way radio toggle to enforce the zero-sum time concept.
#### [MODIFY] `frontend/src/components/Controls.tsx`
- Remove the `Start/Stop` button concept entirely.
- Build a 3-segment explicit switcher: `[ DEEP_WORK ]`, `[ OFFICE ]`, `[ FREE_TIME ]`.
- If the user clicks `[ FREE_TIME ]`, the app stops any active database timer. Because the App calculates `wasteMins = CurrentTime - (Deep + Office)`, making "Free Time" active implicitly causes it to tick up in real-time.
- The active segment inverses its colors (e.g., Black text on V-Cyan background for Deep Work) to serve as a massive visual indicator of what is currently consuming the day's seconds.

---

### The Terminal UI Component (Hero Display)
Extract the running time out of the buttons and build a massive, central digital clock to fulfill the "HUD Scanner" aesthetic.
#### [NEW] `frontend/src/components/DigitalClock.tsx`
- A large, monospace digital readout showing `> 00:14:35_`.
- Takes the `activeMode` and `activeStartTime` as props and runs its own `setInterval` to prevent the entire `App.tsx` and Tank canvas from thrashing every second.
- Conditionally flashes the active mode color.

---

### HUD Layout Updates
Add technical detailing to the Tank to sell the Brutalist Data concept.
#### [MODIFY] `frontend/src/components/Tank.tsx`
- Mount the new `DigitalClock` directly inside or above the Tank.
- Add "fake" technical readouts to the corners of the tank border (e.g., `SYS: SECURE`, `VOLT: 14.2`) for flavor.
- Ensure strict height clamping so if total minutes exceed 1440, the layout flexboxes do not break.

---

### Dashboard "Battery" UI
Implement the exact battery visual from the selected "Monospace Grid / Data Brutalism" mockup.
#### [NEW] `frontend/src/components/Dashboard.tsx`
- Build a single, massive horizontal "Battery" bar representing the day's time.
- Use the site's exact CSS variables (Cyan for Deep Work, Green for Office, Grey for Waste).
- Display the percentage ratios directly inside the colored battery segments.
- Below the battery, implement the exact statistical list shown in the mockup, matching the styling (1px borders, uppercase monospace) but substituting in real runtime stats (Total Mins, Deep Mins, Office Mins, etc.).

## Verification Plan

### Manual Verification
1. Launch `bun dev` and open the app.
2. **Navigation Check:** Ensure the massive `VIEW :: [ TIMER_HUD ] / [ DATA_LOGS ]` header is visible and properly swaps the page content.
3. **Default State Check:** Verify that on initial load, the Switcher indicates `[ FREE_TIME ]` is active, and the massive digital clock is ticking.
4. **Switcher Logic:** Click `[ DEEP_WORK ]`. Verify the Switcher immediately highlights Deep Work in cyan, logs "Free Time", and the Digital Clock resets to tick for Deep Work.
5. **Dashboard Battery:** Navigate to the Dashboard. Verify the horizontal battery accurately represents the proportions of logs, and the strict stats list mirrors the provided concept mockup perfectly.
