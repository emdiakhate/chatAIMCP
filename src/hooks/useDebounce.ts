import { useState, useEffect } from 'react';

/**
 * Hook pour debouncer une valeur
 * Utile pour la recherche, input fields, etc.
 *
 * @param value - La valeur à debouncer
 * @param delay - Le délai en millisecondes (default: 300ms)
 * @returns La valeur debouncée
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 * useEffect(() => {
 *   // Effectuer la recherche avec debouncedSearchTerm
 *   performSearch(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Créer un timer qui met à jour la valeur après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook pour créer une fonction debouncée
 * Utile pour debouncer des appels de fonction
 *
 * @param callback - La fonction à debouncer
 * @param delay - Le délai en millisecondes (default: 300ms)
 * @returns La fonction debouncée
 *
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback((term: string) => {
 *   performSearch(term);
 * }, 500);
 *
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    // Annuler le timer précédent
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Créer un nouveau timer
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };
}
