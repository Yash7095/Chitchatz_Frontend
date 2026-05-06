// Shared Framer Motion variants — import these instead of inlining

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: 8  },
  transition: { type: "spring", stiffness: 400, damping: 28 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
  transition: { duration: 0.18 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.88 },
  animate: { opacity: 1, scale: 1    },
  exit:    { opacity: 0, scale: 0.88 },
  transition: { type: "spring", stiffness: 500, damping: 30 },
};

export const slideRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0   },
  exit:    { opacity: 0, x: -10 },
  transition: { type: "spring", stiffness: 380, damping: 28 },
};

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0  },
  exit:    { opacity: 0, x: 10 },
  transition: { type: "spring", stiffness: 380, damping: 28 },
};

export const popIn = {
  initial: { opacity: 0, scale: 0.6 },
  animate: { opacity: 1, scale: 1   },
  exit:    { opacity: 0, scale: 0.6 },
  transition: { type: "spring", stiffness: 600, damping: 22 },
};

// stagger helpers — use as `transition` inside a mapped list
export const staggerChild = (i) => ({
  type: "spring", stiffness: 380, damping: 28, delay: i * 0.04,
});

export const msgBubbleOwn = {
  initial: { opacity: 0, x: 24, scale: 0.94 },
  animate: { opacity: 1, x: 0,  scale: 1    },
  transition: { type: "spring", stiffness: 400, damping: 26 },
};

export const msgBubbleOther = {
  initial: { opacity: 0, x: -24, scale: 0.94 },
  animate: { opacity: 1, x: 0,   scale: 1    },
  transition: { type: "spring", stiffness: 400, damping: 26 },
};
