import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.js";
import { Mail, KeyRound, Lock, ArrowLeft, Loader } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

const STEPS = { EMAIL: 1, OTP: 2, NEW_PASSWORD: 3, DONE: 4 };

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email");
    setIsLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password", { email });
      toast.success("OTP sent to your email!");
      setStep(STEPS.OTP);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error("Enter the 6-digit OTP");
    setIsLoading(true);
    try {
      await axiosInstance.post("/auth/verify-otp", { email, otp });
      toast.success("OTP verified!");
      setStep(STEPS.NEW_PASSWORD);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setIsLoading(true);
    try {
      await axiosInstance.post("/auth/reset-password", { email, otp, newPassword });
      toast.success("Password reset successfully!");
      setStep(STEPS.DONE);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  const stepLabels = ["Email", "Verify OTP", "New Password"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-md">
        <div className="bg-base-100 rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-2">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Lock className="size-7 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-base-content/60 text-sm mt-1">
              {step === STEPS.EMAIL && "Enter your email to receive an OTP"}
              {step === STEPS.OTP && "Enter the 6-digit code sent to your email"}
              {step === STEPS.NEW_PASSWORD && "Create a strong new password"}
              {step === STEPS.DONE && "You're all set!"}
            </p>
          </div>

          {/* Step progress */}
          {step !== STEPS.DONE && (
            <div className="flex items-center justify-center gap-2 mb-8">
              {stepLabels.map((label, i) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center size-7 rounded-full text-xs font-bold transition-all ${
                      i + 1 < step
                        ? "bg-primary text-primary-content"
                        : i + 1 === step
                        ? "bg-primary text-primary-content ring-2 ring-primary ring-offset-2 ring-offset-base-100"
                        : "bg-base-300 text-base-content/40"
                    }`}
                  >
                    {i + 1 < step ? "✓" : i + 1}
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`h-0.5 w-8 ${i + 1 < step ? "bg-primary" : "bg-base-300"}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Email */}
          {step === STEPS.EMAIL && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Email Address</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="input input-bordered w-full pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? <Loader className="size-5 animate-spin" /> : "Send OTP"}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === STEPS.OTP && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">6-Digit OTP</span></label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
                  <input
                    type="text"
                    placeholder="Enter OTP"
                    className="input input-bordered w-full pl-10 tracking-widest text-center text-xl font-bold"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    required
                  />
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/50">Sent to {email}</span>
                  <button
                    type="button"
                    className="label-text-alt link link-primary"
                    onClick={() => setStep(STEPS.EMAIL)}
                  >
                    Wrong email?
                  </button>
                </label>
              </div>
              <button className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? <Loader className="size-5 animate-spin" /> : "Verify OTP"}
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === STEPS.NEW_PASSWORD && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">New Password</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    className="input input-bordered w-full pl-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-medium">Confirm Password</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-base-content/40" />
                  <input
                    type="password"
                    placeholder="Repeat password"
                    className="input input-bordered w-full pl-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button className="btn btn-primary w-full" disabled={isLoading}>
                {isLoading ? <Loader className="size-5 animate-spin" /> : "Reset Password"}
              </button>
            </form>
          )}

          {/* Step 4: Done */}
          {step === STEPS.DONE && (
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <p className="text-base-content/70">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <Link to="/login" className="btn btn-primary w-full">
                Go to Login
              </Link>
            </div>
          )}

          {step !== STEPS.DONE && (
            <div className="text-center mt-6">
              <Link to="/login" className="text-sm text-base-content/60 hover:text-primary flex items-center justify-center gap-1">
                <ArrowLeft className="size-4" /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
