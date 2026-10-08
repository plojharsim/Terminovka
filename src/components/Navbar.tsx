"use client";

import React, { useState, useRef, useEffect } from "react";
import { StudentGroup, UserSession } from "@/types";
import { useTheme } from "@/components/ThemeProvider";
import {
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  Clock,
  Plus,
  Settings,
  LogIn,
  LogOut,
  CalendarCheck,
  Moon,
  Sun,
  ChevronDown,
  Menu,
  X,
  Users,
} from "lucide-react";

interface NavbarProps {
  currentTab: "dashboard" | "list" | "calendar" | "timetable";
  onTabChange: (tab: "dashboard" | "list" | "calendar" | "timetable") => void;
  currentUser: UserSession | null;
  groups: StudentGroup[];
  selectedGroupIds: string[];
  onOpenGroupModal: () => void;
  onOpenLogin: () => void;
  onOpenCreateEvent: () => void;
  onOpenIcalModal: () => void;
  onOpenAdminPanel: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  groups,
  selectedGroupIds,
  onOpenGroupModal,
  onOpenLogin,
  onOpenCreateEvent,
  onOpenIcalModal,
  onOpenAdminPanel,
  onLogout,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0D0F26] border-b border-[#1E2348] text-white shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Left: Mobile Menu Toggle & Brand Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Mobile Hamburger button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg md:hidden hover:bg-white/5 transition"
              title="Menu"
              aria-label="Otevřít menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Clean Brand Title with App Icon */}
            <div
              className="cursor-pointer flex items-center space-x-2.5 select-none group"
              onClick={() => onTabChange("dashboard")}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1C2258] to-[#0A0C1E] border border-[#DDA300]/40 p-1 flex items-center justify-center shadow-xs group-hover:border-[#DDA300] transition">
                <svg
                  viewBox="0 0 40 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-6 text-[#DDA300]"
                >
                  <path
                    d="M20 2L37 7V22C37 32.5 29.5 41.5 20 46C10.5 41.5 3 32.5 3 22V7L20 2Z"
                    fill="#0D0F26"
                    stroke="#DDA300"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M13 23L18 28L28 17"
                    stroke="#DDA300"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="font-extrabold text-white text-base sm:text-lg tracking-tight group-hover:text-[#DDA300] transition-colors whitespace-nowrap">
                Termínovka
              </span>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 shrink min-w-0">
            <button
              onClick={() => onTabChange("dashboard")}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition duration-150 flex items-center space-x-1.5 whitespace-nowrap ${
                currentTab === "dashboard"
                  ? "text-white bg-white/10 font-bold border-b-2 border-[#DDA300]"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#DDA300] shrink-0" />
              <span>Přehled</span>
            </button>
            <button
              onClick={() => onTabChange("list")}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition duration-150 flex items-center space-x-1.5 whitespace-nowrap ${
                currentTab === "list"
                  ? "text-white bg-white/10 font-bold border-b-2 border-[#DDA300]"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <ListTodo className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#DDA300] shrink-0" />
              <span>Agenda</span>
            </button>
            <button
              onClick={() => onTabChange("calendar")}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition duration-150 flex items-center space-x-1.5 whitespace-nowrap ${
                currentTab === "calendar"
                  ? "text-white bg-white/10 font-bold border-b-2 border-[#DDA300]"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#DDA300] shrink-0" />
              <span>Kalendář</span>
            </button>
            <button
              onClick={() => onTabChange("timetable")}
              className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition duration-150 flex items-center space-x-1.5 whitespace-nowrap ${
                currentTab === "timetable"
                  ? "text-white bg-white/10 font-bold border-b-2 border-[#DDA300]"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#DDA300] shrink-0" />
              <span>Rozvrh hodin</span>
            </button>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            {/* Group Selector Button (Opens multi-group modal) */}
            {groups.length > 1 && (
              <button
                type="button"
                onClick={onOpenGroupModal}
                className="inline-flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition active:scale-[0.98] whitespace-nowrap"
                title="Nastavit mé studijní skupiny (jazyky, tělocvik...)"
              >
                <Users className="w-3.5 h-3.5 text-[#DDA300] shrink-0" />
                <span className="hidden xl:inline text-slate-300">Skupiny:</span>
                <span className="font-bold text-[#DDA300]">
                  {selectedGroupIds.length === 0
                    ? "Třída"
                    : selectedGroupIds.length === groups.filter((g) => !g.isDefaultAll).length
                    ? "Vše"
                    : `${selectedGroupIds.length} ${selectedGroupIds.length === 1 ? "sk." : "sk."}`}
                </span>
              </button>
            )}

            {/* iCal Subscription Button */}
            <button
              onClick={onOpenIcalModal}
              title="Synchronizovat s mobilem (iCal)"
              className="hidden xl:inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition whitespace-nowrap"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-[#DDA300] shrink-0" />
              <span>iCal</span>
            </button>

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition shrink-0"
              aria-label="Přepnout motiv"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-[#DDA300]" />
              ) : (
                <Moon className="w-4 h-4 text-slate-300" />
              )}
            </button>

            {/* When Logged In: Add Event & User Profile Dropdown */}
            {currentUser ? (
              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                {/* Primary Add Event Button */}
                <button
                  onClick={onOpenCreateEvent}
                  className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold text-[#0D0F26] bg-[#FFFFFF] hover:bg-[#F0F0F0] rounded-lg transition shadow-xs active:scale-[0.98] whitespace-nowrap"
                >
                  <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
                  <span className="hidden sm:inline">Přidat termín</span>
                  <span className="sm:hidden">Nový</span>
                </button>

                {/* User Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-1.5 sm:space-x-2 p-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition text-xs sm:text-sm max-w-[140px] sm:max-w-[190px]"
                  >
                    <div className="w-6 h-6 rounded-md bg-[#DDA300] text-[#0D0F26] flex items-center justify-center font-bold text-[11px] shrink-0">
                      {currentUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <span className="hidden sm:inline font-semibold text-white truncate text-left">
                      {currentUser.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#141738] border border-[#222752] shadow-2xl p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 z-50">
                      <div className="p-2.5 border-b border-[#222752]">
                        <div className="font-bold text-white truncate text-sm">
                          {currentUser.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">
                          {currentUser.email}
                        </div>
                        <div className="mt-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              currentUser.role === "ADMIN"
                                ? "bg-[#DDA300]/20 text-[#DDA300]"
                                : "bg-white/15 text-white"
                            }`}
                          >
                            {currentUser.role === "ADMIN" ? "Správce (Admin)" : "Editor"}
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        {currentUser.role === "ADMIN" && (
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              onOpenAdminPanel();
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-lg flex items-center space-x-2 text-slate-200 hover:text-white hover:bg-white/10 transition font-medium"
                          >
                            <Settings className="w-3.5 h-3.5 text-[#DDA300]" />
                            <span>Správa třídy & rozvrhu</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onOpenIcalModal();
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg flex items-center space-x-2 text-slate-200 hover:text-white hover:bg-white/10 transition font-medium xl:hidden"
                        >
                          <CalendarCheck className="w-3.5 h-3.5 text-[#DDA300]" />
                          <span>Odebírat iCal</span>
                        </button>
                      </div>

                      <div className="pt-1 border-t border-[#222752]">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg flex items-center space-x-2 text-rose-400 hover:bg-rose-500/10 transition font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Odhlásit se</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Public: Login button */
              <button
                onClick={onOpenLogin}
                className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-semibold text-white hover:text-[#DDA300] transition whitespace-nowrap"
              >
                <LogIn className="w-4 h-4 text-[#DDA300] shrink-0" />
                <span>Přihlášení</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#1E2348] space-y-1">
            <button
              onClick={() => {
                onTabChange("dashboard");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                currentTab === "dashboard" ? "bg-white/10 text-white font-bold" : "text-slate-300"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#DDA300]" />
              <span>Přehled</span>
            </button>
            <button
              onClick={() => {
                onTabChange("list");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                currentTab === "list" ? "bg-white/10 text-white font-bold" : "text-slate-300"
              }`}
            >
              <ListTodo className="w-4 h-4 text-[#DDA300]" />
              <span>Agenda</span>
            </button>
            <button
              onClick={() => {
                onTabChange("calendar");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                currentTab === "calendar" ? "bg-white/10 text-white font-bold" : "text-slate-300"
              }`}
            >
              <CalendarDays className="w-4 h-4 text-[#DDA300]" />
              <span>Kalendář</span>
            </button>
            <button
              onClick={() => {
                onTabChange("timetable");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                currentTab === "timetable" ? "bg-white/10 text-white font-bold" : "text-slate-300"
              }`}
            >
              <Clock className="w-4 h-4 text-[#DDA300]" />
              <span>Rozvrh hodin</span>
            </button>
            <button
              onClick={() => {
                onOpenIcalModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 text-slate-300"
            >
              <CalendarCheck className="w-4 h-4 text-[#DDA300]" />
              <span>Odebírat iCal do mobilu</span>
            </button>

            {groups.length > 1 && (
              <div className="pt-2 px-1 pb-1 border-t border-[#1E2348]">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenGroupModal();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-left text-xs font-semibold text-white transition"
                >
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[#DDA300]" />
                    <span>Moje studijní skupiny</span>
                  </div>
                  <span className="text-[#DDA300] font-bold">
                    {selectedGroupIds.length === 0
                      ? "Jen třída"
                      : selectedGroupIds.length === groups.filter((g) => !g.isDefaultAll).length
                      ? "Všechny"
                      : `${selectedGroupIds.length} vybr.`}
                    {" →"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
