import React from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, Settings, User, LogOut, ShieldCheck } from "lucide-react";

const NavBar = () => {
  const { authUser, logout } = useAuthStore();
  const { pathname } = useLocation();

  const navLink = (to) =>
    `btn btn-sm gap-2 transition-colors ${pathname === to ? "btn-primary" : "btn-ghost"}`;

  return (
    <header className="bg-base-100/80 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Chitchatz</h1>
          </Link>

          {/* Nav actions */}
          <div className="flex items-center gap-1.5">
            <Link to="/settings" className={navLink("/settings")}>
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            {authUser && (
              <>
                {authUser.role === "admin" && (
                  <Link to="/admin" className={navLink("/admin")}>
                    <ShieldCheck className="size-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                <Link to="/profile" className={navLink("/profile")}>
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
                </Link>

                <button
                  className="btn btn-sm btn-ghost gap-2 text-error hover:bg-error/10"
                  onClick={logout}
                >
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default NavBar;
