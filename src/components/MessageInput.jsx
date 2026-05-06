import React, { useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore.js";
import { Image, Send, X, Reply, Video, Mic, Square, Timer } from "lucide-react";
import toast from "react-hot-toast";

// ── Voice Note component (inline recorder) ──────────────────────────────────
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () =>
    new Promise((resolve) => {
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

// ── Main component ───────────────────────────────────────────────────────────
const DESTRUCT_OPTIONS = [
  { label: "Off",  value: null   },
  { label: "30s",  value: "30s"  },
  { label: "5m",   value: "5m"   },
  { label: "1h",   value: "1h"   },
  { label: "24h",  value: "24h"  },
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

  const { sendMessage, selectedUser, emitTyping, emitStopTyping, replyingTo, clearReplyingTo } =
    useChatStore();

  const { isRecording, recordingTime, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder();

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
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
    setVideoFile(file);
  };

  const clearMedia = () => {
    setImagePreview(null);
    setVideoPreview(null);
    setVideoFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleTyping = useCallback(
    (e) => {
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
    },
    [selectedUser._id, emitTyping, emitStopTyping]
  );

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
    } catch (err) {
      console.log("Failed to send message", err);
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
    } catch (err) {
      console.log("Failed to send voice note", err);
    }
  };

  const hasMedia = imagePreview || videoPreview;

  return (
    <div className="p-4 w-full">
      {/* Reply preview */}
      {replyingTo && (
        <div className="mb-2 flex items-center gap-2 bg-base-200 rounded-lg px-3 py-2 border-l-4 border-primary">
          <Reply className="size-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary">Replying to message</p>
            <p className="text-xs truncate text-base-content/60">
              {replyingTo.text || (replyingTo.image ? "📷 Photo" : replyingTo.video ? "🎥 Video" : "🎵 Audio")}
            </p>
          </div>
          <button type="button" onClick={clearReplyingTo} className="btn btn-ghost btn-xs btn-circle">
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Media previews */}
      {hasMedia && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border border-zinc-700" />
            )}
            {videoPreview && (
              <video src={videoPreview} className="w-28 h-20 object-cover rounded-lg border border-zinc-700" />
            )}
            <button
              onClick={clearMedia}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
          {videoPreview && (
            <p className="text-xs text-base-content/50">🎥 Video ready to send</p>
          )}
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="mb-2 flex items-center gap-3 bg-error/10 rounded-lg px-3 py-2 border border-error/30">
          <span className="size-2.5 rounded-full bg-error animate-pulse" />
          <span className="text-sm font-medium text-error">Recording {formatTime(recordingTime)}</span>
          <button type="button" onClick={cancelRecording} className="ml-auto btn btn-ghost btn-xs text-base-content/50">
            Cancel
          </button>
        </div>
      )}

      {/* Self-destruct timer menu */}
      {showTimerMenu && (
        <div className="mb-2 flex items-center gap-1.5 flex-wrap">
          <Timer className="size-3.5 text-orange-400 shrink-0" />
          {DESTRUCT_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => { setExpiresIn(opt.value); setShowTimerMenu(false); }}
              className={`btn btn-xs rounded-full ${
                expiresIn === opt.value ? "btn-warning" : "btn-ghost border border-base-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-1.5">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder={isRecording ? "Release mic to send..." : "Type a message..."}
            value={text}
            onChange={handleTyping}
            disabled={isRecording}
          />

          {/* Hidden file inputs */}
          <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageChange} />
          <input type="file" accept="video/*" className="hidden" ref={videoInputRef} onChange={handleVideoChange} />

          {/* Image button */}
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle btn-sm sm:btn-md ${imagePreview ? "text-emerald-500" : "text-zinc-400"}`}
            onClick={() => imageInputRef.current?.click()}
            disabled={isRecording || !!videoPreview}
          >
            <Image size={18} />
          </button>

          {/* Video button */}
          <button
            type="button"
            className={`hidden sm:flex btn btn-circle btn-sm sm:btn-md ${videoPreview ? "text-blue-500" : "text-zinc-400"}`}
            onClick={() => videoInputRef.current?.click()}
            disabled={isRecording || !!imagePreview}
          >
            <Video size={18} />
          </button>

          {/* Mic button */}
          {!isRecording ? (
            <button
              type="button"
              className="hidden sm:flex btn btn-circle btn-sm sm:btn-md text-zinc-400 hover:text-primary"
              onMouseDown={startRecording}
              onTouchStart={startRecording}
              disabled={hasMedia}
            >
              <Mic size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="hidden sm:flex btn btn-circle btn-sm sm:btn-md btn-error"
              onClick={handleSendVoice}
            >
              <Square size={16} />
            </button>
          )}
        </div>

        {/* Self-destruct toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowTimerMenu((v) => !v); }}
          className={`btn btn-circle btn-sm ${expiresIn ? "btn-warning" : "btn-ghost text-zinc-400"}`}
          title="Self-destruct timer"
        >
          <Timer size={16} />
        </button>

        <button
          type="submit"
          className="btn btn-sm btn-circle btn-primary"
          disabled={(!text.trim() && !hasMedia) || isRecording}
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default MessageInput;
