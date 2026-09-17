# Physical PVC Card Showcase Repair

## Goal
Repair the existing showcase so the live homepage displays a genuinely rotatable, photographed-looking PVC card while preserving the homepage layout, flat uploaded artwork, and existing admin management.

## Diagnosis and renderer repair
- Confirm the visible layer at runtime by inspecting the canvas, fallback opacity, texture requests, WebGL context, Suspense completion, and scene errors.
- Fix the actual readiness/rendering fault rather than leaving the flat fallback over the canvas.
- Keep React 18 and the installed compatible React Three Fiber 8 / Drei 9 stack.
- Add a viewer-level error boundary so WebGL or texture failures intentionally retain the poster instead of silently masking a broken scene.

## Locked reusable card model
- Rebuild the model in centimeters at exactly 5.398 × 8.560 × 0.076, with 0.318 outer corner radius and 0.008 bevel.
- Compensate the inset outline and extrusion depth for bevel expansion, then numerically verify the finished bounding box.
- Use smooth rounded edge/bevel geometry with genuinely flat front/back caps and separate face and white-edge materials, without coplanar duplicates or artwork wrapping.
- Prepare each uploaded front/back image as an in-memory white, face-ratio canvas using proportional contain fitting; preserve all original pixels and whitespace.
- Correct UVs and winding so the front and already-upright Sugar Bloom back read normally without rotating source files.

## Physical finish and studio scene
- Apply the specified opaque MeshPhysicalMaterial values to printed faces and a slightly rougher white PVC edge.
- Use an invisible procedural PMREM studio environment with neutral front-left key, front-right fill, and restrained rear edge light.
- Add only a soft transparent ground shadow; keep the canvas alpha-transparent.
- Lock the camera at [0, 0, 22], FOV 28, near 0.1, far 100, with separate fixed-tilt and interactive-yaw groups.
- Tune only light, roughness, and clearcoat against the attached physical-card reference; keep geometry and artwork fixed.

## Rotation, fallback, and switching
- Add full 360° horizontal mouse/touch drag with zoom and pan unavailable, while preserving normal mobile vertical scrolling.
- Pause automatic motion during dragging; retain accessible pause/play and previous/next controls.
- Keep the 3-second readable front hold and approximately 5-second smooth rotation.
- Preload and decode the next pair, then atomically switch both textures at a camera-relative edge-on point after the back has been shown.
- Keep the same scene mounted between designs and keep the current card visible if the next pair is delayed.
- Keep the first enabled design poster visible until a complete textured 3D frame has rendered; respect reduced motion, WebGL failure, disabled entries, and the zero-design state.

## Admin inheritance
- Reuse the existing Card Showcase page, storage paths, replacement lifecycle, ordering, and permissions.
- Replace the flat upload preview with the same reusable 3D renderer and blank-white optional back, so every future design inherits identical geometry, framing, materials, and lighting.
- Use a renderer-derived poster when browser support permits; otherwise preserve the authoritative flat-art fallback without treating it as a successful 3D render.

## Validation and evidence
- Verify exact geometry bounds numerically and check texture aspect/contain calculations.
- Verify front, three-quarter, edge, and back views in the actual homepage component, including readable/unmirrored artwork and moving reflections.
- Verify drag, automatic rotation, pause/play, switching, delayed textures, missing back, one design, zero designs, reduced motion, and forced WebGL failure.
- Verify desktop and 360 px mobile layouts without clipping or overflow.
- Verify admin preview/upload inheritance and ordinary-customer denial remains intact.
- Run the project checks and confirm no new console, network, TypeScript, lint, or security warnings.
- Capture and provide actual component screenshots for front, three-quarter, thin side, and back, and report any remaining failures.
