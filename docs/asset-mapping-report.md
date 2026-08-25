# Asset mapping report

This project uses static public assets directly from the frontend build, not import-based bundling. Runtime references resolve to the following canonical paths:

## Role cards
- `/roles/back.png` — role-card back
- `/roles/bodyguard.png`
- `/roles/fool.png`
- `/roles/seer.png`
- `/roles/silencer.png`
- `/roles/villager.png`
- `/roles/werewolf.png`

## Fortune cards
- `/cards/back.png` — fortune-card back
- `/cards/lucky-card.png` — lucky deck card face
- `/cards/unluck-card.png` — unlucky deck card face

## Morning events
- `/events/blackout.png`
- `/events/boat_return.png`
- `/events/bonfire.png`
- `/events/circling_crow.png`
- `/events/distant_howl.png`
- `/events/fog.png`
- `/events/full_moon.png`
- `/events/high_tide.png`
- `/events/warning.png`

## Archive / legacy
The following folders contain non-runtime copies kept for rollback and audit safety:
- `client/public/roles/_archive/`
- `client/public/cards/_archive/`
- `client/public/events/_archive/`

These files are intentionally not referenced by runtime code and should remain out of active production paths.
