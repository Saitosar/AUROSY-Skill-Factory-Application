Pose Studio static assets (frontend_developer_guide §1.4 in the backend repo).

User-facing notes on placeholders and swapping assets: docs/g1-control-ui/FAQ.md (section «Pose Studio и ассеты») and in-app Help at /help. Pose Studio uses local MuJoCo WASM and GET /api/joints for labels; /telemetry redirects to /pose. For DDS vs mock telemetry and deployment, see FAQ §5 and docs/g1-control-ui/DEPLOYMENT.md (points to docs/deployment/README.md).

- robot-diagram.svg — bundled placeholder until official PNG/SVG from §1.4 are copied here.
- Optional: add robot.png (same aspect ratio as overlay zones) and extend pose-overlay.json for custom SVG paths.

UI: when official assets are in place, set POSE_ASSETS_ARE_PLACEHOLDER to false in web/frontend/src/lib/poseAssets.ts so the placeholder banner on Pose Studio hides.

Keyboard: clickable body zones use :focus-visible (primary ring) in the app stylesheet for keyboard users.
