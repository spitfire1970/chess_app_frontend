// components/AutoCompleteInput.tsx
"use client"

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/config";

interface AutoCompleteInputProps {
  value: string;
  setValue: (val: string) => void;
  placeholder?: string;
}

const MyInput = ({ value, setValue, placeholder = "" }: AutoCompleteInputProps) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/autocomplete_usernames?query=${value}`);
        setSuggestions(response.data);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    };

    fetchSuggestions();
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring focus:ring-pumpkin"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-10 bg-black border border-gray-700 w-full mt-1 rounded shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <li
              key={idx}
              onClick={() => {
                setValue(s);
                setShowDropdown(false);
              }}
              className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyInput;
