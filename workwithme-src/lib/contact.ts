export const CONTACT_EMAIL = "nickjanocik@gmail.com";

export function calendlyEventUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.hostname !== "calendly.com" ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    if (url.pathname.split("/").filter(Boolean).length < 2) return null;
    return url.href;
  } catch {
    return null;
  }
}

export const CALENDLY_URL = calendlyEventUrl(import.meta.env.VITE_CALENDLY_URL);
// Optional Formspree endpoint. No request is sent unless a real form ID is configured.
export const FORM_ENDPOINT = /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(
  import.meta.env.VITE_FORMSPREE_ENDPOINT ?? "",
)
  ? import.meta.env.VITE_FORMSPREE_ENDPOINT
  : null;

export function emailDraft(fields: {
  name: string;
  email: string;
  business: string;
  message: string;
}) {
  const subject = `Free consultation${fields.business.trim() ? `: ${fields.business.trim()}` : ""}`;
  const body = `Hi Nick,\n\n${fields.message.trim()}\n\nName: ${fields.name.trim()}\nWork email: ${fields.email.trim()}\nBusiness: ${fields.business.trim()}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
