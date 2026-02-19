import { useState, useRef, useEffect, useCallback } from 'react';

interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Search...',
  required,
  error,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const filtered = query
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
      )
    : options;

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setQuery('');
    setIsOpen(false);
    setHighlightIndex(-1);
  }, [onChange]);

  const handleInputChange = (text: string) => {
    setQuery(text);
    setIsOpen(true);
    setHighlightIndex(-1);
  };

  const handleFocus = () => {
    setIsOpen(true);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          handleSelect(filtered[highlightIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        setHighlightIndex(-1);
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const displayValue = isOpen ? query : (selectedOption?.label || '');

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`
            block w-full px-3 py-2 border rounded-lg shadow-sm bg-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          `}
        />
        {/* Clear button */}
        {value && !isOpen && (
          <button
            type="button"
            onClick={() => { onChange(''); setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {/* Dropdown arrow */}
        {!value && !isOpen && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}

        {/* Dropdown list */}
        {isOpen && (
          <ul
            ref={listRef}
            className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-lg shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">No matches found</li>
            ) : (
              filtered.map((option, idx) => (
                <li
                  key={option.value}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(option.value); }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  className={`
                    px-3 py-2 cursor-pointer text-sm
                    ${idx === highlightIndex ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900 hover:bg-gray-50'}
                    ${option.value === value ? 'font-medium' : ''}
                  `}
                >
                  <div>{option.label}</div>
                  {option.sublabel && (
                    <div className="text-xs text-gray-500">{option.sublabel}</div>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
