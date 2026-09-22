import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
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
import { primaryNav, secondaryNav, allNav } from "./nav.js";
import { cn } from "./lib/utils.js";
import ThemeToggle from "./components/ThemeToggle.js";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from "./components/ui/sheet.js";

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"
  );

const bottomTabClass = ({ isActive }: { isActive: boolean }) =>
  cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-xs", isActive ? "text-primary" : "text-muted-foreground");

function MainApp() {
  useEffect(() => {
    const babyId = getActiveBabyId();
    if (babyId) connectSync(babyId);
  }, []);

  return (
    <BrowserRouter>
      <header className="hidden items-center justify-between border-b border-border px-4 py-3 md:flex">
        <span className="text-lg font-semibold">BabyMon</span>
        <nav aria-label="Main navigation" className="flex items-center gap-1">
          {allNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={desktopLinkClass} end={item.to === "/"}>
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
          <ThemeToggle />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4 md:pb-8">
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
      </main>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primaryNav.map((item) => (
          <NavLink key={item.to} to={item.to} className={bottomTabClass} end={item.to === "/"}>
            <item.icon className="size-5" />
            {item.label}
          </NavLink>
        ))}
        <Sheet>
          <SheetTrigger className="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground" aria-label="More pages">
            <MoreHorizontal className="size-5" />
            More
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>More</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1">
              {secondaryNav.map((item) => (
                <SheetClose asChild key={item.to}>
                  <Link to={item.to} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent">
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">Theme</span>
                <ThemeToggle />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
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
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <Routes>
          <Route path="/join/:code" element={<JoinInvite />} />
          <Route
            path="*"
            element={
              needsSetup === null ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : needsSetup ? (
                <Setup />
              ) : (
                <p className="text-muted-foreground">
                  This household is already set up. Ask a caregiver for an invite link to join.
                </p>
              )
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return isJoined() ? <MainApp /> : <Onboarding />;
}
