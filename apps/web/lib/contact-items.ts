import type { ProfileInput } from "@sia/validation";

/**
 * Drops contact rows that were opened and never typed into.
 *
 * The editor adds a blank row as soon as someone taps "+ Link", and the schema rightly
 * refuses an empty value — so without this, a curious tap makes a profile unsaveable.
 * A row carrying only a label is kept on purpose: someone meant something by it, and it
 * should fail validation where they can see and fix it rather than quietly disappear.
 */
export function pruneEmptyContactItems(value: ProfileInput): ProfileInput {
  const current = value.contact_items ?? [];
  const items = current.filter((item) => item.label.trim() !== "" || item.value.trim() !== "");
  return items.length === current.length ? value : { ...value, contact_items: items };
}

/**
 * Which wizard step owns each field. A validation failure on an earlier step must send
 * the person back to it — otherwise the message is set but never rendered, and the
 * submit button looks broken.
 */
export const fieldStep: Record<string, number> = {
  display_name: 0,
  username: 0,
  role: 0,
  bio: 0,
  current_context: 1,
  interests: 2,
  open_to: 2,
  contact_items: 2,
  profile_character: 3,
  profile_theme: 3,
  is_public: 4,
};
