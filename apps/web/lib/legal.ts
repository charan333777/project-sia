/**
 * The details a privacy policy and terms of service must name, gathered in one place.
 *
 * Supply accurate owner details through server environment configuration before release.
 * The pages keep a visible warning while required information is missing.
 */
export const legalConfig = {
  /** The legal entity or individual responsible for the data. */
  controllerName: process.env.LEGAL_CONTROLLER_NAME?.trim() || "Controller name not yet provided",
  /** A postal address is required for a UK/EU-facing privacy notice. */
  controllerAddress: process.env.LEGAL_CONTROLLER_ADDRESS?.trim() || "Postal address not yet provided",
  /** Where people send privacy questions and erasure requests. */
  contactEmail: process.env.LEGAL_CONTACT_EMAIL?.trim() || "Contact email not yet provided",
  /** Country whose law governs the terms, and whose courts hear disputes. */
  governingLaw: process.env.LEGAL_GOVERNING_LAW?.trim() || "Governing law not yet provided",
  /** ICO registration reference, if registered. */
  supervisoryAuthority: "Information Commissioner’s Office (ICO), United Kingdom",
  lastUpdated: "30 September 2026",
} as const;

/** Valid contact address enables the mail link; complete details remove the page warning. */
export const legalContactAvailable = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(legalConfig.contactEmail);
export const legalDetailsComplete = [process.env.LEGAL_CONTROLLER_NAME, process.env.LEGAL_CONTROLLER_ADDRESS, process.env.LEGAL_GOVERNING_LAW].every((value) => Boolean(value?.trim())) && legalContactAvailable;
