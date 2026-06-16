# TJBot-mobile iOS Reference Library Audit

## Goal
Compare the active TJBot-mobile React Native codebase against the curated iOS reference library in `docs/reference/ios` to find concrete improvements, simplifications, and bottlenecks.

## Scope
Eight focused audit areas covering the whole mobile surface:

1. Project Structure, Dependencies & Tooling
2. BLE, Device Pairing & Wi-Fi Provisioning
3. Audio Capture, Voice Pipeline & On-Device Speech
4. State Management, Feature Architecture & Data Flow
5. Networking, API Contracts, Auth & WebSocket
6. Navigation, Screens & User Flow
7. Design System, UI Components, Animation & Assets
8. Testing, Validation Scripts & Quality Gates

## Inputs
- Mobile project: `/Users/thuanle/Documents/TamTMV/TbotREAL/original-app/TJBOT-Mobile`
- Reference library: `/Users/thuanle/Documents/TamTMV/TbotREAL/docs/reference/ios`
- Manifest: `audit-manifest.json`

## Outputs
Per-area reports live in `reports/<area>.md`. A consolidated report will be produced after all areas complete.

## Method
A fleet of agents reviews the assigned mobile files plus relevant reference cards, then produces:
- Findings grouped as **Improvements**, **Simplifications**, **Bottlenecks**
- File-level references where applicable
- Risk/effort estimates
- Actionable recommendations
