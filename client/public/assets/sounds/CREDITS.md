SOUNDS: placeholder synthesized WAVs generated automatically by Copilot for testing purposes.
Replace these with licensed audio assets (Mixkit, Zapsplat, OpenGameArt, Kenney, etc.) before production.

Files added (original placeholders):
- client/public/assets/sounds/bgm/.gitkeep
- client/public/assets/sounds/bgm/bgm_lobby.wav
- client/public/assets/sounds/sfx/.gitkeep
- client/public/assets/sounds/sfx/sfx_card.wav
- client/public/assets/sounds/sfx/sfx_vote.wav

---

Optimized OGG assets added for testing (replace before production):

- client/public/assets/sounds/optimized/ocean.ogg
  Source: https://cdn.jsdelivr.net/gh/TorutheRedFox/ToruTheRedFox.github.io/resources/sound/loops/ocean.ogg
  License: verify before production.

- client/public/assets/sounds/optimized/wood_click.ogg
  Source: https://cdn.jsdelivr.net/gh/TorutheRedFox/ToruTheRedFox.github.io/resources/sound/random/wood_click.ogg
  License: verify.

- client/public/assets/sounds/optimized/ui_click.ogg
  Source: Kenney UI assets via https://cdn.jsdelivr.net/gh/yurukusa/spell-cascade/assets/sounds/kenney/ui/ui_click.ogg
  Likely CC0 (Kenney) but verify.

- client/public/assets/sounds/optimized/ui_error.ogg
  Source: https://cdn.jsdelivr.net/gh/yurukusa/spell-cascade/assets/sounds/kenney/ui/ui_error.ogg

- client/public/assets/sounds/optimized/bell.ogg
  Source: https://cdn.jsdelivr.net/gh/gyng/synthrs/examples/assets/bell.ogg

- client/public/assets/sounds/optimized/wind.ogg
  Source: https://cdn.jsdelivr.net/gh/doggywatty/OpenMFor/sfx/wind.ogg

- client/public/assets/sounds/optimized/sound-card.ogg
  Source: https://cdn.jsdelivr.net/gh/crystal-bit/triple-triad-godot/GameScenes/Battle/Audio/sound-card.ogg

Notes:
- These optimized files are temporary, low-size test assets. Replace with curated, licensed assets (OGG/MP3) for production.
- SoundManager prefers optimized/*.ogg first and falls back to original WAVs.
- Keep WAV placeholders only if you want lossless fallbacks; they increase repo size.
