import { useEffect, useRef, useState } from "react";
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
const SAVED_WHEELS_STORAGE_KEY = "wheel-library";

type WheelConfig = {
  version: 1;
  mode: WheelMode;
  items: WheelItem[];
};

type SavedWheel = WheelConfig & {
  id: string;
  name: string;
  updatedAt: string;
};

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

function normalizeWholeNumber(value: unknown) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }

  return Math.floor(parsedValue);
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

function createStoredItem(rawItem: unknown, index: number): WheelItem | null {
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  const item = rawItem as Partial<WheelItem>;
  const fallbackColor = getNextColor(index);
  const matchingColor =
    COLORS.find((colorOption) => colorOption.color === item.color) ??
    COLORS.find((colorOption) => colorOption.className === item.colorClass) ??
    fallbackColor;

  return {
    id:
      typeof item.id === "string" && item.id.trim()
        ? item.id
        : crypto.randomUUID(),
    text:
      typeof item.text === "string" && item.text.trim()
        ? item.text
        : `Item ${index + 1}`,
    weight: normalizeWholeNumber(item.weight),
    color: matchingColor.color,
    colorClass: matchingColor.className,
    hidden: Boolean(item.hidden),
    count: normalizeWholeNumber(item.count),
  };
}

function parseStoredItems(savedItems: string): WheelItem[] {
  try {
    const parsedItems = JSON.parse(savedItems);

    if (!Array.isArray(parsedItems)) {
      return createDefaultItems();
    }

    const normalizedItems = parsedItems
      .map((item, index) => createStoredItem(item, index))
      .filter((item): item is WheelItem => item !== null);

    return normalizedItems.length > 0 ? normalizedItems : createDefaultItems();
  } catch {
    return createDefaultItems();
  }
}

function parseWheelConfig(rawConfig: string): WheelConfig {
  const parsedConfig = JSON.parse(rawConfig) as Partial<WheelConfig>;

  if (!parsedConfig || typeof parsedConfig !== "object") {
    throw new Error("Invalid wheel configuration.");
  }

  if (!Array.isArray(parsedConfig.items)) {
    throw new Error("The configuration does not contain wheel items.");
  }

  const normalizedItems = parsedConfig.items
    .map((item, index) => createStoredItem(item, index))
    .filter((item): item is WheelItem => item !== null);

  if (normalizedItems.length === 0) {
    throw new Error("The configuration must contain at least one item.");
  }

  const importedMode = parsedConfig.mode;
  const mode =
    importedMode === "elimination" || importedMode === "accumulation"
      ? importedMode
      : "normal";

  return { version: 1, mode, items: normalizedItems };
}

function parseSavedWheels(savedWheels: string | null): SavedWheel[] {
  if (!savedWheels) return [];

  try {
    const parsedWheels = JSON.parse(savedWheels);
    if (!Array.isArray(parsedWheels)) return [];

    return parsedWheels.flatMap((rawWheel): SavedWheel[] => {
      if (!rawWheel || typeof rawWheel !== "object") return [];

      const wheel = rawWheel as Partial<SavedWheel>;
      const name = typeof wheel.name === "string" ? wheel.name.trim() : "";
      if (!name || !Array.isArray(wheel.items)) return [];

      const items = wheel.items
        .map((item, index) => createStoredItem(item, index))
        .filter((item): item is WheelItem => item !== null);
      if (items.length === 0) return [];

      const mode =
        wheel.mode === "elimination" || wheel.mode === "accumulation"
          ? wheel.mode
          : "normal";

      return [
        {
          id:
            typeof wheel.id === "string" && wheel.id
              ? wheel.id
              : crypto.randomUUID(),
          name,
          version: 1,
          mode,
          items,
          updatedAt:
            typeof wheel.updatedAt === "string"
              ? wheel.updatedAt
              : new Date().toISOString(),
        },
      ];
    });
  } catch {
    return [];
  }
}

function App() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<WheelItem[]>(() => {
    const savedItems = localStorage.getItem(ITEMS_STORAGE_KEY);

    if (!savedItems) {
      return createDefaultItems();
    }

    return parseStoredItems(savedItems);
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
  const [addItemError, setAddItemError] = useState("");
  const [previousItemText, setPreviousItemText] = useState("");
  const [configStatus, setConfigStatus] = useState("");
  const [savedWheels, setSavedWheels] = useState<SavedWheel[]>(() =>
    parseSavedWheels(localStorage.getItem(SAVED_WHEELS_STORAGE_KEY)),
  );
  const [activeSavedWheelId, setActiveSavedWheelId] = useState("");
  const [savedWheelName, setSavedWheelName] = useState("");

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

  useEffect(() => {
    localStorage.setItem(SAVED_WHEELS_STORAGE_KEY, JSON.stringify(savedWheels));
  }, [savedWheels]);

  function handleAddItem() {
    const trimmedText = newItemText.trim();
    const normalizedText = trimmedText.toLowerCase();

    if (!trimmedText) {
      setAddItemError("Please enter an item name.");
      return;
    }

    const itemAlreadyExists = items.some(
      (item) => item.text.trim().toLowerCase() === normalizedText,
    );

    if (itemAlreadyExists) {
      setAddItemError("That item is already on the wheel.");
      return;
    }

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
    setAddItemError("");
  }

  function handleResetSavedWheel() {
    const shouldReset = window.confirm(
      "Reset the wheel back to the default items? This will remove your saved custom wheel.",
    );

    if (!shouldReset) return;

    setItems(createDefaultItems());
    setMode("normal");
    setNewItemText("");
    setAddItemError("");
    setActiveSavedWheelId("");
    setSavedWheelName("");
  }

  function handleExportWheel() {
    const config: WheelConfig = { version: 1, mode, items };
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = "big-wheel-config.json";
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setConfigStatus("Wheel exported.");
  }

  async function handleImportWheel(file: File) {
    try {
      const config = parseWheelConfig(await file.text());
      setItems(config.items);
      setMode(config.mode);
      setActiveSavedWheelId("");
      setSavedWheelName("");
      setAddItemError("");
      setConfigStatus(`Imported ${config.items.length} wheel items.`);
    } catch (error) {
      setConfigStatus(
        error instanceof Error ? error.message : "Could not import that file.",
      );
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
    }
  }

  function loadSavedWheel(wheelId: string) {
    const savedWheel = savedWheels.find((wheel) => wheel.id === wheelId);

    if (!savedWheel) {
      setActiveSavedWheelId("");
      setSavedWheelName("");
      return;
    }

    setItems(savedWheel.items.map((item) => ({ ...item })));
    setMode(savedWheel.mode);
    setActiveSavedWheelId(savedWheel.id);
    setSavedWheelName(savedWheel.name);
    setConfigStatus(`Loaded ${savedWheel.name}.`);
  }

  function handleSaveNamedWheel() {
    const name = savedWheelName.trim();

    if (!name) {
      setConfigStatus("Enter a name before saving the wheel.");
      return;
    }

    const updatedAt = new Date().toISOString();

    if (activeSavedWheelId) {
      setSavedWheels((currentWheels) =>
        currentWheels.map((wheel) =>
          wheel.id === activeSavedWheelId
            ? { ...wheel, name, mode, items, updatedAt }
            : wheel,
        ),
      );
      setConfigStatus(`Updated ${name}.`);
      return;
    }

    const savedWheel: SavedWheel = {
      id: crypto.randomUUID(),
      name,
      version: 1,
      mode,
      items: items.map((item) => ({ ...item })),
      updatedAt,
    };

    setSavedWheels((currentWheels) => [...currentWheels, savedWheel]);
    setActiveSavedWheelId(savedWheel.id);
    setConfigStatus(`Saved ${name}.`);
  }

  function handleDuplicateSavedWheel() {
    const sourceWheel = savedWheels.find(
      (wheel) => wheel.id === activeSavedWheelId,
    );

    if (!sourceWheel) {
      setConfigStatus("Select a saved wheel before duplicating it.");
      return;
    }

    const duplicate: SavedWheel = {
      ...sourceWheel,
      id: crypto.randomUUID(),
      name: `${sourceWheel.name} Copy`,
      items: sourceWheel.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
      updatedAt: new Date().toISOString(),
    };

    setSavedWheels((currentWheels) => [...currentWheels, duplicate]);
    setItems(duplicate.items.map((item) => ({ ...item })));
    setMode(duplicate.mode);
    setActiveSavedWheelId(duplicate.id);
    setSavedWheelName(duplicate.name);
    setConfigStatus(`Created ${duplicate.name}.`);
  }

  function handleDeleteSavedWheel() {
    const savedWheel = savedWheels.find(
      (wheel) => wheel.id === activeSavedWheelId,
    );
    if (!savedWheel) return;

    if (!window.confirm(`Delete the saved wheel "${savedWheel.name}"?`)) return;

    setSavedWheels((currentWheels) =>
      currentWheels.filter((wheel) => wheel.id !== savedWheel.id),
    );
    setActiveSavedWheelId("");
    setSavedWheelName("");
    setConfigStatus(`Deleted ${savedWheel.name}.`);
  }

  return (
    <main className={`app ${theme === "dark" ? "dark-theme" : "light-theme"}`}>
      <header className="app-header">
        <img src="/logo.png" alt="Wheel of Destiny logo" className="app-logo" />

        <div className="app-text">
          <h1 className="app-title">Big Wheel</h1>

          <p className="app-subtitle">Choose. Spin. Decide.</p>
        </div>
      </header>

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

      <section className="config-actions" aria-label="Wheel configuration">
        <button className="config-action-button" onClick={handleExportWheel}>
          Export Wheel
        </button>

        <button
          className="config-action-button"
          onClick={() => importInputRef.current?.click()}
        >
          Import Wheel
        </button>

        <input
          ref={importInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Import wheel configuration"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImportWheel(file);
          }}
        />
      </section>

      <section className="saved-wheel-panel" aria-labelledby="saved-wheel-title">
        <h2 id="saved-wheel-title">Saved Wheels</h2>

        <div className="saved-wheel-fields">
          <select
            value={activeSavedWheelId}
            aria-label="Select a saved wheel"
            onChange={(event) => loadSavedWheel(event.target.value)}
          >
            <option value="">Current unsaved wheel</option>
            {savedWheels.map((wheel) => (
              <option value={wheel.id} key={wheel.id}>
                {wheel.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={savedWheelName}
            placeholder="Wheel name"
            aria-label="Saved wheel name"
            onChange={(event) => setSavedWheelName(event.target.value)}
          />
        </div>

        <div className="saved-wheel-actions">
          <button onClick={handleSaveNamedWheel}>Save Current</button>
          <button onClick={handleDuplicateSavedWheel}>Duplicate</button>
          <button
            className="saved-wheel-delete"
            onClick={handleDeleteSavedWheel}
            disabled={!activeSavedWheelId}
          >
            Delete
          </button>
        </div>
      </section>

      {configStatus && (
        <p className="config-status" role="status">
          {configStatus}
        </p>
      )}

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
          onChange={(event) => {
            setNewItemText(event.target.value);
            setAddItemError("");
          }}
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

      {addItemError && <p className="add-item-error">{addItemError}</p>}

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
              onFocus={(event) => {
                setPreviousItemText(event.target.value);
              }}
              onChange={(event) => {
                const newText = event.target.value.trim().toLowerCase();

                const duplicateExists = items.some(
                  (currentItem) =>
                    currentItem.id !== item.id &&
                    currentItem.text.trim().toLowerCase() === newText,
                );

                if (duplicateExists) {
                  setAddItemError("That item is already on the wheel.");
                  return;
                }

                setAddItemError("");

                setItems((prevItems) =>
                  prevItems.map((currentItem) =>
                    currentItem.id === item.id
                      ? { ...currentItem, text: event.target.value }
                      : currentItem,
                  ),
                );
              }}
              onBlur={(event) => {
                if (!event.target.value.trim()) {
                  setAddItemError("Item names cannot be blank.");

                  setItems((prevItems) =>
                    prevItems.map((currentItem) =>
                      currentItem.id === item.id
                        ? { ...currentItem, text: previousItemText }
                        : currentItem,
                    ),
                  );
                }
              }}
            />

            <label className="weight-input-label">
              Weight
              <input
                className="weight-input"
                type="number"
                min="0"
                step="1"
                value={item.weight === 0 ? "" : item.weight}
                onChange={(event) =>
                  setItems((prevItems) =>
                    prevItems.map((currentItem) =>
                      currentItem.id === item.id
                        ? {
                            ...currentItem,
                            weight: normalizeWholeNumber(event.target.value),
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
              aria-label={`Delete ${item.text || "item"}`}
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
}

export default App;
