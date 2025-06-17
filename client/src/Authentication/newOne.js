export const pageVariants = {
  initial: {
    opacity: 0,
    x: 0,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: 0,
  },
};

export const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.1,
};

export const moonLogoVariants = {
  animate: {
    y: [0, -10, 0],
    rotate: [0, 8, 8, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};
