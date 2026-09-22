import { Activity, History, CirclePlus, BarChart3, TrendingUp, Flag, Bell, UserPlus, Users, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Most-used destinations — shown as the mobile bottom tab bar. */
export const primaryNav: NavItem[] = [
  { to: "/", label: "Status", icon: Activity },
  { to: "/log", label: "Log", icon: CirclePlus },
  { to: "/timeline", label: "Timeline", icon: History },
  { to: "/stats", label: "Stats", icon: BarChart3 }
];

/** Less-frequent destinations — tucked behind the mobile "More" sheet. */
export const secondaryNav: NavItem[] = [
  { to: "/growth", label: "Growth", icon: TrendingUp },
  { to: "/milestones", label: "Milestones", icon: Flag },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/invite", label: "Invite", icon: UserPlus },
  { to: "/caregivers", label: "Caregivers", icon: Users }
];

export const allNav: NavItem[] = [...primaryNav, ...secondaryNav];
