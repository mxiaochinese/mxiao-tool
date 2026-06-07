# Design QA

final result: passed

Checked in Safari at `http://127.0.0.1:5173/` on June 6, 2026.

## Reference

Source visual: user's `3.png` and `5.png` MXiao social post references: square cyan background, top-left logo, white/red title lockup, white rounded table card, red table header, online/offline badges, status pills, and red CTA.

## Findings

- P1 fixed: poster output now uses a fixed 1080 x 1080 square canvas matching the provided social-post format.
- P2 accepted: the right preview panel scrolls horizontally so the poster stays export-accurate instead of shrinking and distorting the 1:1 layout.
- P3 remaining: editor table is intentionally dense and horizontally scrollable on narrower widths.

## Verified

- App renders in Safari.
- Editor rows are visible and editable.
- Online/offline export mode changes the preview content.
- Poster includes the six reference columns: trinh do, lop, hinh thuc, lich hoc, khai giang, tinh trang.
- Production build completes with Vite.
