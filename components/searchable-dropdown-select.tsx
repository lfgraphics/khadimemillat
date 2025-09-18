"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
    value: string;
    label: string;
};

type SearchableDropDownSelectProps = {
    options: ComboboxOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    className?: string;
    width?: string;
    onCreateOption?: (label: string) => void; // allow creating a new option
};

const SearchableDropDownSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select option...",
    searchTerm,
    onSearchTermChange,
    className,
    width = "w-[200px]",
    onCreateOption,
}: SearchableDropDownSelectProps) => {
    const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const [open, setOpen] = React.useState(false);

    const filteredOptions = React.useMemo(() => {
        const search = searchTerm.toLowerCase().trim();
        return options.filter((item) =>
            item?.label?.toLowerCase().includes(search)
        );
    }, [options, searchTerm]);

    // Focus input and reset highlight on open
    React.useEffect(() => {
        if (open) {
            inputRef.current?.focus();
            setHighlightedIndex(0);
        } else {
            setHighlightedIndex(-1);
        }
    }, [open, filteredOptions]);

    // Close on outside click
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle keyboard events on dropdown container
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!open) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                Math.min(prev + 1, filteredOptions.length - 1)
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const toSelect =
                filteredOptions[highlightedIndex] || filteredOptions[0];
            if (toSelect) {
                onChange(toSelect.value === value ? "" : toSelect.value);
                setOpen(false);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        }
    };

    function escapeRegExp(s: string){
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
    function highlight(label: string, term: string){
        if (!term) return [label]
        const parts = label.split(new RegExp(`(${escapeRegExp(term)})`, 'ig'))
        return parts.map((part, i) => part.toLowerCase() === term.toLowerCase() ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>)
    }

    return (
        <div
            ref={wrapperRef}
            className={cn("relative", width, className)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center justify-between w-full border px-3 py-2 rounded-md text-left bg-background"
            >
                <span>
                    {value
                        ? options.find((opt) => opt.value === value)?.label
                        : placeholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>

            {open && (
                <div
                    ref={dropdownRef}
                    className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-md max-h-60 overflow-auto"
                >
                    <input
                        ref={inputRef}
                        className="w-full p-2 border-b outline-none"
                        value={searchTerm}
                        onChange={(e) => onSearchTermChange(e.target.value)}
                        placeholder="Search..."
                    />
                    {filteredOptions.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground flex flex-col gap-2">
                            <span>No option found.</span>
                            {onCreateOption && searchTerm.trim() !== '' && (
                                <button
                                    type="button"
                                    className="text-primary underline text-left"
                                    onClick={() => {
                                        onCreateOption(searchTerm.trim());
                                        setOpen(false);
                                    }}
                                >
                                    Create "{searchTerm.trim()}"
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredOptions.map((item, index) => {
                            const uniqueKey = `${item.value}-${index}`;
                            return (
                            <div
                                key={uniqueKey}
                                role="option"
                                aria-selected={value === item.value}
                                className={cn(
                                    "flex items-center px-3 py-2 cursor-pointer",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    index === highlightedIndex && "bg-accent text-accent-foreground",
                                    value === item.value && "font-semibold"
                                )}
                                onClick={() => {
                                    onChange(item.value === value ? "" : item.value);
                                    setOpen(false);
                                }}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4",
                                        value === item.value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <span>{highlight(item.label, searchTerm)}</span>
                            </div>
                        )})
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableDropDownSelect;