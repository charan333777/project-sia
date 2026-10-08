import type { ProfileInput } from "@sia/validation";

/** Fictional, never persisted or counted as a public profile view. */
export const sampleProfile: ProfileInput = {
  username: "maya-example", display_name: "Maya", role: "Product designer",
  bio: "I like turning small ideas into useful things. Ask me about the project I’m building.",
  current_context: "At a design meetup in London", interests: ["Design", "Photography", "Travel"],
  open_to: ["Creative ideas", "Coffee", "A quick chat"],
  is_public: true, list_in_search: false, profile_theme: "calm", profile_character: "maker",
  contact_items: [],
};
