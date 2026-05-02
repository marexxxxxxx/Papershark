/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#adc6ff",
        "error": "#ffb4ab",
        "secondary-container": "#3f465c",
        "tertiary-container": "#8083ff",
        "inverse-primary": "#005ac2",
        "on-primary-container": "#00285d",
        "inverse-on-surface": "#263143",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        "on-secondary-container": "#adb4ce",
        "on-surface": "#d8e3fb",
        "outline": "#8c909f",
        "on-primary-fixed": "#001a42",
        "outline-variant": "#424754",
        "on-tertiary": "#1000a9",
        "on-secondary": "#283044",
        "primary-fixed-dim": "#adc6ff",
        "on-error": "#690005",
        "tertiary": "#c0c1ff",
        "secondary": "#bec6e0",
        "inverse-surface": "#d8e3fb",
        "on-secondary-fixed": "#131b2e",
        "tertiary-fixed-dim": "#c0c1ff",
        "surface-container-low": "#111c2d",
        "surface-tint": "#adc6ff",
        "surface-variant": "#2a3548",
        "surface-dim": "#081425",
        "primary-fixed": "#d8e2ff",
        "secondary-fixed": "#dae2fd",
        "on-primary": "#002e6a",
        "primary-container": "#4d8eff",
        "on-surface-variant": "#c2c6d6",
        "on-tertiary-container": "#0d0096",
        "surface-container-highest": "#2a3548",
        "on-tertiary-fixed": "#07006c",
        "on-tertiary-fixed-variant": "#2f2ebe",
        "on-primary-fixed-variant": "#004395",
        "on-secondary-fixed-variant": "#3f465c",
        "surface-container-high": "#1f2a3c",
        "surface": "#081425",
        "surface-container-lowest": "#040e1f",
        "on-background": "#d8e3fb",
        "tertiary-fixed": "#e1e0ff",
        "surface-bright": "#2f3a4c",
        "surface-container": "#152031",
        "background": "#081425",
        "secondary-fixed-dim": "#bec6e0",
        // Additional mappings for compatibility with shadcn/ui generic classes if some elements use them:
        border: "#424754", // outline-variant
        input: "#424754",
        ring: "#adc6ff", // primary
        foreground: "#d8e3fb", // on-background
        destructive: {
          DEFAULT: "#ffb4ab", // error
          foreground: "#690005", // on-error
        },
        muted: {
          DEFAULT: "#2a3548", // surface-variant
          foreground: "#8c909f", // outline
        },
        accent: {
          DEFAULT: "#3f465c", // secondary-container
          foreground: "#adb4ce", // on-secondary-container
        },
        card: {
          DEFAULT: "#152031", // surface-container
          foreground: "#d8e3fb", // on-surface
        },
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem",
      },
      spacing: {
        "sm": "8px",
        "margin-page": "24px",
        "gutter": "16px",
        "base-unit": "4px",
        "xl": "32px",
        "lg": "24px",
        "md": "16px",
        "xs": "4px",
      },
      fontFamily: {
        "display-lg": ["Inter", "sans-serif"],
        "label-caps": ["Inter", "sans-serif"],
        "code-mono": ["monospace"],
        "body-sm": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "body-base": ["Inter", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["30px", { "lineHeight": "38px", "letterSpacing": "-0.02em", "fontWeight": "600" }],
        "label-caps": ["11px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }],
        "code-mono": ["13px", { "lineHeight": "20px", "fontWeight": "400" }],
        "body-sm": ["13px", { "lineHeight": "18px", "fontWeight": "400" }],
        "headline-md": ["20px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "body-base": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
      },
    },
  },
  plugins: [],
}
