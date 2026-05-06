import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useParams, useNavigate } from "react-router-dom";
import {
  Camera, Mail, User, AtSign, Phone, FileText,
  Smile, Save, Loader, ArrowLeft, Calendar, Shield, Trash2
} from "lucide-react";
import ImageModal from "../Modals/ImageModal.jsx";
import { motion } from "framer-motion";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

const MOODS = [
  { value: "none",    label: "No Mood",  emoji: "😶" },
  { value: "working", label: "Working",  emoji: "💻" },
  { value: "gaming",  label: "Gaming",   emoji: "🎮" },
  { value: "vibing",  label: "Vibing",   emoji: "🎵" },
];

const ProfilePage = () => {
  const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
  const { userId } = useParams();
  const navigate = useNavigate();

  const isOwnProfile = !userId || userId === authUser?._id;

  // Public profile state
  const [publicUser, setPublicUser] = useState(null);
  const [loadingPublic, setLoadingPublic] = useState(false);

  // Edit state (own profile)
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    fullName:   authUser?.fullName   || "",
    username:   authUser?.username   || "",
    bio:        authUser?.bio        || "",
    phone:      authUser?.phone      || "",
    statusText: authUser?.statusText || "",
    mood:       authUser?.mood       || "none",
  });

  // Load public profile if viewing someone else
  useState(() => {
    if (!isOwnProfile && userId) {
      setLoadingPublic(true);
      axiosInstance
        .get(`/auth/user/${userId}`)
        .then((res) => setPublicUser(res.data))
        .catch(() => toast.error("Failed to load profile"))
        .finally(() => setLoadingPublic(false));
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setSelectedImage(reader.result);
      await updateProfile({ profilePic: reader.result });
      setSelectedImage(null); // clear local preview — show Cloudinary URL from authUser
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    await updateProfile({ profilePic: "remove" });
    setSelectedImage(null);
  };

  const handleSave = async () => {
    await updateProfile(form);
    setIsEditing(false);
  };

  const displayUser = isOwnProfile ? authUser : publicUser;

  if (!isOwnProfile && loadingPublic) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Public Profile View ──────────────────────────────────────────────
  if (!isOwnProfile && displayUser) {
    const mood = MOODS.find((m) => m.value === displayUser.mood) || MOODS[0];
    return (
      <div className="min-h-screen pt-20 bg-base-200">
        <div className="max-w-xl mx-auto p-4">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="btn btn-ghost btn-sm gap-2 mb-4"
          >
            <ArrowLeft className="size-4" /> Back
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="bg-base-100 rounded-2xl shadow-lg overflow-hidden"
          >
            {/* Banner */}
            <div className="h-28 bg-gradient-to-r from-primary/30 via-secondary/30 to-accent/30" />

            <div className="px-6 pb-6 -mt-14">
              {/* Avatar */}
              <div className="relative inline-block">
                <img
                  src={displayUser.profilePic || "/avatar.png"}
                  alt={displayUser.fullName}
                  className="size-24 rounded-full border-4 border-base-100 object-cover cursor-pointer shadow-lg"
                  onClick={() => setIsModalOpen(true)}
                />
                {displayUser.isOnline && (
                  <span className="absolute bottom-1 right-1 size-4 bg-green-500 rounded-full ring-2 ring-base-100" />
                )}
                {mood.value !== "none" && (
                  <span className="absolute -bottom-1 -right-1 text-lg">{mood.emoji}</span>
                )}
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{displayUser.fullName}</h1>
                  {displayUser.role === "admin" && (
                    <span className="badge badge-primary badge-sm gap-1">
                      <Shield className="size-3" /> Admin
                    </span>
                  )}
                </div>
                {displayUser.username && (
                  <p className="text-base-content/50 text-sm">@{displayUser.username}</p>
                )}
                {mood.value !== "none" && (
                  <span className="badge badge-ghost badge-sm mt-1">
                    {mood.emoji} {mood.label}
                  </span>
                )}
              </div>

              {displayUser.statusText && (
                <p className="mt-3 text-sm text-base-content/70 italic">
                  "{displayUser.statusText}"
                </p>
              )}

              {displayUser.bio && (
                <p className="mt-3 text-sm text-base-content/80">{displayUser.bio}</p>
              )}

              <div className="divider" />

              <div className="space-y-2 text-sm text-base-content/60">
                <div className="flex items-center gap-2">
                  <Mail className="size-4" />
                  <span>{displayUser.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4" />
                  <span>Joined {new Date(displayUser.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                </div>
              </div>

              <button
                className="btn btn-primary w-full mt-5"
                onClick={() => navigate("/")}
              >
                Send Message
              </button>
            </div>
          </motion.div>
        </div>
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageSrc={displayUser.profilePic || "/avatar.png"}
          alt={displayUser.fullName}
        />
      </div>
    );
  }

  // ── Own Profile Edit View ─────────────────────────────────────────────
  const mood = MOODS.find((m) => m.value === (isEditing ? form.mood : authUser?.mood)) || MOODS[0];

  return (
    <div className="min-h-screen pt-20 bg-base-200">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-base-100 rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Banner */}
          <div className="h-28 bg-gradient-to-r from-primary/30 via-secondary/30 to-accent/30" />

          <div className="px-6 pb-8 -mt-14">
            {/* Avatar */}
            <div className="flex items-end justify-between mb-4">
              <div className="relative">
                <img
                  src={selectedImage || authUser?.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="size-24 rounded-full border-4 border-base-100 object-cover cursor-pointer shadow-lg"
                  onClick={() => setIsModalOpen(true)}
                />
                {mood.value !== "none" && (
                  <span className="absolute -bottom-1 -right-1 text-lg">{mood.emoji}</span>
                )}
                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-0 right-0 bg-primary text-primary-content p-1.5 rounded-full cursor-pointer shadow hover:scale-105 transition-transform ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
                >
                  <Camera className="size-3.5" />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUpdatingProfile}
                  />
                </label>
                {(selectedImage || authUser?.profilePic) && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUpdatingProfile}
                    className="absolute -top-1 -right-1 bg-error text-error-content p-1 rounded-full shadow hover:scale-105 transition-transform"
                    title="Remove photo"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button className="btn btn-primary btn-sm gap-1.5" onClick={handleSave} disabled={isUpdatingProfile}>
                      {isUpdatingProfile ? <Loader className="size-4 animate-spin" /> : <Save className="size-4" />}
                      Save
                    </button>
                  </>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </button>
                )}
              </div>
            </div>

            {/* Name + username */}
            {!isEditing ? (
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{authUser?.fullName}</h1>
                  {authUser?.role === "admin" && (
                    <span className="badge badge-primary badge-sm gap-1">
                      <Shield className="size-3" /> Admin
                    </span>
                  )}
                </div>
                {authUser?.username && (
                  <p className="text-base-content/50 text-sm">@{authUser.username}</p>
                )}
                {mood.value !== "none" && (
                  <span className="badge badge-ghost badge-sm mt-1">
                    {mood.emoji} {mood.label}
                  </span>
                )}
                {authUser?.statusText && (
                  <p className="mt-2 text-sm text-base-content/70 italic">"{authUser.statusText}"</p>
                )}
                {authUser?.bio && (
                  <p className="mt-2 text-sm text-base-content/80">{authUser.bio}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4 mb-4">
                {/* Full Name */}
                <div className="form-control">
                  <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><User className="size-4" />Full Name</span></label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  />
                </div>

                {/* Username */}
                <div className="form-control">
                  <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><AtSign className="size-4" />Username</span></label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    placeholder="yourhandle"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>

                {/* Status Text */}
                <div className="form-control">
                  <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><Smile className="size-4" />Status</span></label>
                  <input
                    type="text"
                    className="input input-bordered input-sm"
                    placeholder="What's on your mind?"
                    value={form.statusText}
                    onChange={(e) => setForm({ ...form, statusText: e.target.value })}
                    maxLength={80}
                  />
                </div>

                {/* Bio */}
                <div className="form-control">
                  <label className="label py-1">
                    <span className="label-text font-medium flex items-center gap-1.5"><FileText className="size-4" />Bio</span>
                    <span className="label-text-alt text-base-content/40">{form.bio.length}/160</span>
                  </label>
                  <textarea
                    className="textarea textarea-bordered textarea-sm resize-none"
                    rows={3}
                    placeholder="Tell people a little about yourself"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    maxLength={160}
                  />
                </div>

                {/* Phone */}
                <div className="form-control">
                  <label className="label py-1"><span className="label-text font-medium flex items-center gap-1.5"><Phone className="size-4" />Phone</span></label>
                  <input
                    type="tel"
                    className="input input-bordered input-sm"
                    placeholder="+91 00000 00000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                {/* Mood Selector */}
                <div className="form-control">
                  <label className="label py-1"><span className="label-text font-medium">Mood</span></label>
                  <div className="grid grid-cols-4 gap-2">
                    {MOODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setForm({ ...form, mood: m.value })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          form.mood === m.value
                            ? "border-primary bg-primary/10"
                            : "border-base-300 hover:border-base-content/30"
                        }`}
                      >
                        <span className="text-2xl">{m.emoji}</span>
                        <span className="text-xs font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="divider" />

            {/* Static info */}
            <div className="space-y-2 text-sm text-base-content/60">
              <div className="flex items-center gap-2">
                <Mail className="size-4" />
                <span>{authUser?.email}</span>
              </div>
              {authUser?.phone && !isEditing && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4" />
                  <span>{authUser.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="size-4" />
                <span>Joined {new Date(authUser?.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="size-4" />
                <span className="capitalize">{authUser?.role || "user"}</span>
                <span className="badge badge-success badge-xs">Active</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageSrc={selectedImage || authUser?.profilePic || "/avatar.png"}
        alt={authUser?.fullName || "Profile"}
      />
    </div>
  );
};

export default ProfilePage;
