import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Users, Image, Send, Mic, Square, LogOut,
  BarChart2, Plus, Trash2, Check,
} from "lucide-react";
import { useGroupStore } from "../store/useGroupStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { axiosInstance } from "../lib/axios.js";
import VoiceNote from "./VoiceNote.jsx";
import MessageSkeleton from "./skeletons/MessageSkeleton.jsx";
import { formatMessageTime, isSameDay, formatDateDivider } from "../lib/utils.js";
import toast from "react-hot-toast";

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

// ── Poll components ──────────────────────────────────────────────────────────

const PollCreator = ({ onSubmit, onCancel }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions([...options, ""]);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    if (!question.trim()) { toast.error("Add a question"); return; }
    const filled = options.filter((o) => o.trim());
    if (filled.length < 2) { toast.error("Add at least 2 options"); return; }
    onSubmit({ question: question.trim(), options: filled });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="border-t border-base-300 bg-base-100 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold flex items-center gap-2">
          <BarChart2 className="size-4 text-primary" /> Create Poll
        </span>
        <button onClick={onCancel} className="btn btn-ghost btn-xs btn-circle">
          <X className="size-3.5" />
        </button>
      </div>

      <input
        type="text"
        placeholder="Ask a question…"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="input input-bordered input-sm w-full rounded-xl text-sm"
        maxLength={120}
        autoFocus
      />

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const updated = [...options];
                updated[i] = e.target.value;
                setOptions(updated);
              }}
              className="input input-bordered input-sm flex-1 rounded-xl text-sm"
              maxLength={60}
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="btn btn-ghost btn-xs btn-circle text-error">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        {options.length < 6 ? (
          <button onClick={addOption} className="btn btn-ghost btn-xs gap-1 text-primary">
            <Plus className="size-3.5" /> Add option
          </button>
        ) : <div />}
        <button onClick={handleSubmit} className="btn btn-primary btn-sm gap-1.5 rounded-xl">
          <Send className="size-3.5" /> Post Poll
        </button>
      </div>
    </motion.div>
  );
};

const PollBubble = ({ msg, isOwn, onVote, authUserId }) => {
  const { poll } = msg;
  if (!poll?.question) return null;

  const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
  const myVoteIdx = poll.options.findIndex((o) =>
    o.votes?.some((v) => (v._id || v) === authUserId)
  );

  return (
    <div className={`rounded-2xl overflow-hidden shadow-sm min-w-[200px] max-w-[280px] ${
      isOwn ? "bg-primary text-primary-content" : "bg-base-200 text-base-content"
    }`}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 mb-2 opacity-60 text-xs font-medium">
          <BarChart2 className="size-3.5" /> Poll
        </div>
        <p className="font-semibold text-sm leading-snug">{poll.question}</p>
      </div>

      <div className="px-3 pb-3 space-y-1.5">
        {poll.options.map((opt, i) => {
          const count = opt.votes?.length || 0;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isMyVote = myVoteIdx === i;

          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.97 }}
              onClick={() => onVote(msg._id, i)}
              className={`relative w-full text-left rounded-xl overflow-hidden transition-all ${
                isOwn
                  ? isMyVote ? "ring-2 ring-primary-content/40" : ""
                  : isMyVote ? "ring-2 ring-primary/40" : ""
              }`}
            >
              {/* Progress bar background */}
              <div
                className={`absolute inset-0 transition-all duration-500 rounded-xl ${
                  isOwn ? "bg-primary-content/20" : "bg-primary/15"
                }`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isMyVote && <Check className="size-3.5 shrink-0 opacity-80" />}
                  <span className="text-xs font-medium truncate">{opt.text}</span>
                </div>
                <span className="text-xs opacity-50 shrink-0 tabular-nums">{pct}%</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className={`px-4 pb-2.5 text-[10px] opacity-40`}>
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

const GroupChatContainer = () => {
  const {
    selectedGroup, setSelectedGroup,
    groupMessages, getGroupMessages, sendGroupMessage,
    isLoadingMessages, subscribeToGroupMessages, unsubscribeFromGroupMessages,
    createPoll, votePoll,
  } = useGroupStore();
  const { authUser, socket } = useAuthStore();

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
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
    if (!messageEndRef.current) return;
    const behavior = groupMessages.length <= 20 ? "instant" : "smooth";
    messageEndRef.current.scrollIntoView({ behavior, block: "end" });
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

  const handlePollSubmit = async ({ question, options }) => {
    await createPoll({ question, options });
    setShowPollCreator(false);
  };

  if (isLoadingMessages) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-base-300 bg-base-100/80 backdrop-blur-md shrink-0 px-4 py-3 flex items-center gap-3">
          <div className="size-10 rounded-full bg-base-300 animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 bg-base-300 animate-pulse rounded" />
            <div className="h-2.5 w-16 bg-base-300 animate-pulse rounded" />
          </div>
        </div>
        <MessageSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Header */}
        <div className="border-b border-base-300 bg-base-100/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="size-10 rounded-full overflow-hidden bg-base-300 ring-2 ring-base-200 shrink-0">
              {selectedGroup.groupPic
                ? <img src={selectedGroup.groupPic} alt={selectedGroup.name} className="size-full object-cover" />
                : <div className="size-full flex items-center justify-center text-base font-bold text-base-content/40">
                    {selectedGroup.name[0]}
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight">{selectedGroup.name}</h3>
              <button
                className="text-xs text-base-content/40 hover:text-primary transition-colors flex items-center gap-1 mt-0.5"
                onClick={() => setShowMembers((v) => !v)}
              >
                <Users className="size-3" /> {selectedGroup.members?.length} members
              </button>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleLeave} className="btn btn-ghost btn-xs gap-1 text-error hover:bg-error/10 rounded-xl">
                <LogOut className="size-3.5" /> Leave
              </button>
              <button onClick={() => setSelectedGroup(null)} className="btn btn-ghost btn-sm btn-circle text-base-content/40">
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 scroll-smooth">
          {groupMessages.map((msg, idx) => {
            const isOwn = (msg.senderId?._id || msg.senderId) === authUser._id;
            const sender = typeof msg.senderId === "object" ? msg.senderId : null;
            const prevMsg = groupMessages[idx - 1];
            const showDate = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
            const hasPoll = !!msg.poll?.question;

            return (
              <div key={msg._id}>
                {showDate && (
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-base-300/60" />
                    <span className="text-[11px] text-base-content/35 font-medium px-3 py-1 bg-base-200 rounded-full border border-base-300/40">
                      {formatDateDivider(msg.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-base-300/60" />
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, x: isOwn ? 20 : -20, scale: 0.94 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  className={`chat ${isOwn ? "chat-end" : "chat-start"} group`}
                  ref={idx === groupMessages.length - 1 ? messageEndRef : null}
                >
                  <div className="chat-image avatar">
                    <div className="size-8 rounded-full border-2 border-base-200 overflow-hidden shadow-sm">
                      <img src={sender?.profilePic || "/avatar.png"} alt={sender?.fullName || "?"} className="size-full object-cover" />
                    </div>
                  </div>
                  <div className="chat-header mb-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isOwn && <span className="text-xs font-semibold text-primary">{sender?.fullName}</span>}
                    <time className="text-[11px] text-base-content/40">{formatMessageTime(msg.createdAt)}</time>
                  </div>

                  {hasPoll ? (
                    <PollBubble
                      msg={msg}
                      isOwn={isOwn}
                      authUserId={authUser._id}
                      onVote={votePoll}
                    />
                  ) : (
                    <div className={`chat-bubble flex flex-col shadow-sm text-sm leading-relaxed max-w-xs sm:max-w-sm ${
                      isOwn ? "bg-primary text-primary-content" : "bg-base-200 text-base-content"
                    }`}>
                      {msg.image && <img src={msg.image} alt="img" className="max-w-[200px] rounded-lg mb-2 shadow" />}
                      {msg.video && <video src={msg.video} controls className="max-w-[260px] rounded-lg mb-2 shadow" />}
                      {msg.audio && <VoiceNote src={msg.audio} />}
                      {msg.text && <p>{msg.text}</p>}
                    </div>
                  )}
                </motion.div>
              </div>
            );
          })}
          <div ref={messageEndRef} />
        </div>

        {/* Poll creator */}
        <AnimatePresence>
          {showPollCreator && (
            <PollCreator
              onSubmit={handlePollSubmit}
              onCancel={() => setShowPollCreator(false)}
            />
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-base-300 bg-base-100">
          {imagePreview && (
            <div className="mb-2 relative inline-block">
              <img src={imagePreview} className="w-16 h-16 object-cover rounded-xl border border-base-300 shadow" alt="preview" />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-error text-error-content flex items-center justify-center shadow"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          {isRecording && (
            <div className="mb-2 flex items-center gap-3 bg-error/10 rounded-xl px-3 py-2 border border-error/20">
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="size-2.5 rounded-full bg-error shrink-0"
              />
              <span className="text-sm font-medium text-error tabular-nums">
                {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
              </span>
              <button onClick={cancelRecording} className="ml-auto text-xs text-base-content/50 hover:text-error transition-colors">Cancel</button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageChange} />

            <button type="button"
              className="btn btn-circle btn-sm btn-ghost text-base-content/40 hover:text-primary shrink-0"
              onClick={() => imageInputRef.current?.click()}>
              <Image className="size-4" />
            </button>

            {/* Poll button */}
            <button type="button"
              onClick={() => setShowPollCreator((v) => !v)}
              className={`btn btn-circle btn-sm btn-ghost shrink-0 hidden sm:flex transition-colors ${
                showPollCreator ? "text-primary bg-primary/10" : "text-base-content/40 hover:text-primary"
              }`}
              title="Create poll">
              <BarChart2 className="size-4" />
            </button>

            <input
              type="text"
              className="flex-1 input input-bordered input-md rounded-2xl bg-base-200 border-base-300 focus:border-primary focus:bg-base-100 transition-all text-sm placeholder:text-base-content/30"
              placeholder={isRecording ? "Recording…" : "Message group…"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isRecording}
            />

            {!isRecording ? (
              <button type="button"
                className="btn btn-circle btn-sm btn-ghost text-base-content/40 hover:text-primary hidden sm:flex shrink-0"
                onMouseDown={startRecording} onTouchStart={startRecording}>
                <Mic className="size-4" />
              </button>
            ) : (
              <motion.button type="button"
                className="btn btn-circle btn-sm btn-error shrink-0"
                onClick={handleSendVoice}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}>
                <Square className="size-4" />
              </motion.button>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.9 }}
              className="btn btn-circle btn-md btn-primary shadow-md disabled:opacity-40 shrink-0"
              disabled={(!text.trim() && !imagePreview) || isRecording}>
              <Send className="size-4" />
            </motion.button>
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
