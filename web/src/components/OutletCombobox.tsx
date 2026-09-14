"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryOption } from "@/lib/types";

type Props = {
  options: CategoryOption[];
  valueId: string;
  query: string;
  onQueryChange: (query: string) => void;
  onChange: (id: string, name: string) => void;
  required?: boolean;
};

/** Dropdown outlet + bisa diketik (typeahead). */
export function OutletCombobox({
  options,
  valueId,
  query,
  onQueryChange,
  onChange,
  required,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 40);
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 40);
  }, [options, query]);

  function pick(opt: CategoryOption) {
    onChange(opt.id, opt.name);
    onQueryChange(opt.name);
    setOpen(false);
  }

  return (
    <div className="relative" ref={rootRef}>
      <input
        className="input"
        value={query}
        required={required && !valueId && !query.trim()}
        placeholder="Ketik atau pilih nama outlet"
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onChange("", "");
          else {
            const exact = options.find(
              (o) => o.name.toLowerCase() === e.target.value.trim().toLowerCase()
            );
            if (exact) onChange(exact.id, exact.name);
            else if (valueId) onChange("", e.target.value);
          }
        }}
      />
      {open && filtered.length > 0 ? (
        <ul className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-sli-line bg-white py-1 shadow-lg">
          {filtered.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-sli-red-soft"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(opt)}
              >
                {opt.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-1 text-xs text-sli-muted">
        Bisa diketik untuk mencari, atau tulis nama outlet baru.
      </p>
    </div>
  );
}
