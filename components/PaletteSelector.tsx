"use client";

import { useState, useEffect } from "react";

interface Palette {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const palettes: Palette[] = [
  {
    id: "palette-12",
    name: "Quantum Superposition",
    description: "Deep blue with soft touches",
    colors: {
      primary: "#232946",
      secondary: "#b8c1ec",
      accent: "#eebbc3",
    },
  },
  {
    id: "palette-13",
    name: "Energetic Entanglement",
    description: "Dark with vibrant energy",
    colors: {
      primary: "#0f0e17",
      secondary: "#a7a9be",
      accent: "#ff8906",
    },
  },
  {
    id: "palette-16",
    name: "Wave Collapse",
    description: "Earthy and warm tones",
    colors: {
      primary: "#55423d",
      secondary: "#fff3ec",
      accent: "#ffc0ad",
    },
  },
];

export default function PaletteSelector() {
  const [currentPalette, setCurrentPalette] = useState<string>("palette-12");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    // Load saved palette from localStorage
    const savedPalette = localStorage.getItem("selectedPalette");
    if (savedPalette) {
      setCurrentPalette(savedPalette);
      document.documentElement.setAttribute("data-palette", savedPalette);
    }
  }, []);

  const handlePaletteChange = (paletteId: string) => {
    setCurrentPalette(paletteId);
    document.documentElement.setAttribute("data-palette", paletteId);
    localStorage.setItem("selectedPalette", paletteId);
    setIsOpen(false);
  };

  const currentPaletteData = palettes.find((p) => p.id === currentPalette);

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          border: "1px solid var(--border-secondary)",
          color: "var(--text-primary)",
        }}
        title="Change color palette"
      >
        <div className="flex gap-1">
          <div
            className="w-4 h-4 rounded-full border"
            style={{
              backgroundColor: currentPaletteData?.colors.primary,
              borderColor: "var(--border-secondary)",
            }}
          />
          <div
            className="w-4 h-4 rounded-full border"
            style={{
              backgroundColor: currentPaletteData?.colors.secondary,
              borderColor: "var(--border-secondary)",
            }}
          />
          <div
            className="w-4 h-4 rounded-full border"
            style={{
              backgroundColor: currentPaletteData?.colors.accent,
              borderColor: "var(--border-secondary)",
            }}
          />
        </div>
        <svg
          className="w-4 h-4 transition-transform"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-72 rounded-lg shadow-xl z-50 overflow-hidden"
          style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-secondary)",
          }}
        >
          <div
            className="px-4 py-3 border-b"
            style={{
              borderColor: "var(--border-secondary)",
              backgroundColor: "var(--bg-tertiary)",
            }}
          >
            <h3
              className="font-semibold text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              🎨 Choose Color Palette
            </h3>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Select a palette to customize the interface
            </p>
          </div>

          <div className="p-2">
            {palettes.map((palette) => (
              <button
                key={palette.id}
                onClick={() => handlePaletteChange(palette.id)}
                className="w-full p-3 rounded-lg transition-all duration-200 text-left"
                style={{
                  backgroundColor:
                    currentPalette === palette.id
                      ? "var(--bg-hover)"
                      : "transparent",
                  border:
                    currentPalette === palette.id
                      ? "1px solid var(--accent-primary)"
                      : "1px solid transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Color Preview */}
                  <div className="flex gap-1">
                    <div
                      className="w-6 h-6 rounded border"
                      style={{
                        backgroundColor: palette.colors.primary,
                        borderColor: "var(--border-secondary)",
                      }}
                    />
                    <div
                      className="w-6 h-6 rounded border"
                      style={{
                        backgroundColor: palette.colors.secondary,
                        borderColor: "var(--border-secondary)",
                      }}
                    />
                    <div
                      className="w-6 h-6 rounded border"
                      style={{
                        backgroundColor: palette.colors.accent,
                        borderColor: "var(--border-secondary)",
                      }}
                    />
                  </div>

                  {/* Palette Info */}
                  <div className="flex-1">
                    <div
                      className="font-medium text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {palette.name}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {palette.description}
                    </div>
                  </div>

                  {/* Check Icon */}
                  {currentPalette === palette.id && (
                    <svg
                      className="w-5 h-5"
                      style={{ color: "var(--accent-primary)" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>


        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
