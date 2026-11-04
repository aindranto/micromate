# Design Plan Micromate v0.2 (frontend-design + design-taste)

Skills used, as adapted for Muse in
`~/workspace/custom-skills/micromate_frontend_design/` and
`~/workspace/custom-skills/micromate_design_taste/`:
frontend-design is the main guide, design-taste (app screens) is the check.
Neither original repo was installed in this project, no API key was used,
and no taste-skill Node script or direction draw was run.

## Subject, audience, job (frontend-design step: ground in the subject)

- Subject: a person's own assets and their upkeep: devices, vehicles, home
  items, warranties, service, vehicle tax, documents, total cost of ownership.
- Audience: the owner, checking what needs attention, not a shopper browsing.
- Job of the dashboard: answer what needs attention next, then let the
  owner act on it in one click (open the asset, record a service, add a
  reminder). Job of the landing page: explain that in one reading, with one
  clear action (start the app).

## Tokens (kept from v0.1.0, not a new brand)

- Colour: emerald-900 #064e3b (primary ground, PWA theme colour), stone
  neutrals for surfaces and text, amber #f59e0b for approaching deadlines,
  rose #e11d48 for overdue or expired items. No new accent hue.
- Type: one family, the system sans stack already in the app. No external
  webfont link, because that would break the PWA offline guarantee.
  Scale: display 24 bold, section 18 semibold, subheading 16 medium,
  body 14 with line height 1.6, small label 12 semibold.
- Layout: dashboard leads with attention, not with a hero. Landing page
  leads with one headline and one action.
- Principles: colour on data, not chrome. KPIs are type, not tiles.
  Surfaces are flat. Data states are honest. One bold element per screen.

## Review against generic defaults (frontend-design step: review before build)

Rejected before building:

- Gradient accent hero text and a decorative glow wash on the landing
  page. They are category defaults, not Micromate's material. Replaced
  with a solid headline and no glow.
- All-caps eyebrow labels above every heading, and all-caps stat labels
  in the mockup. Replaced with sentence case labels.
- KPI cards with an icon in a tinted square and a hover shadow. Replaced
  with a neutral inline icon, a flat border, and no hover shadow, per
  the app-screen rule that KPIs are type, not tiles.
- Invented-looking mockup numbers presented as if real. The landing
  mockup is now labelled as a sample view with sample data, not the
  user's data.

Kept deliberately, with a reason:

- The dashboard welcome banner in emerald-900. It is not a marketing
  hero: it carries the attention count and the three most frequent jobs
  (new asset, service, reminder) in one click. Heading kept modest.
- Big numbers on the dashboard KPI row. They are the data itself
  (counts by category, total cost of ownership in rupiah), not vanity
  stats, and each card navigates to its list.
- The emerald ground and stone surfaces. They are Micromate's existing
  brand, already used for the PWA icon and theme colour.

## Changes in v0.2

- `src/index.css`: design tokens as CSS variables, base body background
  and text colour, visible keyboard focus, and reduced-motion handling
  that disables the entrance animations when the user prefers reduced
  motion.
- `src/components/Dashboard.tsx`: KPI icon tinted boxes removed, icons
  are neutral and inline; KPI cards keep a flat border and lose the
  hover shadow.
- `src/components/LandingPage.tsx`: hero gradient text replaced with a
  solid colour, glow wash removed, eyebrow and stat labels changed from
  all-caps to sentence case, section eyebrows de-emphasised, and the
  dashboard mockup labelled as a sample view.
- `CHANGELOG.md`: v0.2 entry added. This plan file added.

## Browser check (design-taste step)

Result, honestly recorded: the live-browser screenshot check at phone
(around 390px), tablet (around 768px), and desktop (around 1440px) could
NOT be run in this environment. The production build was served locally
and answered 200 to curl, but the live browser environment rejected
loopback addresses (localhost and 127.0.0.1) before any page loaded, so
no screenshots were produced and no visual problem was confirmed or
ruled out from screenshots. A user takeover of that browser would not
fix it either, because a browser on the user's own device would load
its own localhost, not this machine's build server.

Substitute check that WAS run: code-level visual audit of the landing
page and dashboard (responsive grids, flex-wrap, responsive text sizes,
max-width containers, no fixed BottomNav on the landing route, which
returns the landing page alone; BottomNav only appears in the app route,
where the main content already has mobile bottom padding from v0.1.0),
plus a production build and a 200 response from the production server.
This is not a screenshot check, and it must not be presented as one.

Remaining verification for the user after pushing to HTTPS hosting:
open the landing page and the dashboard at phone, tablet, and desktop
widths, check for overflow, overlap, and BottomNav coverage, and report
the top three problems. That is the first round of the design-taste
check, still outstanding.
