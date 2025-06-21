// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // your React source files path
  ],
  theme: {
    extend: {
      keyframes: {
        // your existing fade-in
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // new wobble for the moon
        wobble: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%":      { transform: "rotate(3deg)" },
        },
        // new blink for the stars
        blink: {
          "0%, 100%": { opacity: "0.2" },
          "50%":      { opacity: "1" },
        },
      },
      animation: {
        // your existing fade-in
        "fade-in": "fade-in 0.5s ease-in forwards",
        // apply wobble infinitely
        wobble:    "wobble 6s ease-in-out infinite",
        // apply blink infinitely
        blink:     "blink 2s infinite ease-in-out",
      },
    },
  },
  plugins: [],
};
