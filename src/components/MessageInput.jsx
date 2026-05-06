import React, { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../store/useChatStore.js";
import { Image, Send, X, Reply, Video, Mic, Square, Timer } from "lucide-react";
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
    } catch {
      toast.error("Microphone access denied");
    }
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

const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const DESTRUCT_OPTIONS = [
  { label: "Off", value: null },
  { label: "30s", value: "30s" },
  { label: "5m",  value: "5m"  },
  { label: "1h",  value: "1h"  },
  { label: "24h", value: "24h" },
];

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [expiresIn, setExpiresIn] = useState(null);
  const [showTimerMenu, setShowTimerMenu] = useState(false);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  const { sendMessage, selectedUser, emitTyping, emitStopTyping, replyingTo, clearReplyingTo } = useChatStore();
  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("image/")) return toast.error("Select an image file");
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("video/")) return toast.error("Select a video file");
    if (file.size > 50 * 1024 * 1024) return toast.error("Video must be under 50MB");
    setVideoPreview(URL.createObjectURL(file));
    setVideoFile(file);
  };

  const clearMedia = () => {
    setImagePreview(null);
    setVideoPreview(null);
    setVideoFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleTyping = useCallback((e) => {
    setText(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(selectedUser._id);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitStopTyping(selectedUser._id);
    }, 1500);
  }, [selectedUser._id, emitTyping, emitStopTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !videoFile) return;
    clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    emitStopTyping(selectedUser._id);

    let videoBase64 = null;
    if (videoFile) {
      videoBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(videoFile);
      });
    }
    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        video: videoBase64,
        replyTo: replyingTo?._id || null,
        expiresIn: expiresIn || undefined,
      });
      setExpiresIn(null);
      setText("");
      clearMedia();
    } catch {
      toast.error("Failed to send message");
    }
  };

  const handleSendVoice = async () => {
    const blob = await stopRecording();
    if (!blob) return;
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    try {
      await sendMessage({ audio: base64, replyTo: replyingTo?._id || null });
    } catch {
      toast.error("Failed to send voice note");
    }
  };

  const hasMedia = imagePreview || videoPreview;
  const canSend = (text.trim() || hasMedia) && !isRecording;

  return (
    <div className="px-4 pb-4 pt-2 border-t border-base-300 bg-base-100">

      {/* Reply preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-center gap-2 bg-base-200 rounded-xl px-3 py-2 border-l-4 border-primary">
              <Reply className="size-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary">Replying</p>
                <p className="text-xs truncate text-base-content/60">
                  {replyingTo.text || (replyingTo.image ? "📷 Photo" : replyingTo.video ? "🎥 Video" : "🎵 Audio")}
                </p>
              </div>
              <button type="button" onClick={clearReplyingTo} className="btn btn-ghost btn-xs btn-circle shrink-0">
                <X className="size-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media previews */}
      <AnimatePresence>
        {hasMedia && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="relative shrink-0">
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-base-300 shadow" />
                )}
                {videoPreview && (
                  <video src={videoPreview} className="w-24 h-16 object-cover rounded-xl border border-base-300 shadow" />
                )}
                <button
                  onClick={clearMedia}
                  type="button"
                  className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-error text-error-content flex items-center justify-center shadow"
                >
                  <X className="size-3" />
                </button>
              </div>
              {videoPreview && <p className="text-xs text-base-content/50">🎥 Video ready</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-center gap-3 bg-error/10 rounded-xl px-3 py-2 border border-error/20">
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="size-2.5 rounded-full bg-error shrink-0"
              />
              <span className="text-sm font-medium text-error tabular-nums">
                {formatTime(recordingTime)}
              </span>
              <button type="button" onClick={cancelRecording} className="ml-auto text-xs text-base-content/50 hover:text-error transition-colors">
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Self-destruct timer options */}
      <AnimatePresence>
        {showTimerMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-center gap-1.5 flex-wrap">
              <Timer className="size-3.5 text-warning shrink-0" />
              {DESTRUCT_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => { setExpiresIn(opt.value); setShowTimerMenu(false); }}
                  className={`btn btn-xs rounded-full transition-all ${
                    expiresIn === opt.value
                      ? "btn-warning"
                      : "btn-ghost border border-base-300 hover:border-warning hover:text-warning"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main input row */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2">

        {/* Hidden file inputs */}
        <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageChange} />
        <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={handleVideoChange} />

        {/* Left action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={isRecording || !!videoPreview}
            className={`btn btn-circle btn-sm ${imagePreview ? "text-emerald-500" : "btn-ghost text-base-content/40 hover:text-primary"}`}
            title="Attach image"
          >
            <Image className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={isRecording || !!imagePreview}
            className={`btn btn-circle btn-sm hidden sm:flex ${videoPreview ? "text-blue-500" : "btn-ghost text-base-content/40 hover:text-primary"}`}
            title="Attach video"
          >
            <Video className="size-4" />
          </button>
        </div>

        {/* Text input */}
        <input
          type="text"
          className="flex-1 input input-bordered input-md rounded-2xl bg-base-200 border-base-300 focus:border-primary focus:bg-base-100 transition-all text-sm placeholder:text-base-content/30"
          placeholder={isRecording ? "Recording…" : "Type a message…"}
          value={text}
          onChange={handleTyping}
          disabled={isRecording}
        />

        {/* Right action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Self-destruct */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowTimerMenu((v) => !v); }}
            className={`btn btn-circle btn-sm ${expiresIn ? "btn-warning" : "btn-ghost text-base-content/40 hover:text-warning"}`}
            title="Self-destruct timer"
          >
            <Timer className="size-4" />
          </button>

          {/* Mic / Stop */}
          {!isRecording ? (
            <button
              type="button"
              className="btn btn-circle btn-sm btn-ghost text-base-content/40 hover:text-primary hidden sm:flex"
              onMouseDown={startRecording}
              onTouchStart={startRecording}
              disabled={!!hasMedia}
              title="Hold to record voice note"
            >
              <Mic className="size-4" />
            </button>
          ) : (
            <motion.button
              type="button"
              className="btn btn-circle btn-sm btn-error"
              onClick={handleSendVoice}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <Square className="size-4" />
            </motion.button>
          )}

          {/* Send */}
          <motion.button
            type="submit"
            disabled={!canSend}
            whileTap={{ scale: 0.9 }}
            className="btn btn-circle btn-md btn-primary shadow-md disabled:opacity-40"
          >
            <Send className="size-4" />
          </motion.button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;
