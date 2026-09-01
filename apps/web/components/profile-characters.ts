import type { ProfileCharacter } from "@sia/validation";

export const profileCharacterOptions: Array<{
  id: ProfileCharacter;
  label: string;
  description: string;
  imageSrc: string | null;
}> = [
  { id: "plain", label: "Plain", description: "Simple & classic", imageSrc: null },
  { id: "puppy", label: "Puppy", description: "Warm & friendly", imageSrc: "/mascots/puppy.png" },
  { id: "elephant", label: "Elephant", description: "Calm & thoughtful", imageSrc: "/mascots/elephant.png" },
  { id: "panda", label: "Panda", description: "Gentle & curious", imageSrc: "/mascots/panda.png" },
  { id: "play", label: "Play", description: "Bright & playful", imageSrc: "/mascots/play.png" },
];

export function getProfileCharacter(value: unknown): ProfileCharacter {
  return profileCharacterOptions.some((character) => character.id === value)
    ? value as ProfileCharacter
    : "plain";
}

export function getProfileCharacterOption(value: unknown) {
  const character = getProfileCharacter(value);
  return profileCharacterOptions.find((option) => option.id === character) ?? profileCharacterOptions[0]!;
}
