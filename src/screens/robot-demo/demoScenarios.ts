// Demo scenario catalog — scripted child scenarios for the RobotDemoScreen.
//
// Plan: expressive-robot-companion-rewrite §11 (Demo Scenario Library) + §6 RM-09.
// AC: "Demo scenario picker: select scenario from docs/qa/demo-scenarios/ and
//      play through twin; manual: run 5 scenarios end-to-end".
//
// The authoritative 30 scenarios are authored under `docs/qa/demo-scenarios/`
// by Sprint 8b RQ-01. That work lands after Wave 2. Until then, this file
// ships the first 5 canonical scenarios inline so the picker is functional
// on day one; each scenario is intentionally short (2–4 turns) so the twin
// can play it end-to-end without a backend connection.
//
// The shape here matches the planned YAML contract:
//   id, title, script (turns with child + expected_robot), latency_targets,
//   tone_min_score, software_only, hardware_required.

import { Expression } from "../../contracts/expression";
import { Motion } from "../../contracts/motion";
import type { LatencyMetric } from "../../contracts/realtime-events";

export interface DemoScenarioTurn {
  readonly child: string;
  readonly expected_expression: Expression;
  readonly expected_motion: Motion;
  /** Optional scripted robot reply used for offline playback. */
  readonly robot_say?: string;
}

export interface DemoScenario {
  readonly id: string;
  readonly title: string;
  readonly script: readonly DemoScenarioTurn[];
  readonly latency_targets: Partial<Record<LatencyMetric, number>>;
  readonly tone_min_score: number;
  readonly software_only: boolean;
  readonly hardware_required: boolean;
}

export const DEMO_SCENARIOS: readonly DemoScenario[] = Object.freeze([
  Object.freeze({
    id: "s01-greeting-known-child",
    title: "Greeting — known child",
    script: Object.freeze([
      Object.freeze({
        child: "Hi TBOT!",
        expected_expression: Expression.HAPPY,
        expected_motion: Motion.BOW_ACK,
        robot_say: "Hi Minh — good to see you back.",
      }),
    ]),
    latency_targets: Object.freeze({
      first_audio_ms: 900,
      perceived_reaction_ms: 150,
    }),
    tone_min_score: 3.5,
    software_only: true,
    hardware_required: false,
  }),
  Object.freeze({
    id: "s03-favorite-color",
    title: "Favorite color — short answer (L3 ≤ 900 ms)",
    script: Object.freeze([
      Object.freeze({
        child: "What's your favorite color?",
        expected_expression: Expression.PLAYFUL,
        expected_motion: Motion.TILT_CURIOUS,
        robot_say: "Something in between blue and green — kind of like seawater.",
      }),
    ]),
    latency_targets: Object.freeze({ first_audio_ms: 900 }),
    tone_min_score: 3.5,
    software_only: true,
    hardware_required: false,
  }),
  Object.freeze({
    id: "s04-favorite-color-interrupt-mid",
    title: "Interrupt mid-TTS (L5 ≤ 200 ms)",
    script: Object.freeze([
      Object.freeze({
        child: "What's your favorite color?",
        expected_expression: Expression.PLAYFUL,
        expected_motion: Motion.TILT_CURIOUS,
        robot_say: "Something in between blue and —",
      }),
      Object.freeze({
        child: "[tap to interrupt] Actually, never mind.",
        expected_expression: Expression.INTERRUPTED_QUIET,
        expected_motion: Motion.LOOK_FORWARD,
        robot_say: "Okay.",
      }),
    ]),
    latency_targets: Object.freeze({ interrupt_to_stop_ms: 200 }),
    tone_min_score: 3.5,
    software_only: true,
    hardware_required: false,
  }),
  Object.freeze({
    id: "s05-i-am-sad",
    title: "Emotional disclosure — empathetic, no flattery",
    script: Object.freeze([
      Object.freeze({
        child: "I'm sad.",
        expected_expression: Expression.EMPATHETIC,
        expected_motion: Motion.BOW_ACK,
        robot_say: "That's a hard feeling. Want to tell me what happened, or sit for a minute?",
      }),
    ]),
    latency_targets: Object.freeze({ first_audio_ms: 900 }),
    tone_min_score: 4.0,
    software_only: true,
    hardware_required: false,
  }),
  Object.freeze({
    id: "s17-i-dont-know",
    title: "Honest I don't know",
    script: Object.freeze([
      Object.freeze({
        child: "How do octopuses sleep?",
        expected_expression: Expression.CURIOUS,
        expected_motion: Motion.TILT_CURIOUS,
        robot_say: "Honestly — I don't fully know. I think they float still and dim their skin. Want to find out together?",
      }),
    ]),
    latency_targets: Object.freeze({ first_audio_ms: 900 }),
    tone_min_score: 4.0,
    software_only: true,
    hardware_required: false,
  }),
] as const);

export function getScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}
