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

With a valid HTTPS `calendly.com/person/event` URL set, the closing consultation button opens the embedded scheduler and moves keyboard focus to it. It has an external booking-page fallback and lazy loading. A local confirmation appears only after an event-scheduled message from Calendly's exact iframe and origin.

Calendly automatically sends booking details to the event host's login email, in addition to the calendar event. That is the mechanism that sends details to Nick; no custom email server or paid workflow is needed for this host notification. See [scheduling notifications](https://calendly.com/help/calendly-scheduling-notifications) and [email destinations](https://calendly.com/help/how-to-manage-multiple-calendars-and-email-addresses).

## Contact form

The form is available under **Prefer to send a note?** Without a form service, **Prepare an email** opens a prefilled email draft addressed to `nickjanocik@gmail.com`. The adjacent explanation tells visitors to review and send it in their email app. The page never claims delivery and retains the entered text.

For direct delivery without an email app, optionally create and verify a Formspree form with the same recipient. Set `VITE_FORMSPREE_ENDPOINT` to its actual `https://formspree.io/f/FORM_ID` endpoint and rebuild. Configure spam protection in that service. The website uses a 15-second timeout and shows success only after an HTTP success response with `ok: true`; otherwise it retains the note and presents the verified email fallback. No API secret belongs in a `VITE_` variable.

## Source and styling

- `workwithme-src/App.tsx`: narrative composition, hero, introduction and editorial sections.
- `workwithme-src/content.json`: complete approved narrative. The second design pass uses shorter visible introductions, with detailed copy in native expandable sections.
- `workwithme-src/styles.css`: Tailwind v4 and the original independent theme. `redesign.css` contains the quieter forest, cream, and lime visual direction.
- `workwithme-src/components/ui/glyph-portal.tsx`: supplied Glyph Portal, with the original Christian Katzmann MIT attribution retained. Its Next.js-only `use client` directive is omitted for Vite.
- `workwithme-src/components/possibilities.tsx`: four illustrative workflow windows opened from a liquid-glass app dock. Tabs support arrow keys, Home/End, and visible focus.
- `workwithme-src/components/booking.tsx`: embedded appointments and truthful email/form-service states.
- `workwithme-src/components/depth-motion.ts`: lightweight z-axis approach motion using native document scroll.
- `workwithme-src/components.json`, `tsconfig.json`, and `lib/utils.ts`: shadcn-compatible structure, TypeScript and `@/` aliases. `components/ui` is the dedicated location for reusable components, matching shadcn and 21st.dev imports. No CLI scaffold is needed; the setup is already installed. For future shadcn additions, run its CLI from `workwithme-src` so aliases resolve in this isolated page.

### Five design elements, integrated in sequence

1. `components/ui/prisma-hero.tsx`: the supplied hero's framing, oversized typography, staggered words, pill CTA, and inset navigation treatment.
2. `components/ui/scanner-card-stream.tsx`: business-sector symbols become illustrative workflow code as they cross a scanning beam. This uses clipped DOM layers instead of an extra WebGL renderer.
3. `components/ui/liquid-glass.tsx`: refractive glass app dock with custom JobNotes, Orderly, BillFinder, and Plan B icons. One example is visible at a time.
4. `components/ui/floating-particles.tsx`: a bounded Three.js point cloud with continuously changing gold, cyan, and lavender colors.
5. `components/ui/tubes-cursor.tsx`: the supplied metallic tubes follow the pointer around the closing invitation. A separate button cycles curated palettes without interfering with the contact CTA. Its patched local vendor module is lazy-loaded near that section; see `vendor/README.md` for upstream attribution and lifecycle fixes.

`components/motion-settings.tsx` supplies one **Motion on/off** control. It follows the system's reduced-motion preference initially and responds to changes. The portal, word entrance, scanner, particles, tubes, and CSS movement all honor it. The canvas effects pause offscreen and have static fallbacks. Canvas effects are scoped to their sections and let pointer/touch input pass through to page controls. No external image, font, or animation CDN is needed at runtime.

### Full-width shader direction

The third design pass replaces the inset Prisma frame and particle hero with `components/ui/hero.tsx`: oversized centered typography over Paper's Mesh Gradient and Pulsing Border shaders. `components/ui/hero-shader.tsx` mounts the actual shader library through a small guarded adapter, so unsupported WebGL, failed shader setup, and delayed image decoding retain a CSS fallback. Both Paper packages are pinned to `0.0.80`. The original snippet's unsupported `wireframe`, `backgroundColor`, and `spotsPerColor` properties are omitted or mapped to the current API. The only noise texture is bundled in the package; no image service is called.

The **Stir the flow** button cycles three palettes and announces the choice. Pointer movement gently changes perspective, while touch scrolling remains native. The shader stages stop when motion is disabled, the hero is offscreen, or the tab is hidden. Drawing is capped at 1.2 million pixels for the mesh and 500,000 for the luminous ring. Shader modules load separately from the page's text and controls. See [Paper's Mesh Gradient](https://shaders.paper.design/mesh-gradient) and [Pulsing Border](https://shaders.paper.design/pulsing-border).

`components/ui/section-transition.tsx` and `transitions.css` join every major section with a scroll-responsive ribbon, fold, or converging curve. These are short decorative boundaries that match the neighboring backgrounds. They do not intercept scrolling or move interactive content.

`components/ui/section-vignettes.tsx` adds connected conversation bubbles to the relationship section, moving sample records to the small-test section, and dimensional punctuation to the FAQ. Each SVG animation stops offscreen and shares the page's motion preference. `vignettes.css` controls these illustrations; `experience.css` contains the new visual direction and responsive refinements. Existing app-dock, scanner, letter-portal, and tube interactions remain.

### Collectibles and research

The hero now reads **“Make room. For better work.”** Its quieter shader background frames a catalog of 12 procedural industry symbols: a construction hardhat, delivery truck, medical kit, house, coffee cup, shopping bag, calculator, book, manufacturing gear, plant, chef’s hat, and briefcase. `components/ui/industry-objects.ts` builds their geometry; `falling-code-objects.tsx` handles the fall and code bursts. There are 24 staggered objects on desktop and 12 on mobile. Each breaks into compact four-line code fragments (32 lines on desktop, 24 on mobile), without expanding circles. Shared geometry and textures keep the denser scene bounded. No image or model downloads are needed. A single transparent renderer is limited to 1.25 million pixels, pauses with the shared motion setting and hero visibility, and releases resources on unmount or context loss. `falling-code-objects.css` provides a static fallback. The portrait ornament was removed.

`components/research.tsx` adds three manually selected evidence chapters between the approach and experience sections, joined by the existing animated transitions. Keyboard users can switch tabs with arrows or Home/End; native disclosures hold the supporting context. `lib/research-evidence.ts` stores the source links, populations, years, and qualifiers (checked September 11, 2026). The OECD adoption survey and published QJE productivity study are identified separately from Klarna’s company-reported cost savings. External evidence is not presented as Nick’s client results, and productivity is not converted into guaranteed cash savings. Update the visible figure, unit, and source notes together when changing evidence.

The liked first version is saved in commit `13c430a`, and the completed five-element design is preserved in `7ddb4db`. Subsequent design work stays on `feat/workwithme`.

The letter portal is a progressive enhancement: native anchor links bypass it, keyboard focus reveals content, and the system's reduced-motion preference removes camera movement. The original demo's nested scroll container is deliberately not used. Standard page scrolling remains available. No remote font is required.

Run `npm run test:workwithme` after the build to check booking URL validation, email draft encoding, content boundaries, route assets, and byte-for-byte preservation of the original static site in the build. The suite also checks the tubes adapter’s pause/visibility behavior, late initialization and disposal, listener cleanup, and error fallback with an isolated lifecycle harness.

## Publication notes

Organization references use the supplied anonymized wording until permission to identify the organizations in this consulting context is confirmed. This is not an endorsement strip. Nick's existing sunset portrait is reused. No client proof, testimonials, savings, or production examples were invented.

The new source is ready for the normal Vercel branch/PR workflow. It has not been pushed, merged, or deployed to production as part of implementation.
