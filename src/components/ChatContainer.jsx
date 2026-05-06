import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Pin, Sparkles, X, Timer } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import VoiceNote from "./VoiceNote";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime, isSameDay, formatDateDivider } from "../lib/utils";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "👍", "🔥"];

// ── Sub-components ──────────────────────────────────────────────────────────

const MessageStatus = ({ message, isOwn }) => {
  if (!isOwn) return null;
  if (message.status === "read")
    return <CheckCheck className="size-3.5 text-blue-400 inline-block ml-1" />;
  if (message.status === "delivered")
    return <CheckCheck className="size-3.5 opacity-40 inline-block ml-1" />;
  return <Check className="size-3.5 opacity-40 inline-block ml-1" />;
};

const ReplyPreview = ({ replyTo, authUser, selectedUser }) => {
  if (!replyTo) return null;
  const senderId = replyTo.senderId?._id || replyTo.senderId;
  const isOwn = senderId === authUser._id;
  return (
    <div className="mb-1.5 px-2 py-1.5 rounded-lg bg-black/10 border-l-2 border-primary/60 text-xs max-w-xs">
      <p className="font-semibold opacity-70 mb-0.5">{isOwn ? "You" : selectedUser.fullName}</p>
      <p className="truncate opacity-60">
        {replyTo.text || (replyTo.image ? "📷 Photo" : replyTo.video ? "🎥 Video" : "🎵 Audio")}
      </p>
    </div>
  );
};

const ReactionsDisplay = ({ reactions, onReact, messageId }) => {
  if (!reactions?.length) return null;
  const grouped = {};
  reactions.forEach(({ emoji }) => {
    grouped[emoji] = (grouped[emoji] || 0) + 1;
  });
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact(messageId, emoji)}
          className="flex items-center gap-0.5 text-xs bg-base-200 hover:bg-base-300 rounded-full px-1.5 py-0.5 transition-colors border border-base-300"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="opacity-60">{count}</span>}
        </button>
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
    <span className="inline-flex items-center gap-0.5 text-xs opacity-50 ml-1">
      <Timer className="size-3" /> {remaining}
    </span>
  );
};

const EmojiPicker = ({ onSelect, onClose, isOwn }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 4 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.15 }}
    className={`absolute ${isOwn ? "right-0" : "left-0"} -top-10 flex gap-1 bg-base-100 rounded-full shadow-xl border border-base-300 px-2 py-1.5 z-20`}
  >
    {REACTION_EMOJIS.map((e) => (
      <button
        key={e}
        onClick={() => { onSelect(e); onClose(); }}
        className="text-lg hover:scale-125 transition-transform"
      >
        {e}
      </button>
    ))}
  </motion.div>
);

const ContextMenu = ({ x, y, onPin, onReply, onClose, isOwn }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.12 }}
    className="fixed z-50 bg-base-100 rounded-xl shadow-2xl border border-base-300 py-1 min-w-36 overflow-hidden"
    style={{ top: y, left: Math.min(x, window.innerWidth - 160) }}
    onClick={(e) => e.stopPropagation()}
  >
    {!isOwn && (
      <button
        onClick={() => { onReply(); onClose(); }}
        className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2 transition-colors"
      >
        ↩ Reply
      </button>
    )}
    <button
      onClick={() => { onPin(); onClose(); }}
      className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 flex items-center gap-2 transition-colors"
    >
      <Pin className="size-3.5" /> Pin message
    </button>
  </motion.div>
);

const TypingBubble = ({ profilePic, name }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 4 }}
    className="chat chat-start"
  >
    <div className="chat-image avatar">
      <div className="size-10 rounded-full border">
        <img src={profilePic || "/avatar.png"} alt={name} />
      </div>
    </div>
    <div className="chat-bubble flex items-center gap-1 py-3 px-4 min-h-0">
      <span className="size-2 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
      <span className="size-2 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
      <span className="size-2 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
    </div>
  </motion.div>
);

// ── Main component ───────────────────────────────────────────────────────────

const ChatContainer = () => {
  const {
    messages, getMessages, isMessagesLoading, selectedUser,
    subscribeToMessages, unSubscribeFromMessages,
    isTyping, setReplyingTo,
    reactToMessage, pinMessage,
    smartReplies, isLoadingSmartReplies, clearSmartReplies,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { msgId, x, y, isOwn }

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unSubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unSubscribeFromMessages]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Close menus on outside click
  useEffect(() => {
    const close = () => { setEmojiPickerMsgId(null); setContextMenu(null); };
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const handleReact = (messageId, emoji) => {
    reactToMessage(messageId, emoji);
  };

  const handleContextMenu = (e, message, isOwn) => {
    e.preventDefault();
    setContextMenu({ msgId: message._id, x: e.clientX, y: e.clientY, isOwn, message });
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto" onClick={() => { setEmojiPickerMsgId(null); setContextMenu(null); }}>
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.map((message, idx) => {
          const isOwn = message.senderId === authUser._id;
          const prevMessage = messages[idx - 1];
          const showDateDivider = !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt);
          const isLastMsg = idx === messages.length - 1;

          return (
            <div key={message._id}>
              {showDateDivider && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-base-300" />
                  <span className="text-xs text-base-content/40 font-medium px-2 bg-base-100 rounded-full py-0.5">
                    {formatDateDivider(message.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-base-300" />
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, x: isOwn ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`chat ${isOwn ? "chat-end" : "chat-start"}`}
                ref={isLastMsg ? messageEndRef : null}
              >
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border">
                    <img
                      src={isOwn ? authUser.profilePic || "/avatar.png" : selectedUser.profilePic || "/avatar.png"}
                      alt="profile"
                    />
                  </div>
                </div>

                <div className="chat-header mb-1 flex items-center gap-2">
                  <time className="text-xs opacity-40">{formatMessageTime(message.createdAt)}</time>
                  {message.isPinned && <Pin className="size-3 text-primary opacity-60" />}
                </div>

                {/* Bubble + emoji picker wrapper */}
                <div className="relative group">
                  <AnimatePresence>
                    {emojiPickerMsgId === message._id && (
                      <EmojiPicker
                        isOwn={isOwn}
                        onSelect={(emoji) => handleReact(message._id, emoji)}
                        onClose={() => setEmojiPickerMsgId(null)}
                      />
                    )}
                  </AnimatePresence>

                  <div
                    className="chat-bubble flex flex-col cursor-pointer select-none"
                    onDoubleClick={(e) => { e.stopPropagation(); setEmojiPickerMsgId(message._id); }}
                    onContextMenu={(e) => handleContextMenu(e, message, isOwn)}
                  >
                    {message.replyTo && (
                      <ReplyPreview replyTo={message.replyTo} authUser={authUser} selectedUser={selectedUser} />
                    )}

                    {message.image && (
                      <img src={message.image} alt="Attachment" className="sm:max-w-[220px] rounded-lg mb-2 shadow" />
                    )}
                    {message.video && (
                      <video src={message.video} controls className="sm:max-w-[280px] rounded-lg mb-2 shadow" />
                    )}
                    {message.audio && <VoiceNote src={message.audio} />}

                    {message.text && (
                      <p className="leading-relaxed">
                        {message.text}
                        {message.expiresAt && <SelfDestructTimer expiresAt={message.expiresAt} />}
                        <MessageStatus message={message} isOwn={isOwn} />
                      </p>
                    )}
                    {!message.text && (
                      <span>
                        {message.expiresAt && <SelfDestructTimer expiresAt={message.expiresAt} />}
                        <MessageStatus message={message} isOwn={isOwn} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions below bubble */}
                <ReactionsDisplay
                  reactions={message.reactions}
                  onReact={handleReact}
                  messageId={message._id}
                />
              </motion.div>
            </div>
          );
        })}

        <AnimatePresence>
          {isTyping && (
            <TypingBubble profilePic={selectedUser.profilePic} name={selectedUser.fullName} />
          )}
        </AnimatePresence>

        {/* AI Smart Replies */}
        <AnimatePresence>
          {(smartReplies.length > 0 || isLoadingSmartReplies) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex flex-wrap items-center gap-2 px-2 pb-2"
            >
              <Sparkles className="size-3.5 text-primary shrink-0" />
              {isLoadingSmartReplies ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-7 w-20 rounded-full bg-base-300 animate-pulse" />
                  ))}
                </>
              ) : (
                <>
                  {smartReplies.map((reply, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => {
                        useChatStore.getState().sendMessage({ text: reply });
                        clearSmartReplies();
                      }}
                      className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary hover:text-primary-content transition-all"
                    >
                      {reply}
                    </motion.button>
                  ))}
                  <button onClick={clearSmartReplies} className="btn btn-ghost btn-xs btn-circle opacity-40">
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
            isOwn={contextMenu.isOwn}
            onPin={() => pinMessage(contextMenu.msgId)}
            onReply={() => setReplyingTo(contextMenu.message)}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
