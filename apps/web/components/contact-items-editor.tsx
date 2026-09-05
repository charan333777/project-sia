"use client";

import { Globe2, LockKeyhole, Mail, Phone, Plus, X } from "lucide-react";
import type { ContactItem, ContactItemType } from "@sia/validation";
import { maxContactItems } from "@sia/validation";

const itemKinds: { type: ContactItemType; label: string; icon: typeof Globe2; placeholder: string; labelPlaceholder: string; inputMode: "url" | "email" | "tel" }[] = [
  { type: "link", label: "Link", icon: Globe2, placeholder: "linkedin.com/in/you", labelPlaceholder: "LinkedIn", inputMode: "url" },
  { type: "email", label: "Email", icon: Mail, placeholder: "you@example.com", labelPlaceholder: "Work", inputMode: "email" },
  { type: "phone", label: "Phone", icon: Phone, placeholder: "+44 7700 900123", labelPlaceholder: "Mobile", inputMode: "tel" },
];

function kindOf(type: ContactItemType) {
  return itemKinds.find((kind) => kind.type === type) ?? itemKinds[0]!;
}

/**
 * Adding a detail and publishing it are separate actions here, mirroring the schema:
 * a new row starts hidden and only the toggle makes it visible to a scanner.
 */
export function ContactItemsEditor({
  value,
  onChange,
  error,
}: {
  value: ContactItem[] | undefined;
  onChange: (next: ContactItem[]) => void;
  error?: string;
}) {
  const items = value ?? [];
  const full = items.length >= maxContactItems;

  const add = (type: ContactItemType) => {
    if (full) return;
    onChange([...items, { type, label: "", value: "", is_public: false } as ContactItem]);
  };

  const patch = (index: number, next: Partial<ContactItem>) => {
    onChange(items.map((item, position) => (position === index ? ({ ...item, ...next } as ContactItem) : item)));
  };

  const remove = (index: number) => onChange(items.filter((_, position) => position !== index));

  return (
    <div className="contact-editor">
      <div className="contact-editor-heading">
        <strong>Ways to reach you</strong>
        <small>Saved either way. Each one is hidden until you make it public.</small>
      </div>

      {items.length > 0 && (
        <ul className="contact-editor-list">
          {items.map((item, index) => {
            const kind = kindOf(item.type);
            const Icon = kind.icon;
            return (
              <li className="contact-editor-row" key={index}>
                <div className="contact-editor-fields">
                  <span className="contact-editor-icon" aria-hidden="true"><Icon size={16} /></span>
                  <input
                    className="contact-editor-label"
                    aria-label={`${kind.label} label`}
                    maxLength={40}
                    placeholder={kind.labelPlaceholder}
                    value={item.label}
                    onChange={(event) => patch(index, { label: event.target.value })}
                  />
                  <input
                    className="contact-editor-value"
                    aria-label={`${kind.label} value`}
                    inputMode={kind.inputMode}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder={kind.placeholder}
                    value={item.value}
                    onChange={(event) => patch(index, { value: event.target.value })}
                  />
                  <button type="button" className="contact-editor-remove" onClick={() => remove(index)} aria-label={`Remove ${kind.label}`}>
                    <X size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  className={`contact-visibility ${item.is_public ? "contact-visibility-public" : ""}`}
                  aria-pressed={item.is_public}
                  onClick={() => patch(index, { is_public: !item.is_public })}
                >
                  {item.is_public ? <><Globe2 size={14} /> Public</> : <><LockKeyhole size={14} /> Hidden</>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="contact-editor-add">
        {itemKinds.map((kind) => (
          <button type="button" className="button button-quiet contact-add-button" key={kind.type} disabled={full} onClick={() => add(kind.type)}>
            <Plus size={15} /> {kind.label}
          </button>
        ))}
      </div>
      {full && <p className="contact-editor-note">That’s all {maxContactItems} — remove one to add another.</p>}
    </div>
  );
}
