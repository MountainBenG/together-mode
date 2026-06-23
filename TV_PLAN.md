# Together Mode on the TV (Vizio) — Plan

## The key constraint
You can't publish a native app to a Vizio the way you do for iPhone — Vizio's app platform (SmartCast HTML5 apps) is **partner-only/closed**. BUT every modern Vizio has **Chromecast built-in (Google Cast)**. That's the way in.

## The approach: Google Cast (the TV becomes the shared screen)
This fits Together Mode *perfectly*:
- **The TV** = the shared big screen — shows the current movie, who's voted, and the match reveal.
- **The two phones** = the controllers — they vote exactly as they do now.
- Built as a **Google Cast "receiver"** — a web app the TV runs, that the phones cast to and control.

## Why it reuses almost everything we built
The session is already synced in real time through Supabase. The TV view is just a **third, display-only participant**: it subscribes to a session (by its code) and mirrors the state on the big screen. The phones keep voting as-is. So most of the logic already exists — we're adding a *display*, not rebuilding the app.

## Build phases
**Phase 1 — the TV display web app (buildable NOW, no TV needed):**
A web page that, given a session code, shows the shared experience on a big screen — the movie, voting status, and the match celebration. We test it in a normal desktop browser against a live session, and host it on **astrokind.space** (we already have the hosting).

**Phase 2 — casting (when the Vizio arrives next week):**
- Register as a Google Cast developer (~$5 one-time) and register the Phase-1 web app as the receiver → get a Cast app ID.
- Add Google Cast *sender* support to the phone app (`react-native-google-cast`; needs a dev build, not Expo Go — fine, we're already doing EAS builds).
- Phone casts → the Vizio launches the TV view → test on the real TV.

## Cost / setup
- Google Cast developer registration: **~$5 one-time**.
- Hosting: **astrokind.space** (already have it; needs HTTPS — DreamHost gives a free certificate).

## We can start TODAY
Phase 1 needs no TV and no Cast setup. We build + browser-test the TV view now, so the moment the Vizio arrives, we just wire up the casting and point it at this page.
