import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import BabyStatus from "./pages/BabyStatus.js";
import Timeline from "./pages/Timeline.js";
import LogEvent from "./pages/LogEvent.js";
import InviteCaregiver from "./pages/InviteCaregiver.js";
import JoinInvite from "./pages/JoinInvite.js";
import ManageCaregivers from "./pages/ManageCaregivers.js";
import Growth from "./pages/Growth.js";
import Milestones from "./pages/Milestones.js";
import Reminders from "./pages/Reminders.js";
import Stats from "./pages/Stats.js";
import Setup from "./pages/Setup.js";
import { api, isJoined, getActiveBabyId } from "./data/apiClient.js";
import { connectSync } from "./data/syncClient.js";

function MainApp() {
  useEffect(() => {
    const babyId = getActiveBabyId();
    if (babyId) connectSync(babyId);
  }, []);

  return (
    <BrowserRouter>
      <nav aria-label="Main navigation">
        <Link to="/">Status</Link>
        <Link to="/timeline">Timeline</Link>
        <Link to="/log">Log Event</Link>
        <Link to="/stats">Stats</Link>
        <Link to="/growth">Growth</Link>
        <Link to="/milestones">Milestones</Link>
        <Link to="/reminders">Reminders</Link>
        <Link to="/invite">Invite</Link>
        <Link to="/caregivers">Caregivers</Link>
      </nav>
      <Routes>
        <Route path="/" element={<BabyStatus />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/log" element={<LogEvent />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/growth" element={<Growth />} />
        <Route path="/milestones" element={<Milestones />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/invite" element={<InviteCaregiver />} />
        <Route path="/caregivers" element={<ManageCaregivers />} />
        <Route path="/join/:code" element={<JoinInvite />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/** Gate: an unjoined device can only reach /join/:code, or first-run Setup on a fresh instance. */
function Onboarding() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const onJoinPath = location.pathname.startsWith("/join/");

  useEffect(() => {
    if (!onJoinPath) {
      api.get<{ needsSetup: boolean }>("/setup/status").then((r) => setNeedsSetup(r.needsSetup));
    }
  }, [onJoinPath]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/join/:code" element={<JoinInvite />} />
        <Route
          path="*"
          element={
            needsSetup === null ? (
              <p>Loading…</p>
            ) : needsSetup ? (
              <Setup />
            ) : (
              <p>This household is already set up. Ask a caregiver for an invite link to join.</p>
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return isJoined() ? <MainApp /> : <Onboarding />;
}
