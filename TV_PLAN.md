# Together Mode on the TV — Vision + Architecture + Business Model

## The real vision (Ben, 2026-06-23)
NOT "the phone app cast to a TV" — that's a gimmick. Getting everyone to pull out a phone and join a session is the exact friction that kills family-game apps (Ben felt this firsthand). The real vision is **phoneless**: a family sits down and controls everything by **talking and gesturing to the TV** — this is where **Vision Click** plugs in.

Flow:
1. A parent says "start a session" + gives specs (genre, age).
2. The family votes through movies by **voice + gesture** — no phones.
3. When they agree, someone says **"start this movie"** → it routes to a streaming service.

## Architecture — "the Vizio is a screen, not a brain"
You can't run a custom voice/gesture app *on* a Vizio (closed platform; no camera/mic access for developers). So:
- **Brain device:** a small computer running Together Mode + Vision Click. *Prototype:* a computer + USB webcam + mic, HDMI into the Vizio. *Long-term:* a dedicated box (a real hardware product — the big play).
- **Screen:** the Vizio, via HDMI (simplest) — the device runs the app fullscreen on it.
- **App form:** likely a **fullscreen web app** (reuses the existing Supabase + TMDB logic; browser camera/mic APIs feed Vision Click).
- **Vision Click input:**
  - **Gesture** (camera): thumbs up/down = vote (the hand-gesture classifier Ben's been building).
  - **Voice** (mic): "yes" / "no" / "start this movie."

## Open design questions
1. **Phoneless multi-person voting (the core one):** with no individual devices, how does it know 2+ people agreed? Camera watches the room and counts thumbs (everyone up = match)? Or one shared "the room decides" vote? Defines the whole feel.
2. **Phoneless setup:** how does the parent set genre/age — a voice/gesture menu on the TV, or a one-time phone/web setup?
3. HDMI (simple) vs casting.

## Business model — the "where to watch" referral layer
**Insight (Ben):** the same movie lives on multiple services, so they compete for the view. Astrokind is the neutral *decision point* and routes the family — services pay for that routing.
- **v1 (doable now): affiliate links.** Rent/buy services (Apple, Amazon, Google Play) pay a cut for referrals. The phone app's "Where to watch" is exactly where this starts.
- **Later (needs scale): paid placement** — services pay to be the default destination. Needs traffic + business development.
- **Honest reality:** this only matters at SCALE (they pay for volume) → **users first.** The TV/voice experience is the engagement that creates the traffic that makes routing valuable.
- ⚠️ Careful with any *data* monetization — it's a kids/family app (privacy/COPPA).

## What "starting the TV" means now
- It's the big **Vision Click integration** — hardware + voice + gesture — a real R&D milestone. Loop in **Dad** (hardware/robotics is his world).
- **Starts now without the TV:** (a) the business model can begin on the **phone app** (affiliate links on "Where to watch"); (b) prototype the phoneless flow as a **web app** on a computer + webcam, using the Vizio as the screen once it arrives.
