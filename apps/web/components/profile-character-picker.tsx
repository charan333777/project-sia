"use client";

import { Check, QrCode } from "lucide-react";
import type { ProfileCharacter } from "@sia/validation";
import { profileCharacterOptions } from "./profile-characters";

export function ProfileCharacterPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ProfileCharacter;
  onChange: (character: ProfileCharacter) => void;
  disabled?: boolean;
}) {
  return (
    <div className="profile-character-picker" role="radiogroup" aria-label="Profile character">
      {profileCharacterOptions.map((character) => {
        const selected = value === character.id;
        return (
          <button
            type="button"
            className={`profile-character-option profile-character-option-${character.id} ${selected ? "profile-character-option-selected" : ""}`}
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            key={character.id}
            onClick={() => onChange(character.id)}
          >
            <span className={`profile-character-image ${character.id === "plain" ? "profile-character-image-plain" : ""}`} aria-hidden="true">
              {character.imageSrc
                ? <img src={character.imageSrc} alt="" width="72" height="72" draggable={false} />
                : <QrCode size={37} strokeWidth={1.8} />}
            </span>
            <span className="profile-character-copy"><strong>{character.label}</strong><small>{character.description}</small></span>
            {selected && <Check size={14} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
