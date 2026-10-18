# Makespace toolbook

A responsive web reference for makerspace machines, starting with a dual-homing
gantry CNC router. Includes a live squaring calculator, labeled bed diagram,
six-step procedure, email-link sign-in, private cloud calibration history, and
editable notes, preferred settings, and protocols.

## Run locally

Requires Node.js 22.12+, 24+, or 26+ (as supported by Vitest) and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The calculator works without a cloud connection. Cloud saves and sign-in are
explicitly unavailable until Supabase is configured. Unsaved measurements and
drafts live in memory only: leaving or reloading the page clears them.

## Connect Supabase

1. Create a Supabase project.
2. Run [the database migration](supabase/migrations/202610180001_toolbook.sql)
   in the Supabase SQL editor (or apply it with the Supabase CLI).
3. Enable the Email provider in Authentication. The app uses passwordless
   email links for **existing accounts only** (`shouldCreateUser: false`).
   In Authentication settings, turn **Allow new users to sign up** off and
   save. This server-side setting is essential: the app setting alone does not
   stop someone calling the public Auth API directly.
   In Authentication → Users, create or invite only your own account if it
   does not already exist. Review existing users and remove any unauthorized
   accounts; disabling sign-ups does not remove existing accounts or sessions.
4. Set the Authentication Site URL to the deployed app URL. Add exact local
   and production app URLs to the allowed redirect list, e.g.
   `http://127.0.0.1:5173` and `https://your-toolbook.example`.
5. In `.env.local`, set `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` using your project URL and **public
   publishable key** (the legacy `anon` key also works). Never put a service-role
   or secret key in this web app.
6. Restart the dev server. Use **Sign in** to send yourself an email link.
7. For production, configure Supabase SMTP and rate limits for your expected use.

Records belong to individual users, not a shared makerspace team. Row-level
security enforces ownership for reads, inserts, updates, and deletes. The app
loads the most recent 200 entries across all reference categories for this
machine; older records remain in the database. Calibration snapshots record
entered dimensions, measurements, tolerance, calculated correction, geometry
warning, and run notes. Saving does **not** claim an adjustment was applied.

To check the live integration, sign in, save a calibration and a note, edit the
note, then sign in on another device to verify both records. Delete the note
and refresh the other device. With a second account, verify none of the first
account's entries appear or can be read/modified via the API.

## Calibration conventions

- Stand at the **front**. Rear is **negative X**, front is **positive X**.
- **Positive Y is right; negative Y is left.** Positive Z lifts the tool.
- The **left** switch is adjustable; the right is the fixed reference.
- Points: 1 rear left, 2 rear right, 3 front right, 4 front left.
- A = 1 to 3. B = 2 to 4. Use the **mm / inches** toggle for measurement
  inputs, live distances, warning details, and saved calibration displays.
  Inches accept decimals (`42.375`), fractions (`3/8`), and mixed numbers
  (`42 3/8`). Invalid fractions, including zero denominators, show an error.
  Switching units converts existing values rather than reinterpreting them.
  Calculations and cloud snapshots remain in millimeters, including older
  records. Repeated toggles do not round the underlying measurements.
- W is the **commanded test width**: controller travel left to right along the
  gantry, not the bed width or a tape-measured horizontal projection.
- L is the **commanded test length**: controller rear-front X travel, not the bed
  length. For both W and L, use the difference between corner coordinates, not
  absolute controller positions.
- **Physically measure** A and B between brad centers with a tape. Do not use
  controller-calculated diagonals.
- S is the **physically measured** effective span **along the gantry** between
  left/right homing contact points. Using test width for S can produce an incorrect correction
  when the test does not span the full gantry.

Controller travel assumes accurate axis distance calibration. Physical side
measurements can check that assumption; investigate materially different side
lengths before trusting the switch correction.

For a parallelogram whose gantry is skewed by angle theta:

```text
sin(theta) = (A^2 - B^2) / (4 * W * L)
left trigger correction = S * sin(theta)
```

Positive correction means move the **left homing trigger point forward, away
from the back of the machine (+X)**. Negative means move it **backward, toward
the back of the machine (-X)**. Left is viewed from the front. This assumes independent,
repeatable dual homing and a switch mechanism with one-to-one X displacement.
Brackets, cams, controller offsets, or different homing sequences can reverse
or change the physical switch movement required. Verify against the machine
manual and with a small trial adjustment; stop if the diagonal difference grows.

The tolerance is the absolute **diagonal difference**, not switch movement.
The model assumes correct axis scale, straight travel, a repeatable parallelogram,
and small skew. The consistency warning compares the RMS of the diagonals to
`hypot(W, L)`; it warns if the difference exceeds the greater of 1 mm or the
chosen tolerance. It cannot certify correct geometry or measurement accuracy.

Follow the workshop's authorized safety, isolation, and homing procedures.
Remove brads before any machine movement. This app does not control the router.

## Mach3 impression pattern

The marking guide generates reviewable G-code for the workshop-approved
**non-rotating marking tool**, with the spindle stopped (`M5`). Do not use it
as a rotating-cutter procedure. Use a sacrificial, level surface approved for
1 mm impressions.

Expand **Review Mach3 program**, then use **Download G-code (.tap)** to save
the current dimensions and feed rates as a Mach3-compatible text file with
Windows line endings. The filename includes the pattern dimensions. Invalid
inputs hide the download. Review the file and machine setup before loading it
in Mach3; downloading does not execute any motion.

- Width and length default to **1000 mm each** and are adjustable in the same
  fields used by the calculator.
- G-code remains **G21 / millimeters** regardless of the display toggle.
  Converted pattern moves are rounded to 0.001 mm; feeds are explicitly in
  mm/min and fixed Z depth/clearance remain -1/+10 mm. Free-text notes, settings,
  and protocols are not automatically converted.
- The current X/Y position is **point 1 (rear left)**; no X/Y zeroing is needed.
- In the intended work coordinate system with the marker fitted and intended
  tool-length compensation established, touch off using the approved procedure.
  At actual surface contact, use **Zero Z** on the work Z DRO, not machine
  coordinates. Account for paper/plate thickness if used. Keep work offsets
  and tool-length compensation unchanged afterward.
- Verify +Z lifts, Z +10 clears the whole path and is within travel, and Z -1
  is safe for the marker and sacrificial surface. Do not run if these conditions
  cannot be met. The plunge is 11 mm from clearance; retract ends 10 mm above
  the surface.
- Pattern order: point 1, **+Y width** to point 2, **+X length** to point 3,
  **-Y width** to point 4. Every point marks at absolute work Z -1 and retracts
  to absolute work Z +10 before any X/Y move.
- Feed defaults (50 mm/min marking, 500 mm/min retract/translation) are examples,
  not approved machine settings. Set rates appropriate to the machine and tool.
- G90/G91 appear on separate blocks. Relative X/Y moves retain the starting
  location; absolute Z uses the established surface reference. The program sets
  G21/G94, cancels cutter compensation and canned cycles, retains the current
  work coordinate system and tool-length compensation, and ends with M2 at
  point 4, Z +10, in G90. Check modes before other work.
- Review extents with soft limits enabled, remove brads and obstructions, and
  verify in single-block mode before use. Return to point 1 and re-establish
  the surface reference as needed before repeating; running again from point 4
  shifts the pattern.

The generated program is not verified against a physical machine. An authorized
operator must review it against the machine's configuration and local procedure.

## Validate

```powershell
npm test
npm run build
```

Tests cover synthetic skew in both directions, homing-span scaling, tolerance,
invalid input, inconsistent geometry, and numeric overflow. The build includes
strict TypeScript checking.

## Deploy to the web

Deploy as a static Vite app on a host such as Netlify, Vercel, or Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `dist`
- Set both `VITE_SUPABASE_*` environment variables **before building**.
- Set Supabase's Site URL and allowed redirect URLs to the actual HTTPS address.
- No client-side URL routing or rewrite rule is required.

Vite embeds the public Supabase connection settings in the browser bundle;
database RLS, not key secrecy, protects records. Dependencies are lockfile-pinned
after installation. The app uses Google Fonts with system-font fallbacks.
