/**
 * The details a privacy policy and terms of service must name, gathered in one place.
 *
 * These are legal identifiers, not copy. They are placeholders until Charan fills them in
 * — a policy that names no controller and gives no contact address does not satisfy UK or
 * EU requirements, and the pages say so plainly rather than pretending otherwise.
 */
export const legalConfig = {
  /** The legal entity or individual responsible for the data. */
  controllerName: "TODO: registered name of the data controller",
  /** A postal address is required for a UK/EU-facing privacy notice. */
  controllerAddress: "TODO: postal address",
  /** Where people send privacy questions and erasure requests. */
  contactEmail: "TODO: contact@yourdomain",
  /** Country whose law governs the terms, and whose courts hear disputes. */
  governingLaw: "TODO: e.g. England and Wales",
  /** ICO registration reference, if registered. */
  supervisoryAuthority: "Information Commissioner’s Office (ICO), United Kingdom",
  lastUpdated: "5 September 2026",
} as const;

/** True once every placeholder has been replaced, so the pages can stop warning. */
export const legalDetailsComplete = !Object.values(legalConfig).some(
  (value) => typeof value === "string" && value.startsWith("TODO:"),
);
