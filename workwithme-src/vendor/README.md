# Tubes cursor vendor copy

Source: `threejs-components@0.0.19`, `build/cursors/tubes1.min.js` from the installed npm package. Upstream SHA-256: `676abd6ccd18742a36dcb4ffce66a2052a4f203f240cd8cf97c6ea33a181f81b`.

The package declares ISC licensing. Its bundled Three.js r180 MIT copyright/SPDX notice and all other existing notices remain in `tubes1.js`. The file is self-contained and does not use the application's separate Three.js version.

Only three integration patches are applied:

- Replace the small `BC` lifecycle wrapper with a readable adapter. Resize and visibility listeners have stable references; timers and observers are cleared; zero-size/disposed canvases are guarded. One renderer-init promise gates startup, runtime failures call `onError`, and disposal is idempotent even if initialization finishes after unmount.
- Add `three.setPaused(boolean)` and gate animation on user pause, intersection, document visibility, and nonzero dimensions. The pinned renderer's `_animation.stop()/start()` methods stop the actual RAF; its public `setAnimationLoop(null)` only clears a callback and would initialize an unused renderer. The adapter therefore uses this version-specific internal scheduler only after initialization. Time resumes without a large elapsed-time jump.
- Remove the upstream pointer registry's missing body click listener on final disposal; cap drawing resolution to DPR 1–1.5 and connect the optional `onError` factory option.

The factory still accepts the upstream tube/sleep settings, color methods, and `dispose()`. Pass `bloom: false`, as required by the adjacent type declaration: this integration does not retain or support the upstream bloom/postprocessing cleanup path. Keep at least two tubes and supply four light colors. The component handles lazy import cancellation, shared motion preferences, and its static fallback.

To update the dependency, review and reapply these patches against the new upstream implementation rather than replacing this file blindly. The readable adapter begins at `class BC`; the other changes are the pointer-registry disposal and factory's DPR/onError assignments.
