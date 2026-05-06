import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Pin, Sparkles, X, Timer, Bookmark, Forward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { msgBubbleOwn, msgBubbleOther, popIn, fadeUp } from "../lib/animations";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import VoiceNote from "./VoiceNote";
import ForwardPicker from "./ForwardPicker";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, isSameDay, formatDateDivider } from "../lib/utils";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

// ── Sub-components ────────────────────────────────────────────────────────────

const MessageStatus = ({ message, isOwn }) => {
  if (!isOwn) return null;
  if (message.status === "read")
    return <CheckCheck className="size-3 text-blue-400 inline-block ml-1 align-middle" />;
  if (message.status === "delivered")
    return <CheckCheck className="size-3 opacity-30 inline-block ml-1 align-middle" />;
  return <Check className="size-3 opacity-30 inline-block ml-1 align-middle" />;
};

const ReplyPreview = ({ replyTo, authUser, selectedUser }) => {
  if (!replyTo) return null;
  const senderId = replyTo.senderId?._id || replyTo.senderId;
  const isOwn = senderId === authUser._id;
  return (
    <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-black/10 border-l-[3px] border-primary/70 text-xs max-w-[200px]">
      <p className="font-semibold opacity-60 mb-0.5 truncate">
        {isOwn ? "You" : selectedUser.fullName}
      </p>
      <p className="truncate opacity-50">
        {replyTo.text || (replyTo.image ? "📷 Photo" : replyTo.video ? "🎥 Video" : "🎵 Audio")}
      </p>
    </div>
  );
};

const ReactionsDisplay = ({ reactions, onReact, messageId }) => {
  if (!reactions?.length) return null;
  const grouped = {};
  reactions.forEach(({ emoji }) => { grouped[emoji] = (grouped[emoji] || 0) + 1; });

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {Object.entries(grouped).map(([emoji, count], i) => (
        <motion.button
          key={emoji}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22, delay: i * 0.04 }}
          whileTap={{ scale: 0.85 }}
          onClick={() => onReact(messageId, emoji)}
          className="flex items-center gap-0.5 text-xs bg-base-100 hover:bg-base-200 rounded-full px-2 py-0.5 border border-base-300 shadow-sm transition-colors"
        >
          <span className="text-sm leading-none">{emoji}</span>
          {count > 1 && <span className="opacity-50 text-[10px]">{count}</span>}
        </motion.button>
      ))}
    </div>
  );
};

const SelfDestructTimer = ({ expiresAt }) => {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - new Date();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const s = Math.floor(diff / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      if (h > 0) setRemaining(`${h}h`);
      else if (m > 0) setRemaining(`${m}m`);
      else setRemaining(`${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] opacity-40 ml-1.5 align-middle">
      <Timer className="size-2.5" /> {remaining}
    </span>
  );
};

const EmojiPicker = ({ onSelect, onClose, isOwn }) => (
  <motion.div
    {...popIn}
    className={`absolute ${isOwn ? "right-0" : "left-0"} -top-11 flex gap-0.5 bg-base-100 rounded-full shadow-xl border border-base-300 px-2.5 py-1.5 z-20`}
  >
    {REACTION_EMOJIS.map((e) => (
      <motion.button
        key={e}
        whileHover={{ scale: 1.3 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { onSelect(e); onClose(); }}
        className="text-lg leading-none p-0.5"
      >
        {e}
      </motion.button>
    ))}
  </motion.div>
);

const ContextMenu = ({ x, y, onPin, onReply, onBookmark, onForward, onClose, isBookmarked }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: -4 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.92 }}
    transition={{ type: "spring", stiffness: 500, damping: 28 }}
    className="fixed z-50 bg-base-100/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-base-300/60 py-1.5 min-w-[160px] overflow-hidden"
    style={{ top: y, left: Math.min(x, window.innerWidth - 180) }}
    onClick={(e) => e.stopPropagation()}
  >
    <button
      onClick={() => { onReply(); onClose(); }}
      className="w-full text-left px-4 py-2 text-sm hover:bg-primary/10 hover:text-primary flex items-center gap-2.5 transition-colors"
    >
      ↩ Reply
    </button>
    <button
      onClick={() => { onPin(); onClose(); }}
      className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2.5 transition-colors"
    >
      <Pin className="size-3.5 shrink-0" /> Pin message
    </button>
    <button
      onClick={() => { onBookmark(); onClose(); }}
      className={`w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2.5 transition-colors ${isBookmarked ? "text-primary" : ""}`}
    >
      <Bookmark className={`size-3.5 shrink-0 ${isBookmarked ? "fill-primary" : ""}`} />
      {isBookmarked ? "Unsave" : "Save message"}
    </button>
    <button
      onClick={() => { onForward(); onClose(); }}
      className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2.5 transition-colors"
    >
      <Forward className="size-3.5 shrink-0" /> Forward
    </button>
  </motion.div>
);

const TypingBubble = ({ profilePic, name }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 6, scale: 0.95 }}
    transition={{ type: "spring", stiffness: 400, damping: 26 }}
    className="chat chat-start"
  >
    <div className="chat-image avatar">
      <div className="size-8 rounded-full border overflow-hidden">
        <img src={profilePic || "/avatar.png"} alt={name} className="size-full object-cover" />
      </div>
    </div>
    <div className="chat-bubble flex items-center gap-1 py-3 px-4 min-h-0 bg-base-200 text-base-content shadow-sm">
      {[0, 150, 300].map((delay, i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-base-content/50"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.9, delay: delay / 1000 }}
        />
      ))}
    </div>
  </motion.div>
);

// ── Main component ────────────────────────────────────────────────────────────

const ChatContainer = () => {
  const {
    messages, getMessages, isMessagesLoading, selectedUser,
    subscribeToMessages, unSubscribeFromMessages,
    isTyping, setReplyingTo,
    reactToMessage, pinMessage, toggleBookmark,
    smartReplies, isLoadingSmartReplies, clearSmartReplies,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unSubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unSubscribeFromMessages]);

  useEffect(() => {
    if (!messageEndRef.current) return;
    // instant on initial load, smooth for real-time additions
    const behavior = messages.length <= 20 ? "instant" : "smooth";
    messageEndRef.current.scrollIntoView({ behavior, block: "end" });
  }, [messages, isTyping]);

  useEffect(() => {
    const close = () => { setEmojiPickerMsgId(null); setContextMenu(null); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      onClick={() => { setEmojiPickerMsgId(null); setContextMenu(null); }}
    >
      <ChatHeader />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 scroll-smooth">
        {messages.map((message, idx) => {
          const isOwn = message.senderId === authUser._id;
          const prevMessage = messages[idx - 1];
          const showDateDivider = !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt);
          const isLastMsg = idx === messages.length - 1;
          const variants = isOwn ? msgBubbleOwn : msgBubbleOther;

          return (
            <div key={message._id}>
              {/* Date divider */}
              {showDateDivider && (
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-base-300/60" />
                  <span className="text-[11px] text-base-content/35 font-medium px-3 py-1 bg-base-200 rounded-full border border-base-300/40">
                    {formatDateDivider(message.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-base-300/60" />
                </div>
              )}

              <motion.div
                {...variants}
                className={`chat ${isOwn ? "chat-end" : "chat-start"} group`}
                ref={isLastMsg ? messageEndRef : null}
              >
                {/* Avatar */}
                <div className="chat-image avatar">
                  <div className="size-8 rounded-full border-2 border-base-200 overflow-hidden shadow-sm">
                    <img
                      src={isOwn ? authUser.profilePic || "/avatar.png" : selectedUser.profilePic || "/avatar.png"}
                      alt="avatar"
                      className="size-full object-cover"
                    />
                  </div>
                </div>

                {/* Time + pin badge */}
                <div className="chat-header mb-1 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <time className="text-[11px] text-base-content/40">{formatMessageTime(message.createdAt)}</time>
                  {message.isPinned && <Pin className="size-2.5 text-primary/50" />}
                </div>

                {/* Bubble + emoji picker */}
                <div className="relative">
                  <AnimatePresence>
                    {emojiPickerMsgId === message._id && (
                      <EmojiPicker
                        isOwn={isOwn}
                        onSelect={(emoji) => reactToMessage(message._id, emoji)}
                        onClose={() => setEmojiPickerMsgId(null)}
                      />
                    )}
                  </AnimatePresence>

                  <div
                    className={`chat-bubble select-none cursor-pointer flex flex-col shadow-sm max-w-xs sm:max-w-sm leading-relaxed ${
                      isOwn
                        ? "bg-primary text-primary-content"
                        : "bg-base-200 text-base-content"
                    }`}
                    onDoubleClick={(e) => { e.stopPropagation(); setEmojiPickerMsgId(message._id); }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ msgId: message._id, x: e.clientX, y: e.clientY, isOwn, message });
                    }}
                  >
                    {message.replyTo && (
                      <ReplyPreview replyTo={message.replyTo} authUser={authUser} selectedUser={selectedUser} />
                    )}
                    {message.image && (
                      <img src={message.image} alt="Attachment" className="max-w-[220px] rounded-lg mb-2 shadow" />
                    )}
                    {message.video && (
                      <video src={message.video} controls className="max-w-[260px] rounded-lg mb-2 shadow" />
                    )}
                    {message.audio && <VoiceNote src={message.audio} />}
                    {message.text && (
                      <p className="text-sm leading-relaxed">
                        {message.text}
                        {message.expiresAt && <SelfDestructTimer expiresAt={message.expiresAt} />}
                        <MessageStatus message={message} isOwn={isOwn} />
                      </p>
                    )}
                    {!message.text && (
                      <span className="inline-flex items-center gap-1">
                        {message.expiresAt && <SelfDestructTimer expiresAt={message.expiresAt} />}
                        <MessageStatus message={message} isOwn={isOwn} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                <ReactionsDisplay
                  reactions={message.reactions}
                  onReact={reactToMessage}
                  messageId={message._id}
                />
              </motion.div>
            </div>
          );
        })}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <TypingBubble profilePic={selectedUser.profilePic} name={selectedUser.fullName} />
          )}
        </AnimatePresence>

        {/* AI Smart Replies */}
        <AnimatePresence>
          {(smartReplies.length > 0 || isLoadingSmartReplies) && (
            <motion.div
              {...fadeUp}
              className="flex flex-wrap items-center gap-2 px-1 pt-1 pb-2"
            >
              <Sparkles className="size-3.5 text-primary shrink-0" />
              {isLoadingSmartReplies ? (
                [60, 80, 72].map((w, i) => (
                  <div key={i} className={`h-7 w-${w === 60 ? "16" : w === 80 ? "20" : "18"} rounded-full bg-base-300 animate-pulse`} />
                ))
              ) : (
                <>
                  {smartReplies.map((reply, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 24, delay: i * 0.06 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => {
                        useChatStore.getState().sendMessage({ text: reply });
                        clearSmartReplies();
                      }}
                      className="text-xs px-3 py-1.5 rounded-full border border-primary/25 text-primary hover:bg-primary hover:text-primary-content transition-all duration-150 font-medium"
                    >
                      {reply}
                    </motion.button>
                  ))}
                  <button onClick={clearSmartReplies} className="btn btn-ghost btn-xs btn-circle opacity-30 hover:opacity-60">
                    <X className="size-3" />
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messageEndRef} />
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            isBookmarked={contextMenu.message?.isBookmarked}
            onPin={() => pinMessage(contextMenu.msgId)}
            onReply={() => setReplyingTo(contextMenu.message)}
            onBookmark={() => toggleBookmark(contextMenu.msgId)}
            onForward={() => setForwardMessage(contextMenu.message)}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {forwardMessage && (
          <ForwardPicker
            message={forwardMessage}
            onClose={() => setForwardMessage(null)}
          />
        )}
      </AnimatePresence>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
