"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  display_name: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className = "",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          limit: "5",
          countrycodes: "us",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "Accept": "application/json" } }
        );
        if (!res.ok) return;
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
        setActiveIndex(-1);
      } catch {
        // Silently fail — user can still type manually
      }
    }, 350);
  }, []);

  function handleInputChange(val: string) {
    onChange(val);
    fetchSuggestions(val);
  }

  function selectSuggestion(suggestion: Suggestion) {
    onChange(suggestion.display_name);
    setSuggestions([]);
    setShowDropdown(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onClick={() => selectSuggestion(s)}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === activeIndex
                  ? "bg-emerald-600/30 text-emerald-300"
                  : "text-slate-200 hover:bg-slate-700"
              }`}
            >
              {s.display_name}
            </li>
          ))}
          <li className="px-3 py-1.5 text-[10px] text-slate-500 border-t border-slate-700">
            Powered by OpenStreetMap
          </li>
        </ul>
      )}
    </div>
  );
}
