# Fortune card assets

Runtime assets used by the game are served directly from this folder as `/cards/<filename>`.

Canonical active files:
- `back.png` — fortune-card back
- `lucky-card.png` — lucky card face
- `unluck-card.png` — unlucky card face

Legacy variants and duplicate card images are preserved in `_archive/` for safe rollback and comparison, but runtime should only reference the files above.
