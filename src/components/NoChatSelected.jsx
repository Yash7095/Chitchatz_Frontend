import { MessageSquare, Zap, Shield, Smile } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  { icon: Zap,     text: "Real-time messaging"      },
  { icon: Shield,  text: "End-to-end encrypted"     },
  { icon: Smile,   text: "Reactions & replies"      },
];

const NoChatSelected = () => (
  <div className="w-full flex flex-1 flex-col items-center justify-center p-16 bg-base-100/50">
    <div className="max-w-sm text-center space-y-8">
      {/* Animated icon */}
      <div className="flex justify-center">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center shadow-lg">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
          {/* Pulse ring */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
            className="absolute inset-0 rounded-3xl border-2 border-primary/40"
          />
        </motion.div>
      </div>

      <div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl font-bold"
        >
          Welcome to Chitchatz
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-base-content/50 mt-2 text-sm"
        >
          Select a conversation to start chatting
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col gap-3"
      >
        {features.map(({ icon: Icon, text }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.08 }}
            className="flex items-center gap-3 text-sm text-base-content/50 bg-base-200 rounded-xl px-4 py-2.5"
          >
            <Icon className="size-4 text-primary shrink-0" />
            {text}
          </motion.div>
        ))}
      </motion.div>
    </div>
  </div>
);

export default NoChatSelected;
