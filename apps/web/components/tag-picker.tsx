"use client";

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

export function TagPicker({
  label,
  helper,
  suggestions,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  suggestions: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [custom, setCustom] = useState("");
  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((item) => item !== tag) : value.length < 10 ? [...value, tag] : value);
  };
  const add = () => {
    const tag = custom.trim();
    if (tag && tag.length <= 40 && value.length < 10 && !value.includes(tag)) onChange([...value, tag]);
    setCustom("");
  };

  return (
    <fieldset className="tag-picker">
      <legend>{label}</legend>
      <p>{helper}</p>
      <div className="suggestion-list">
        {suggestions.map((tag) => {
          const selected = value.includes(tag);
          return (
            <button type="button" className={selected ? "chip chip-selected" : "chip"} key={tag} onClick={() => toggle(tag)} aria-pressed={selected}>
              {selected ? <Check size={14} /> : <Plus size={14} />} {tag}
            </button>
          );
        })}
      </div>
      <div className="custom-tag-row">
        <input
          aria-label={`Add custom ${label.toLowerCase()}`}
          value={custom}
          maxLength={40}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); add(); }
          }}
          placeholder="Something else"
        />
        <button type="button" className="small-add" aria-label={`Add custom ${label.toLowerCase()}`} onClick={add}><Plus size={17} /></button>
      </div>
      {value.some((tag) => !suggestions.includes(tag)) && (
        <div className="custom-tags">
          {value.filter((tag) => !suggestions.includes(tag)).map((tag) => (
            <span className="chip chip-selected" key={tag}>{tag}<button type="button" aria-label={`Remove ${tag}`} onClick={() => toggle(tag)}><X size={13} /></button></span>
          ))}
        </div>
      )}
      <span className="tag-count">{value.length} / 10</span>
    </fieldset>
  );
}
