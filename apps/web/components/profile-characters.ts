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
  { id: "explorer", label: "Explorer", description: "Ready for something new", imageSrc: "/mascots/explorer.svg" },
  { id: "maker", label: "Maker", description: "Curious & creative", imageSrc: "/mascots/maker.svg" },
  { id: "dreamer", label: "Dreamer", description: "Thoughtful & imaginative", imageSrc: "/mascots/dreamer.svg" },
  { id: "spark", label: "Spark", description: "Up for a conversation", imageSrc: "/mascots/spark.svg" },
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
