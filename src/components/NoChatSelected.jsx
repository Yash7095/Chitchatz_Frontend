import { MessageSquare, Zap, Shield, Smile, Users, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Zap,      text: "Real-time messaging",      color: "text-yellow-500",  bg: "bg-yellow-500/10"  },
  { icon: Sparkles, text: "AI Smart Replies",          color: "text-purple-500",  bg: "bg-purple-500/10"  },
  { icon: Shield,   text: "End-to-end encrypted",      color: "text-green-500",   bg: "bg-green-500/10"   },
  { icon: Smile,    text: "Reactions & voice notes",   color: "text-pink-500",    bg: "bg-pink-500/10"    },
  { icon: Users,    text: "Group chats",                color: "text-blue-500",    bg: "bg-blue-500/10"    },
];

const NoChatSelected = () => (
  <div className="w-full flex flex-1 flex-col items-center justify-center p-8 bg-base-100/40">
    <div className="max-w-sm w-full text-center space-y-8">

      {/* Animated icon */}
      <div className="flex justify-center">
        <div className="relative">
          {/* Pulse rings */}
          {[1, 1.6, 2.2].map((scale, i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, scale, 1], opacity: [0.15, 0, 0.15] }}
              transition={{ repeat: Infinity, duration: 2.8, delay: i * 0.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-3xl border border-primary/30"
            />
          ))}
          {/* Icon box */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="relative w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10"
          >
            <MessageSquare className="w-9 h-9 text-primary" />
          </motion.div>
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 28 }}
          className="text-2xl font-bold"
        >
          Welcome to Chitchatz
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, type: "spring", stiffness: 400, damping: 28 }}
          className="text-sm text-base-content/40"
        >
          Select a conversation from the sidebar to get started
        </motion.p>
      </div>

      {/* Feature pills */}
      <div className="grid grid-cols-1 gap-2">
        {features.map(({ icon: Icon, text, color, bg }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.22 + i * 0.07, type: "spring", stiffness: 400, damping: 26 }}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${bg}`}
          >
            <Icon className={`size-4 shrink-0 ${color}`} />
            <span className="text-sm text-base-content/60">{text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

export default NoChatSelected;
