import { useCallback, useState } from "react";
import { readStored, writeStored } from "./storage";

/**
 * Como `useState`, pero recuerda el valor en localStorage (con try/catch).
 * `isValid` descarta valores guardados con otra forma.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid?: (value: unknown) => value is T,
): [T, (next: T | ((previous: T) => T)) => void] {
  const [value, setValue] = useState<T>(() =>
    readStored(key, initial, isValid),
  );

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved =
          typeof next === "function"
            ? (next as (previous: T) => T)(previous)
            : next;
        writeStored(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}
