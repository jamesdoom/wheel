import { useEffect, useState } from "react";
import type { WheelItem, WheelMode } from "./types";
import WheelCanvas from "./components/Wheel/WheelCanvas";
import "./App.css";

const COLORS = [
  { color: "#f87171", className: "color-red" },
  { color: "#fb923c", className: "color-orange" },
  { color: "#fbbf24", className: "color-yellow" },
  { color: "#34d399", className: "color-green" },
  { color: "#60a5fa", className: "color-blue" },
  { color: "#818cf8", className: "color-indigo" },
  { color: "#a78bfa", className: "color-purple" },
  { color: "#f472b6", className: "color-pink" },
];

const ITEMS_STORAGE_KEY = "wheel-items";
const MODE_STORAGE_KEY = "wheel-mode";
const MUTED_STORAGE_KEY = "wheel-muted";
const THEME_STORAGE_KEY = "wheel-theme";

function getNextColor(index: number) {
  return COLORS[index % COLORS.length];
}

function getLeastUsedColor(items: WheelItem[]) {
  const colorCounts = COLORS.map((colorOption) => ({
    ...colorOption,
    count: items.filter((item) => item.color === colorOption.color).length,
  }));

  return colorCounts.sort((a, b) => a.count - b.count)[0];
}

function createDefaultItems(): WheelItem[] {
  return [
    {
      id: crypto.randomUUID(),
      text: "Pizza",
      weight: 1,
      color: getNextColor(0).color,
      colorClass: getNextColor(0).className,
      hidden: false,
      count: 0,
    },
    {
      id: crypto.randomUUID(),
      text: "Tacos",
      weight: 1,
      color: getNextColor(1).color,
      colorClass: getNextColor(1).className,
      hidden: false,
      count: 0,
    },
    {
      id: crypto.randomUUID(),
      text: "Burgers",
      weight: 1,
      color: getNextColor(2).color,
      colorClass: getNextColor(2).className,
      hidden: false,
      count: 0,
    },
    {
      id: crypto.randomUUID(),
      text: "Sushi",
      weight: 1,
      color: getNextColor(3).color,
      colorClass: getNextColor(3).className,
      hidden: false,
      count: 0,
    },
  ];
}

function App() {
  const [items, setItems] = useState<WheelItem[]>(() => {
    const savedItems = localStorage.getItem(ITEMS_STORAGE_KEY);

    if (!savedItems) {
      return createDefaultItems();
    }

    try {
      return JSON.parse(savedItems) as WheelItem[];
    } catch {
      return createDefaultItems();
    }
  });
  const [mode, setMode] = useState<WheelMode>(() => {
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);

    if (
      savedMode === "normal" ||
      savedMode === "elimination" ||
      savedMode === "accumulation"
    ) {
      return savedMode;
    }

    return "normal";
  });
  const [newItemText, setNewItemText] = useState("");
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem(MUTED_STORAGE_KEY) === "true";
  });
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return "light";
  });

  useEffect(() => {
    localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(MUTED_STORAGE_KEY, String(isMuted));
  }, [isMuted]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function handleAddItem() {
    const trimmedText = newItemText.trim();
    if (!trimmedText) return;

    setItems((prevItems) => {
      const nextColor = getLeastUsedColor(prevItems);

      return [
        ...prevItems,
        {
          id: crypto.randomUUID(),
          text: trimmedText,
          weight: 1,
          color: nextColor.color,
          colorClass: nextColor.className,
          hidden: false,
          count: 0,
        },
      ];
    });

    setNewItemText("");
  }

  return (
    <main className={`app ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      <h1>The Wheel</h1>

      {/* Mode Selector */}
      <section className="mode-panel">
        <label htmlFor="wheel-mode">Mode</label>

        <select
          id="wheel-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as WheelMode)}
        >
          <option value="normal">Normal</option>
          <option value="elimination">Elimination</option>
          <option value="accumulation">Accumulation</option>
        </select>
      </section>

      <div className="controls-row">
        <button
          className="mute-button"
          onClick={() => setIsMuted((prev) => !prev)}
        >
          {isMuted ? "Unmute Sound" : "Mute Sound"}
        </button>

        <button
          className="theme-button"
          onClick={() =>
            setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"))
          }
        >
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      {/* Wheel */}
      <WheelCanvas
        items={items}
        setItems={setItems}
        mode={mode}
        createDefaultItems={createDefaultItems}
        isMuted={isMuted}
        theme={theme}
      />

      {/* Add Item */}
      <section className="add-item-panel">
        <input
          className="add-item-input"
          type="text"
          value={newItemText}
          placeholder="Add new item"
          aria-label="Add new wheel item"
          onChange={(event) => setNewItemText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleAddItem();
            }
          }}
        />

        <button className="add-item-button" onClick={handleAddItem}>
          Add Item
        </button>
      </section>

      {/* Item List */}
      <section className="item-list">
        <h2>Wheel Items</h2>

        {items.map((item) => (
          <div className="item-row" key={item.id}>
            <span className={`color-dot ${item.colorClass}`} />

            <input
              className="item-text-input"
              type="text"
              value={item.text}
              placeholder="Enter item"
              aria-label={`Edit text for ${item.text || "item"}`}
              onChange={(event) =>
                setItems((prevItems) =>
                  prevItems.map((currentItem) =>
                    currentItem.id === item.id
                      ? { ...currentItem, text: event.target.value }
                      : currentItem,
                  ),
                )
              }
            />

            <label className="weight-input-label">
              Weight
              <input
                className="weight-input"
                type="number"
                min="0"
                step="1"
                value={item.weight}
                onChange={(event) =>
                  setItems((prevItems) =>
                    prevItems.map((currentItem) =>
                      currentItem.id === item.id
                        ? {
                            ...currentItem,
                            weight: Number(event.target.value),
                          }
                        : currentItem,
                    ),
                  )
                }
              />
            </label>

            {mode === "accumulation" && (
              <span className="count-display">Count: {item.count}</span>
            )}

            <button
              className="delete-item-button"
              onClick={() =>
                setItems((prevItems) =>
                  prevItems.filter((currentItem) => currentItem.id !== item.id),
                )
              }
            >
              ✕
            </button>
          </div>
        ))}
      </section>

      <button
        className="reset-saved-wheel-button"
        onClick={handleResetSavedWheel}
      >
        Reset Saved Wheel
      </button>
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} The Wheel</p>

        <p>
          Sound Effects by{" "}
          <a
            href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=6346"
            target="_blank"
            rel="noopener noreferrer"
          >
            freesound_community{" "}
          </a>
          from{" "}
          <a
            href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=6346"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pixabay
          </a>
        </p>
      </footer>
    </main>
  );

  function handleResetSavedWheel() {
    const shouldReset = window.confirm(
      "Reset the wheel back to the default items? This will remove your saved custom wheel.",
    );

    if (!shouldReset) return;

    setItems(createDefaultItems());
    setMode("normal");
    setNewItemText("");
  }
}

export default App;
