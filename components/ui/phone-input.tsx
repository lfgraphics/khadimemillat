"use client";

import React, { useState, useEffect, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// Country data with common countries prioritized
const COUNTRIES = [
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "RU", name: "Russia", dialCode: "+7", flag: "🇷🇺" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966", flag: "🇸🇦" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "EG", name: "Egypt", dialCode: "+20", flag: "🇪🇬" },
  { code: "TR", name: "Turkey", dialCode: "+90", flag: "🇹🇷" },
  { code: "ID", name: "Indonesia", dialCode: "+62", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", dialCode: "+60", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", dialCode: "+66", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", dialCode: "+84", flag: "🇻🇳" },
  { code: "PH", name: "Philippines", dialCode: "+63", flag: "🇵🇭" },
  { code: "BD", name: "Bangladesh", dialCode: "+880", flag: "🇧🇩" },
  { code: "PK", name: "Pakistan", dialCode: "+92", flag: "🇵🇰" },
  { code: "LK", name: "Sri Lanka", dialCode: "+94", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", dialCode: "+977", flag: "🇳🇵" },
];

export interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onCountryChange?: (country: typeof COUNTRIES[0]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultCountry?: string; // Country code like "IN"
  required?: boolean;
  id?: string;
  name?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({
    value = "",
    onChange,
    onCountryChange,
    placeholder = "Enter phone number",
    disabled = false,
    className,
    defaultCountry = "IN",
    required = false,
    id,
    name,
    ...props
  }, ref) => {
    // Parse the initial value to determine country and phone number
    const parsePhoneValue = (val: string) => {
      if (!val) return { country: COUNTRIES.find(c => c.code === defaultCountry) || COUNTRIES[0], phone: "" };
      
      // First check if it starts with a country dial code
      const country = COUNTRIES.find(c => val.startsWith(c.dialCode));
      if (country) {
        return { country, phone: val.slice(country.dialCode.length).trim() };
      }
      
      // Special handling for Indian numbers: if it's a 12-digit number starting with 91
      const digitsOnly = val.replace(/\D/g, "");
      if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
        const indiaCountry = COUNTRIES.find(c => c.code === "IN");
        if (indiaCountry) {
          return { country: indiaCountry, phone: digitsOnly.slice(2) };
        }
      }
      
      return { country: COUNTRIES.find(c => c.code === defaultCountry) || COUNTRIES[0], phone: val };
    };

    const initialParsed = parsePhoneValue(value);
    const [selectedCountry, setSelectedCountry] = useState(initialParsed.country);
    const [phoneNumber, setPhoneNumber] = useState(initialParsed.phone);
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter countries based on search query
    const filteredCountries = COUNTRIES.filter(country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sync with external value changes
    useEffect(() => {
      const parsed = parsePhoneValue(value);
      const currentFullValue = phoneNumber ? `${selectedCountry.dialCode} ${phoneNumber}` : "";
      
      // Only update if the external value is different from our current computed value
      if (value !== currentFullValue) {
        setSelectedCountry(parsed.country);
        setPhoneNumber(parsed.phone);
      }
    }, [value]);

    const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
      setSelectedCountry(country);
      setOpen(false);
      
      // Immediately call onChange with new country
      const newFullNumber = phoneNumber ? `${country.dialCode} ${phoneNumber}` : "";
      if (onChange) {
        onChange(newFullNumber);
      }
      
      if (onCountryChange) {
        onCountryChange(country);
      }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      // Only allow numbers, spaces, hyphens, and parentheses
      let cleanValue = inputValue.replace(/[^\d\s\-\(\)]/g, "");
      
      // Handle special case: if user enters a 12-digit number starting with 91 (Indian country code)
      // and current country is India, strip the 91 prefix
      if (selectedCountry.code === "IN" && cleanValue.replace(/\D/g, "").length === 12) {
        const digitsOnly = cleanValue.replace(/\D/g, "");
        if (digitsOnly.startsWith("91")) {
          cleanValue = digitsOnly.slice(2); // Remove the first two digits (91)
        }
      }
      
      setPhoneNumber(cleanValue);
      
      // Immediately call onChange with new phone number
      const newFullNumber = cleanValue ? `${selectedCountry.dialCode} ${cleanValue}` : "";
      if (onChange) {
        onChange(newFullNumber);
      }
    };



    return (
      <div className={cn("flex", className)}>
        {/* Country Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[140px] justify-between rounded-r-none border-r-0 px-3"
              disabled={disabled}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm font-mono">{selectedCountry.dialCode}</span>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <div className="flex flex-col">
              <div className="flex items-center border-b px-3 py-2">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <input
                  className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Search country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto p-1">
                {filteredCountries.length === 0 ? (
                  <div className="py-6 text-center text-sm">No country found.</div>
                ) : (
                  filteredCountries.map((country) => (
                    <div
                      key={country.code}
                      className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                      onClick={() => handleCountrySelect(country)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <span className="text-lg">{country.flag}</span>
                        <div className="flex-1">
                          <div className="font-medium">{country.name}</div>
                          <div className="text-sm text-muted-foreground font-mono">
                            {country.dialCode}
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            selectedCountry.code === country.code
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Phone Number Input */}
        <Input
          ref={ref}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          id={id}
          maxLength={12}
          name={name}
          className="rounded-l-none flex-1"
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export default PhoneInput;