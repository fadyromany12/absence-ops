import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State mirrored into localStorage.
 *
 * Load happens once on mount (so the first paint can show a loading state rather
 * than flashing defaults), and every later change is written back. Writes are in
 * an effect rather than inside the setState updater — updaters must stay pure,
 * or StrictMode's double-invoke would fire the side effect twice.
 *
 * @param key       storage key
 * @param initial   value used when nothing is stored
 * @param migrate   optional (parsed) => value, to bring old data up to shape
 */
export function useLocalStorage(key, initial, migrate) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("saved"); // saved | error

  // Held in a ref so the load effect never re-runs when the caller passes a
  // fresh function or object literal.
  const migrateRef = useRef(migrate);
  migrateRef.current = migrate;
  const initialRef = useRef(initial);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        setValue(migrateRef.current ? migrateRef.current(parsed) : parsed);
      }
    } catch {
      // Corrupt, or storage blocked (private mode / disabled cookies).
      // Fall through to defaults rather than dying on load.
      setSaveState("error");
    }
    setLoaded(true);
  }, [key]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      setSaveState("saved");
    } catch {
      setSaveState("error"); // quota exceeded, or storage unavailable
    }
  }, [key, value, loaded]);

  const update = useCallback((fnOrValue) => {
    setValue((prev) => (typeof fnOrValue === "function" ? fnOrValue(prev) : fnOrValue));
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
    setValue(initialRef.current);
  }, [key]);

  return { value, update, clear, loaded, saveState };
}
