import type { Motion } from '@/components/robot/RobotBody';
import type { LessonSession, LessonStep, RobotReadyState } from '../types';

export type LessonSceneId = 'sunny-toy-garden';

export type TeeBotSpritePose =
  | 'idle'
  | 'wave'
  | 'point'
  | 'listen'
  | 'think'
  | 'celebrate'
  | 'hold-card';

export type LeafPetSpritePose = 'hidden' | 'peek' | 'pop-out' | 'hop' | 'celebrate';

export type SceneHardwareEvent =
  | 'TEEBOT_IDLE'
  | 'TEEBOT_LISTEN'
  | 'TEEBOT_POINT'
  | 'TEEBOT_THINK'
  | 'TEEBOT_CELEBRATE'
  | 'TEEBOT_WAVE'
  | 'PET_HIDE'
  | 'PET_POP'
  | 'SUNNY_GLOW'
  | 'WORD_CARD_SHOW';

export interface LessonSceneAssetPack {
  id: LessonSceneId;
  backgroundId: string;
  robotPoseIds: Record<TeeBotSpritePose, string>;
  petPoseIds: Record<LeafPetSpritePose, string>;
  propIds: {
    sunGlow: string;
    wordCard: string;
    grassParallax: string;
  };
}

export interface LessonSceneScript {
  sceneId: LessonSceneId;
  assetPack: LessonSceneAssetPack;
  targetWord: string;
  wordCardVisible: boolean;
  robotPose: TeeBotSpritePose;
  robotMotion: Motion;
  petPose: LeafPetSpritePose;
  sunnyGlow: boolean;
  cameraPush: boolean;
  hardwareEvents: SceneHardwareEvent[];
}

interface ResolveLessonSceneScriptInput {
  lesson: LessonSession;
  step: LessonStep;
  stepIndex: number;
  totalSteps: number;
  reducedMotion?: boolean;
}

export const SUNNY_TOY_DIORAMA_ASSET_PACK: LessonSceneAssetPack = {
  id: 'sunny-toy-garden',
  backgroundId: 'sunny-world/full-background',
  robotPoseIds: {
    idle: 'teebot/idle',
    wave: 'teebot/wave',
    point: 'teebot/point',
    listen: 'teebot/listen',
    think: 'teebot/think',
    celebrate: 'teebot/celebrate',
    'hold-card': 'teebot/hold-card',
  },
  petPoseIds: {
    hidden: 'leaf-pet/hidden',
    peek: 'leaf-pet/peek',
    'pop-out': 'leaf-pet/pop-out',
    hop: 'leaf-pet/hop',
    celebrate: 'leaf-pet/celebrate',
  },
  propIds: {
    sunGlow: 'sunny-world/sun-glow',
    wordCard: 'sunny-world/word-card',
    grassParallax: 'sunny-world/grass-parallax',
  },
};

const ROBOT_STATE_TO_POSE: Record<RobotReadyState, TeeBotSpritePose> = {
  idle: 'idle',
  listening: 'listen',
  modeling: 'point',
  thinking: 'think',
  celebrating: 'celebrate',
};

const ROBOT_STATE_TO_MOTION: Record<RobotReadyState, Motion> = {
  idle: 'IDLE_SWAY',
  listening: 'TILT_CURIOUS',
  modeling: 'WAVE_ARM',
  thinking: 'WAITING_POSE',
  celebrating: 'EXCITED_BOUNCE',
};

const ROBOT_STATE_TO_EVENT: Record<RobotReadyState, SceneHardwareEvent> = {
  idle: 'TEEBOT_IDLE',
  listening: 'TEEBOT_LISTEN',
  modeling: 'TEEBOT_POINT',
  thinking: 'TEEBOT_THINK',
  celebrating: 'TEEBOT_CELEBRATE',
};

function firstTargetWord(lesson: LessonSession): string {
  const [firstFocus] = lesson.focusItems;
  return firstFocus ?? lesson.objective;
}

function uniqueEvents(events: SceneHardwareEvent[]): SceneHardwareEvent[] {
  return Array.from(new Set(events));
}

export function resolveLessonSceneScript({
  lesson,
  step,
  stepIndex,
  totalSteps,
  reducedMotion = false,
}: ResolveLessonSceneScriptInput): LessonSceneScript {
  const isOpeningBeat = stepIndex === 0;
  const isFinalBeat = stepIndex === totalSteps - 1;
  const basePose = ROBOT_STATE_TO_POSE[step.robotState];
  const robotPose = isOpeningBeat ? 'wave' : basePose;
  const robotMotion = reducedMotion ? 'LOOK_FORWARD' : ROBOT_STATE_TO_MOTION[step.robotState];
  const petPose: LeafPetSpritePose = isFinalBeat ? 'pop-out' : 'hidden';
  const sunnyGlow = step.robotState === 'modeling' || step.robotState === 'celebrating';

  return {
    sceneId: 'sunny-toy-garden',
    assetPack: SUNNY_TOY_DIORAMA_ASSET_PACK,
    targetWord: firstTargetWord(lesson),
    wordCardVisible: true,
    robotPose,
    robotMotion,
    petPose,
    sunnyGlow,
    cameraPush: !reducedMotion,
    hardwareEvents: uniqueEvents([
      ROBOT_STATE_TO_EVENT[step.robotState],
      isOpeningBeat ? 'TEEBOT_WAVE' : ROBOT_STATE_TO_EVENT[step.robotState],
      petPose === 'pop-out' ? 'PET_POP' : 'PET_HIDE',
      sunnyGlow ? 'SUNNY_GLOW' : 'WORD_CARD_SHOW',
      'WORD_CARD_SHOW',
    ]),
  };
}
