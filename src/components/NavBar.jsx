import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../store/useAuthStore.js";
import { Link, useLocation } from "react-router-dom";
import {
  MessageSquare, Settings, User, LogOut, ShieldCheck,
  Search, Bell, BellOff, Bookmark,
} from "lucide-react";
import SearchModal from "../Modals/SearchModal.jsx";
import BookmarksPanel from "./BookmarksPanel.jsx";
import toast from "react-hot-toast";

const DND_KEY = "chitchatz_dnd";

const NavBar = () => {
  const { authUser, logout } = useAuthStore();
  const { pathname } = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [dnd, setDnd] = useState(() => localStorage.getItem(DND_KEY) === "true");

  const isActive = (to) => pathname === to || (to !== "/" && pathname.startsWith(to));

  // Expose DND globally so notification code can read it
  useEffect(() => {
    window.__chitchatzDND = dnd;
    localStorage.setItem(DND_KEY, dnd);
  }, [dnd]);

  // Cmd+K global shortcut — only when logged in
  useEffect(() => {
    if (!authUser) return;
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [authUser]);

  return (
    <>
      <header className="bg-base-100/70 border-b border-base-300/60 fixed w-full top-0 z-40 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-14">
          <div className="flex items-center justify-between h-full">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.4 }}
                className="size-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
              >
                <MessageSquare className="size-4 text-primary" />
              </motion.div>
              <span className="text-base font-bold tracking-tight hidden sm:block">Chitchatz</span>
            </Link>

            {/* Nav actions */}
            <div className="flex items-center gap-1">
              <NavLink to="/settings" isActive={isActive("/settings")}>
                <Settings className="size-4" />
                <span className="hidden sm:inline">Settings</span>
              </NavLink>

              {authUser && (
                <>
                  {/* Search */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSearchOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-base-content/60 hover:text-base-content hover:bg-base-200 transition-all"
                    title="Search messages (Ctrl+K)"
                  >
                    <Search className="size-4" />
                    <span className="hidden sm:inline">Search</span>
                    <kbd className="kbd kbd-xs hidden md:inline-flex ml-0.5">⌘K</kbd>
                  </motion.button>

                  {authUser.role === "admin" && (
                    <NavLink to="/admin" isActive={isActive("/admin")}>
                      <ShieldCheck className="size-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </NavLink>
                  )}

                  {/* Bookmarks */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setBookmarksOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-base-content/60 hover:text-base-content hover:bg-base-200 transition-all"
                    title="Saved messages"
                  >
                    <Bookmark className="size-4" />
                    <span className="hidden sm:inline">Saved</span>
                  </motion.button>

                  {/* DND Toggle */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                    const next = !dnd;
                    setDnd(next);
                    toast(next ? "🔕 Do Not Disturb ON — notifications muted" : "🔔 Notifications enabled", {
                      duration: 2500,
                      position: "bottom-center",
                    });
                  }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      dnd
                        ? "bg-warning/15 text-warning hover:bg-warning/25"
                        : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                    }`}
                    title={dnd ? "Do Not Disturb ON — click to disable" : "Enable Do Not Disturb"}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {dnd ? (
                        <motion.span
                          key="dnd-on"
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.7, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 24 }}
                        >
                          <BellOff className="size-4" />
                        </motion.span>
                      ) : (
                        <motion.span
                          key="dnd-off"
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.7, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 24 }}
                        >
                          <Bell className="size-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <span className="hidden sm:inline">{dnd ? "DND" : "Quiet"}</span>
                  </motion.button>

                  <NavLink to="/profile" isActive={isActive("/profile")}>
                    {authUser.profilePic ? (
                      <img
                        src={authUser.profilePic}
                        alt="avatar"
                        className="size-5 rounded-full object-cover"
                      />
                    ) : (
                      <User className="size-4" />
                    )}
                    <span className="hidden sm:inline">Profile</span>
                  </NavLink>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="btn btn-sm btn-ghost gap-1.5 text-error hover:bg-error/10 rounded-xl"
                    onClick={logout}
                  >
                    <LogOut className="size-3.5" />
                    <span className="hidden sm:inline text-xs">Logout</span>
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <BookmarksPanel isOpen={bookmarksOpen} onClose={() => setBookmarksOpen(false)} />
    </>
  );
};

const NavLink = ({ to, isActive, children }) => (
  <Link to={to}>
    <motion.span
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? "bg-primary text-primary-content shadow-sm"
          : "text-base-content/60 hover:text-base-content hover:bg-base-200"
      }`}
    >
      {children}
    </motion.span>
  </Link>
);

export default NavBar;
