import React, { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AdminPage from "./pages/AdminPage";

import { useAuthStore } from "./store/useAuthStore.js";
import { userThemeStore } from "./store/useThemeStore.js";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
  >
    {children}
  </motion.div>
);

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { theme } = userThemeStore();
  const location = useLocation();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
      
    );
  }

  return (
    <div data-theme={theme}>
      <NavBar />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <PageWrapper>{authUser ? <HomePage /> : <Navigate to="/login" />}</PageWrapper>
          } />
          <Route path="/signup" element={
            <PageWrapper>{!authUser ? <SignUpPage /> : <Navigate to="/" />}</PageWrapper>
          } />
          <Route path="/login" element={
            <PageWrapper>{!authUser ? <LoginPage /> : <Navigate to="/" />}</PageWrapper>
          } />
          <Route path="/forgot-password" element={
            <PageWrapper>{!authUser ? <ForgotPasswordPage /> : <Navigate to="/" />}</PageWrapper>
          } />
          <Route path="/settings" element={<PageWrapper><SettingsPage /></PageWrapper>} />
          <Route path="/profile" element={
            <PageWrapper>{authUser ? <ProfilePage /> : <Navigate to="/login" />}</PageWrapper>
          } />
          <Route path="/user/:userId" element={
            <PageWrapper>{authUser ? <ProfilePage /> : <Navigate to="/login" />}</PageWrapper>
          } />
          <Route path="/admin" element={
            <PageWrapper>
              {authUser?.role === "admin" ? <AdminPage /> : <Navigate to="/" />}
            </PageWrapper>
          } />
        </Routes>
      </AnimatePresence>

      <Toaster />
    </div>
  );
};

export default App;
