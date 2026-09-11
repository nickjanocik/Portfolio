# Work with Nick

Independent freelancing page at **https://nickjanocik.com/workwithme**. It is implemented on branch `feat/workwithme`. The existing portfolio HTML, styles, scripts and assets are preserved.

## Preview and build

Requires Node 20.19+ (or 22.12+) and npm.

```sh
npm ci
npm run dev:workwithme
```

Open `http://127.0.0.1:5183/workwithme/`. This server supports automatic reloads while editing the new page.

`npm run dev` builds the freelancing page and serves the whole existing static site on port 5173. `npm run build` type-checks, builds the page, and assembles both sites into `dist/`. Vercel is configured to run this build and serve `dist/`, including the `/workwithme` directory. No DNS changes are required for the selected path. A custom subdomain can later point to this route with a domain and rewrite configuration, but is not required or configured here.

The root portfolio has no React or Tailwind dependency at runtime. The new route is a separate Vite entry point and stylesheet.

## Activate embedded appointments

The scheduler integration is complete but intentionally has **no fictitious event URL or available time slots**. Until an actual event is connected, every consultation CTA leads to the contact section, where visitors can request a time using the verified email address. No booking or notification has been created during development.

1. Create a [Calendly account](https://calendly.com/signup) using **nickjanocik@gmail.com**.
2. Connect the calendar used to check conflicts and add meetings.
3. Create a **20-minute, one-on-one, free consultation** event. Set your actual available hours, meeting location, time zone, buffers, and minimum notice. The website does not invent availability or a meeting location.
4. Ask only for name, email, business (optional), and “What keeps taking more effort than it should?” Avoid extra qualification questions.
5. Copy the event URL. Create `workwithme-src/.env.local` from `.env.example` and set `VITE_CALENDLY_URL` to that URL. For Vercel, set the same public environment variable in the project's environment settings and redeploy.
6. Book a test appointment yourself, verify the email to **nickjanocik@gmail.com**, verify calendar conflict handling, and cancel the test afterward.

The contact section automatically displays the embedded scheduler when a valid HTTPS `calendly.com/person/event` URL is set. It has an external booking-page fallback and lazy loading. A local confirmation appears only after an event-scheduled message from Calendly's exact iframe and origin.

Calendly automatically sends booking details to the event host's login email, in addition to the calendar event. That is the mechanism that sends details to Nick; no custom email server or paid workflow is needed for this host notification. See [scheduling notifications](https://calendly.com/help/calendly-scheduling-notifications) and [email destinations](https://calendly.com/help/how-to-manage-multiple-calendars-and-email-addresses).

## Contact form

Without a form service, **Send your note** opens a prefilled email draft addressed to `nickjanocik@gmail.com`. The adjacent explanation tells visitors to review and send it in their email app. The page never claims delivery and retains the entered text.

For direct delivery without an email app, optionally create and verify a Formspree form with the same recipient. Set `VITE_FORMSPREE_ENDPOINT` to its actual `https://formspree.io/f/FORM_ID` endpoint and rebuild. Configure spam protection in that service. The website uses a 15-second timeout and shows success only after an HTTP success response with `ok: true`; otherwise it retains the note and presents the verified email fallback. No API secret belongs in a `VITE_` variable.

## Source and styling

- `workwithme-src/App.tsx`: narrative composition, hero, introduction and editorial sections.
- `workwithme-src/content.json`: approved visitor-facing copy, preserving the original section order.
- `workwithme-src/styles.css`: Tailwind v4 plus an independent dark-ink/lime editorial theme.
- `workwithme-src/components/ui/glyph-portal.tsx`: supplied Glyph Portal, with the original Christian Katzmann MIT attribution retained. Its Next.js-only `use client` directive is omitted for Vite.
- `workwithme-src/components/possibilities.tsx`: four accessible workflow tabs and clearly illustrative diagrams.
- `workwithme-src/components/booking.tsx`: embedded appointments and truthful email/form-service states.
- `workwithme-src/components/depth-motion.ts`: lightweight z-axis approach motion using native document scroll.
- `workwithme-src/components.json`, `tsconfig.json`, and `lib/utils.ts`: shadcn-compatible structure, TypeScript and `@/` aliases. `components/ui` is the dedicated location for reusable components, matching shadcn and 21st.dev imports. No CLI scaffold is needed; the setup is already installed. For future shadcn additions, run its CLI from `workwithme-src` so aliases resolve in this isolated page.

The letter portal is a progressive enhancement: native anchor links bypass it, keyboard focus reveals content, and the system's reduced-motion preference removes camera movement. The original demo's nested scroll container is deliberately not used. Standard page scrolling remains available. No remote font is required.

Run `npm run test:workwithme` after the build to check booking URL validation, email draft encoding, content boundaries, route assets, and byte-for-byte preservation of the original static site in the build.

## Publication notes

Organization references use the supplied anonymized wording until permission to identify the organizations in this consulting context is confirmed. This is not an endorsement strip. Nick's existing sunset portrait is reused. No client proof, testimonials, savings, or production examples were invented.

The new source is ready for the normal Vercel branch/PR workflow. It has not been pushed, merged, or deployed to production as part of implementation.
