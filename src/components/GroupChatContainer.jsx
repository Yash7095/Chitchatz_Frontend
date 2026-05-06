import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Image, Send, Mic, Square, LogOut } from "lucide-react";
import { useGroupStore } from "../store/useGroupStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { axiosInstance } from "../lib/axios.js";
import VoiceNote from "./VoiceNote.jsx";
import MessageSkeleton from "./skeletons/MessageSkeleton.jsx";
import { formatMessageTime, isSameDay, formatDateDivider } from "../lib/utils.js";
import toast from "react-hot-toast";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch { toast.error("Microphone access denied"); }
  };

  const stopRecording = () => new Promise((resolve) => {
    if (!mediaRecorderRef.current) return resolve(null);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      clearInterval(timerRef.current);
      setIsRecording(false);
      setRecordingTime(0);
      resolve(blob);
    };
    mediaRecorderRef.current.stop();
  });

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  return { isRecording, recordingTime, startRecording, stopRecording, cancelRecording };
};

const GroupChatContainer = () => {
  const {
    selectedGroup, setSelectedGroup,
    groupMessages, getGroupMessages, sendGroupMessage,
    isLoadingMessages, subscribeToGroupMessages, unsubscribeFromGroupMessages,
  } = useGroupStore();
  const { authUser, socket } = useAuthStore();

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const messageEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

  useEffect(() => {
    getGroupMessages(selectedGroup._id);
  }, [selectedGroup._id]);

  useEffect(() => {
    if (!socket) return;
    subscribeToGroupMessages();
    return () => unsubscribeFromGroupMessages();
  }, [selectedGroup._id, socket]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    await sendGroupMessage({ text: text.trim(), image: imagePreview });
    setText("");
    setImagePreview(null);
  };

  const handleSendVoice = async () => {
    const blob = await stopRecording();
    if (!blob) return;
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    await sendGroupMessage({ audio: base64 });
  };

  const handleLeave = async () => {
    try {
      await axiosInstance.delete(`/groups/${selectedGroup._id}/members/${authUser._id}`);
      setSelectedGroup(null);
    } catch { toast.error("Failed to leave group"); }
  };

  const myRole = selectedGroup.members?.find(
    (m) => (m.userId?._id || m.userId) === authUser._id
  )?.role;

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <GroupHeader group={selectedGroup} onClose={() => setSelectedGroup(null)} onMembersToggle={() => setShowMembers(v => !v)} />
        <MessageSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Header */}
        <div className="p-2.5 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full overflow-hidden bg-base-300">
              {selectedGroup.groupPic
                ? <img src={selectedGroup.groupPic} alt={selectedGroup.name} className="size-full object-cover" />
                : <div className="size-full flex items-center justify-center text-lg font-bold text-base-content/40">
                    {selectedGroup.name[0]}
                  </div>
              }
            </div>
            <div>
              <h3 className="font-medium">{selectedGroup.name}</h3>
              <button
                className="text-xs text-base-content/50 hover:text-primary transition-colors flex items-center gap-1"
                onClick={() => setShowMembers((v) => !v)}
              >
                <Users className="size-3" /> {selectedGroup.members?.length} members
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleLeave} className="btn btn-ghost btn-xs gap-1 text-error">
              <LogOut className="size-3.5" /> Leave
            </button>
            <button onClick={() => setSelectedGroup(null)} className="btn btn-ghost btn-sm btn-circle">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {groupMessages.map((msg, idx) => {
            const isOwn = (msg.senderId?._id || msg.senderId) === authUser._id;
            const sender = typeof msg.senderId === "object" ? msg.senderId : null;
            const prevMsg = groupMessages[idx - 1];
            const showDate = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);

            return (
              <div key={msg._id}>
                {showDate && (
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-base-300" />
                    <span className="text-xs text-base-content/40 px-2 bg-base-100 rounded-full py-0.5">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-base-300" />
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, x: isOwn ? 20 : -20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`chat ${isOwn ? "chat-end" : "chat-start"}`}
                  ref={idx === groupMessages.length - 1 ? messageEndRef : null}
                >
                  <div className="chat-image avatar">
                    <div className="size-8 rounded-full border overflow-hidden">
                      <img src={sender?.profilePic || "/avatar.png"} alt={sender?.fullName || "?"} />
                    </div>
                  </div>
                  <div className="chat-header mb-0.5 flex items-baseline gap-2">
                    {!isOwn && <span className="text-xs font-semibold text-primary">{sender?.fullName}</span>}
                    <time className="text-xs opacity-40">{formatMessageTime(msg.createdAt)}</time>
                  </div>
                  <div className="chat-bubble flex flex-col">
                    {msg.image && <img src={msg.image} alt="img" className="sm:max-w-[200px] rounded-lg mb-2" />}
                    {msg.video && <video src={msg.video} controls className="sm:max-w-[260px] rounded-lg mb-2" />}
                    {msg.audio && <VoiceNote src={msg.audio} />}
                    {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                  </div>
                </motion.div>
              </div>
            );
          })}
          <div ref={messageEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-base-300">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img src={imagePreview} className="w-20 h-20 object-cover rounded-lg border" alt="preview" />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-base-300 flex items-center justify-center"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          {isRecording && (
            <div className="mb-2 flex items-center gap-3 bg-error/10 rounded-lg px-3 py-2 border border-error/30">
              <span className="size-2.5 rounded-full bg-error animate-pulse" />
              <span className="text-sm font-medium text-error">
                Recording {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
              </span>
              <button onClick={cancelRecording} className="ml-auto btn btn-ghost btn-xs">Cancel</button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="file" accept="image/*" className="hidden"
              ref={imageInputRef} onChange={handleImageChange}
            />
            <input
              type="text"
              className="flex-1 input input-bordered rounded-lg input-sm sm:input-md"
              placeholder="Message group..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isRecording}
            />
            <button type="button" className="btn btn-circle btn-sm text-zinc-400 hidden sm:flex"
              onClick={() => imageInputRef.current?.click()}>
              <Image size={18} />
            </button>
            {!isRecording ? (
              <button type="button" className="btn btn-circle btn-sm text-zinc-400 hidden sm:flex"
                onMouseDown={startRecording} onTouchStart={startRecording}>
                <Mic size={18} />
              </button>
            ) : (
              <button type="button" className="btn btn-circle btn-sm btn-error hidden sm:flex" onClick={handleSendVoice}>
                <Square size={16} />
              </button>
            )}
            <button type="submit" className="btn btn-sm btn-circle btn-primary"
              disabled={(!text.trim() && !imagePreview) || isRecording}>
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Members panel */}
      <AnimatePresence>
        {showMembers && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-base-300 bg-base-100 overflow-hidden shrink-0"
          >
            <div className="p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Users className="size-4" /> Members
              </h4>
              <div className="space-y-2">
                {selectedGroup.members?.map((m) => {
                  const u = m.userId;
                  if (!u) return null;
                  return (
                    <div key={u._id || u} className="flex items-center gap-2">
                      <img src={u.profilePic || "/avatar.png"} className="size-8 rounded-full object-cover" alt="" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{u.fullName}</p>
                        {m.role === "admin" && (
                          <span className="text-xs text-primary">Admin</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupChatContainer;
