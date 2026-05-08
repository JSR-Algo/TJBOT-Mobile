#!/usr/bin/env ts-node
/**
 * calibrate.ts — VAD parameter grid search over the labeled corpus.
 *
 * Reads every VadSampleSidecar in tests/audio/vad-corpus/{child,adult,ambient,mixed}/
 * that has labelState === 'labeled'. For each labeled sample it loads the
 * companion WAV, runs the energy + ZCR VAD from plan §5.6 over a parameter
 * grid, and picks the parameter set that maximises (TPR − FPR).
 *
 * Output: tests/audio/vad-corpus/calibration-result.json (VadCalibrationResult)
 *
 * Usage:
 *   npx ts-node --project tsconfig.json tests/audio/vad-corpus/calibrate.ts
 *   # or, to scan a subset:
 *   CORPUS_DIR=tests/audio/vad-corpus npx ts-node ... calibrate.ts
 *
 * Re-run whenever the corpus grows by 20+ labeled samples.
 */

import * as fs from 'fs';
import * as path from 'path';

import type {
  VadSampleSidecar,
  VadSpeechMarker,
  VadCalibrationResult,
  VadCategory,
} from './types';

// ── Constants ─────────────────────────────────────────────────────────────

const CORPUS_DIR = process.env['CORPUS_DIR']
  ? path.resolve(process.env['CORPUS_DIR'])
  : path.resolve(__dirname);

const OUTPUT_PATH = path.join(CORPUS_DIR, 'calibration-result.json');

const CATEGORIES: VadCategory[] = ['child', 'adult', 'ambient', 'mixed'];

/** Frame size in samples (16 kHz → 10 ms frames). */
const FRAME_SIZE_SAMPLES = 160;

/** Plan §5.6 baseline defaults — printed in output for comparison. */
const PLAN_DEFAULTS = {
  eThresholdDb: -42 as const,
  zcrLow: 0.05 as const,
  zcrHigh: 0.45 as const,
  hangoverMs: 400 as const,
};

// ── Grid search parameter ranges ──────────────────────────────────────────

const E_THRESHOLD_RANGE = [-50, -46, -42, -38, -34] as const; // dBFS
const ZCR_LOW_RANGE     = [0.02, 0.05, 0.08, 0.12] as const;
const ZCR_HIGH_RANGE    = [0.35, 0.40, 0.45, 0.50, 0.55] as const;
const HANGOVER_RANGE    = [200, 300, 400, 500, 600] as const; // ms

// ── WAV parsing ───────────────────────────────────────────────────────────

interface WavData {
  samples: Float32Array; // normalised to [-1, 1]
  sampleRate: number;
  durationSec: number;
}

function parseWav(buf: Buffer): WavData {
  // Minimal WAV parser for PCM-16 mono 16 kHz files.
  // Validates the RIFF header and finds the 'data' chunk.
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  const riff = buf.slice(0, 4).toString('ascii');
  if (riff !== 'RIFF') throw new Error('Not a RIFF file');
  const wave = buf.slice(8, 12).toString('ascii');
  if (wave !== 'WAVE') throw new Error('Not a WAVE file');

  let offset = 12;
  let fmtFound = false;
  let numChannels = 1;
  let sampleRate = 16000;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buf.length) {
    const chunkId   = buf.slice(offset, offset + 4).toString('ascii');
    const chunkSize = view.getUint32(offset + 4, true);
    offset += 8;

    if (chunkId === 'fmt ') {
      // audioFormat (2) + numChannels (2) + sampleRate (4) + byteRate (4) +
      // blockAlign (2) + bitsPerSample (2) = 16 bytes minimum
      numChannels  = view.getUint16(offset + 2, true);
      sampleRate   = view.getUint32(offset + 4, true);
      bitsPerSample = view.getUint16(offset + 14, true);
      fmtFound = true;
    } else if (chunkId === 'data') {
      dataOffset = offset;
      dataSize   = chunkSize;
      break;
    }

    offset += chunkSize + (chunkSize % 2); // word-align
  }

  if (!fmtFound)       throw new Error('WAV: no fmt chunk found');
  if (dataOffset < 0)  throw new Error('WAV: no data chunk found');
  if (numChannels !== 1) throw new Error(`WAV: expected mono, got ${numChannels} channels`);
  if (bitsPerSample !== 16) throw new Error(`WAV: expected 16-bit, got ${bitsPerSample}-bit`);

  const bytesPerSample = bitsPerSample / 8;
  const numSamples = dataSize / bytesPerSample;
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const s16 = view.getInt16(dataOffset + i * 2, true);
    // Normalise Int16 to [-1, 1]. Division by 32768 is intentional (not 32767)
    // to keep 0x8000 (most negative) at exactly -1.
    samples[i] = s16 / 32768;
  }

  return { samples, sampleRate, durationSec: numSamples / sampleRate };
}

// ── Energy + ZCR VAD ──────────────────────────────────────────────────────

interface VadParams {
  eThresholdDb: number;
  zcrLow: number;
  zcrHigh: number;
  hangoverMs: number;
}

/**
 * Returns an array of [onsetSec, offsetSec] speech segments detected by the
 * energy + ZCR VAD on the given sample buffer.
 *
 * Algorithm (plan §5.6):
 *   energy_dB > E_THRESHOLD AND zcr in [Z_LOW, Z_HIGH] → speech frame
 *   hangover: SPEECH state persists for HANGOVER_MS after first non-speech frame
 */
function runVad(
  samples: Float32Array,
  sampleRate: number,
  params: VadParams,
): [number, number][] {
  const { eThresholdDb, zcrLow, zcrHigh, hangoverMs } = params;
  const hangoverFrames = Math.round((hangoverMs / 1000) * sampleRate / FRAME_SIZE_SAMPLES);
  const numFrames = Math.floor(samples.length / FRAME_SIZE_SAMPLES);
  const isSpeech = new Uint8Array(numFrames);

  // Pass 1: classify each frame
  for (let f = 0; f < numFrames; f++) {
    const start = f * FRAME_SIZE_SAMPLES;
    const end   = start + FRAME_SIZE_SAMPLES;

    // Short-time energy in dBFS
    let sumSq = 0;
    for (let i = start; i < end; i++) {
      sumSq += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sumSq / FRAME_SIZE_SAMPLES);
    // Avoid log(0); -100 dBFS floor for silence.
    const energyDb = rms > 1e-10 ? 20 * Math.log10(rms) : -100;

    // Zero-crossing rate (crossings per sample)
    let crossings = 0;
    for (let i = start + 1; i < end; i++) {
      if ((samples[i] >= 0) !== (samples[i - 1] >= 0)) crossings++;
    }
    const zcr = crossings / FRAME_SIZE_SAMPLES;

    isSpeech[f] = (energyDb > eThresholdDb && zcr >= zcrLow && zcr <= zcrHigh) ? 1 : 0;
  }

  // Pass 2: apply hangover — extend SPEECH state for hangoverFrames after
  // first non-speech frame (so brief pauses within an utterance are filled).
  let hangoverCount = 0;
  for (let f = 0; f < numFrames; f++) {
    if (isSpeech[f]) {
      hangoverCount = hangoverFrames;
    } else if (hangoverCount > 0) {
      isSpeech[f] = 1;
      hangoverCount--;
    }
  }

  // Pass 3: collect contiguous speech regions
  const segments: [number, number][] = [];
  const secPerFrame = FRAME_SIZE_SAMPLES / sampleRate;
  let inSpeech = false;
  let onsetFrame = 0;

  for (let f = 0; f < numFrames; f++) {
    if (isSpeech[f] && !inSpeech) {
      inSpeech = true;
      onsetFrame = f;
    } else if (!isSpeech[f] && inSpeech) {
      inSpeech = false;
      segments.push([onsetFrame * secPerFrame, f * secPerFrame]);
    }
  }
  if (inSpeech) {
    segments.push([onsetFrame * secPerFrame, numFrames * secPerFrame]);
  }

  return segments;
}

// ── Evaluation helpers ────────────────────────────────────────────────────

/**
 * Checks whether a detected segment overlaps with any ground-truth marker.
 * Overlap threshold: 50% of the shorter segment must coincide.
 */
function overlapsAny(
  detected: [number, number],
  groundTruth: readonly VadSpeechMarker[],
): boolean {
  const [ds, de] = detected;
  const dLen = de - ds;
  for (const gt of groundTruth) {
    const overlap = Math.min(de, gt.offsetSec) - Math.max(ds, gt.onsetSec);
    if (overlap > 0) {
      const gtLen = gt.offsetSec - gt.onsetSec;
      const shorter = Math.min(dLen, gtLen);
      if (overlap / shorter >= 0.5) return true;
    }
  }
  return false;
}

interface EvalResult {
  tp: number; // true positives  (speech detected, ground truth = speech)
  fp: number; // false positives (speech detected, ground truth = silence)
  fn: number; // false negatives (speech missed)
  tn: number; // true negatives  (correctly silent)
}

/**
 * Evaluates a VAD run against the ground-truth markers for one sample.
 *
 * Scoring is frame-level (10 ms granularity):
 *   - For each 10 ms frame, determine ground-truth label from markers.
 *   - Compare with VAD output label.
 */
function evaluateSample(
  detectedSegments: [number, number][],
  groundTruth: readonly VadSpeechMarker[],
  durationSec: number,
  containsSpeech: boolean,
): EvalResult {
  const numFrames = Math.floor((durationSec * 16000) / FRAME_SIZE_SAMPLES);
  const secPerFrame = FRAME_SIZE_SAMPLES / 16000;
  let tp = 0, fp = 0, fn = 0, tn = 0;

  for (let f = 0; f < numFrames; f++) {
    const frameMid = (f + 0.5) * secPerFrame;

    // Ground truth: is this frame within any labeled speech segment?
    let gtSpeech = false;
    if (containsSpeech && groundTruth.length > 0) {
      for (const gt of groundTruth) {
        if (frameMid >= gt.onsetSec && frameMid <= gt.offsetSec) {
          gtSpeech = true;
          break;
        }
      }
    }
    // If containsSpeech but no markers provided, treat entire file as speech.
    else if (containsSpeech && groundTruth.length === 0) {
      gtSpeech = true;
    }

    // VAD output: is this frame within any detected segment?
    let vadSpeech = false;
    for (const [s, e] of detectedSegments) {
      if (frameMid >= s && frameMid <= e) { vadSpeech = true; break; }
    }

    if (gtSpeech  && vadSpeech)  tp++;
    else if (!gtSpeech && vadSpeech)  fp++;
    else if (gtSpeech  && !vadSpeech) fn++;
    else                               tn++;
  }

  return { tp, fp, fn, tn };
}

// ── Corpus loading ────────────────────────────────────────────────────────

interface LoadedSample {
  sidecar: VadSampleSidecar;
  wav: WavData;
}

function loadCorpus(): { samples: LoadedSample[]; skipped: number; byCategory: Record<VadCategory, number> } {
  const samples: LoadedSample[] = [];
  let skipped = 0;
  const byCategory: Record<VadCategory, number> = { child: 0, adult: 0, ambient: 0, mixed: 0 };

  for (const cat of CATEGORIES) {
    const catDir = path.join(CORPUS_DIR, cat);
    if (!fs.existsSync(catDir)) continue;

    const jsonFiles = fs.readdirSync(catDir).filter(f => f.endsWith('.json'));

    for (const jsonFile of jsonFiles) {
      const jsonPath = path.join(catDir, jsonFile);
      let sidecar: VadSampleSidecar;

      try {
        sidecar = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as VadSampleSidecar;
      } catch (e) {
        console.warn(`Skipping ${jsonFile}: JSON parse error —`, (e as Error).message);
        skipped++;
        continue;
      }

      if (sidecar.labelState !== 'labeled') {
        skipped++;
        continue;
      }

      const wavPath = path.join(catDir, sidecar.baseName + '.wav');
      if (!fs.existsSync(wavPath)) {
        console.warn(`Skipping ${sidecar.baseName}: WAV file not found at ${wavPath}`);
        skipped++;
        continue;
      }

      let wav: WavData;
      try {
        wav = parseWav(fs.readFileSync(wavPath));
      } catch (e) {
        console.warn(`Skipping ${sidecar.baseName}: WAV parse error —`, (e as Error).message);
        skipped++;
        continue;
      }

      samples.push({ sidecar, wav });
      byCategory[cat]++;
    }
  }

  return { samples, skipped, byCategory };
}

// ── Grid search ───────────────────────────────────────────────────────────

interface GridResult {
  params: VadParams;
  tpr: number;
  fpr: number;
  score: number; // TPR - FPR
}

function gridSearch(samples: LoadedSample[]): GridResult {
  let best: GridResult = {
    params: { ...PLAN_DEFAULTS },
    tpr: 0,
    fpr: 0,
    score: -Infinity,
  };

  const totalSteps =
    E_THRESHOLD_RANGE.length *
    ZCR_LOW_RANGE.length *
    ZCR_HIGH_RANGE.length *
    HANGOVER_RANGE.length;

  let step = 0;
  const logInterval = Math.max(1, Math.floor(totalSteps / 10));

  for (const eThresholdDb of E_THRESHOLD_RANGE) {
    for (const zcrLow of ZCR_LOW_RANGE) {
      for (const zcrHigh of ZCR_HIGH_RANGE) {
        if (zcrHigh <= zcrLow) continue; // invalid range — skip
        for (const hangoverMs of HANGOVER_RANGE) {
          step++;
          if (step % logInterval === 0) {
            process.stdout.write(`  Grid search: ${step}/${totalSteps} steps\r`);
          }

          const params: VadParams = { eThresholdDb, zcrLow, zcrHigh, hangoverMs };
          let totalTp = 0, totalFp = 0, totalFn = 0, totalTn = 0;

          for (const { sidecar, wav } of samples) {
            const detected = runVad(wav.samples, wav.sampleRate, params);
            const res = evaluateSample(
              detected,
              sidecar.markers,
              wav.durationSec,
              sidecar.containsSpeech,
            );
            totalTp += res.tp;
            totalFp += res.fp;
            totalFn += res.fn;
            totalTn += res.tn;
          }

          const tpr = (totalTp + totalFn) > 0
            ? totalTp / (totalTp + totalFn)
            : 1; // no speech frames → perfect TPR vacuously
          const fpr = (totalFp + totalTn) > 0
            ? totalFp / (totalFp + totalTn)
            : 0;
          const score = tpr - fpr;

          if (score > best.score) {
            best = { params, tpr, fpr, score };
          }
        }
      }
    }
  }

  process.stdout.write('\n');
  return best;
}

// ── Main ──────────────────────────────────────────────────────────────────

function main(): void {
  console.log('VAD Calibration — corpus:', CORPUS_DIR);

  const { samples, skipped, byCategory } = loadCorpus();

  console.log(`Loaded ${samples.length} labeled samples (${skipped} skipped).`);
  console.log('By category:', byCategory);

  if (samples.length === 0) {
    console.warn(
      'No labeled samples found. Run record.sh to capture audio, then label.html to add markers.',
    );
    // Write a placeholder result so the file exists and calibrate.ts is
    // re-runnable; plan defaults are used as the best params.
    const placeholder: VadCalibrationResult = {
      producedAt: new Date().toISOString(),
      corpusSummary: { total: 0, labeled: 0, skipped, byCategory },
      bestParams: { ...PLAN_DEFAULTS },
      bestScore: 0,
      truePositiveRate: 0,
      falsePositiveRate: 0,
      gridSearchSteps: 0,
      planDefaults: { ...PLAN_DEFAULTS },
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(placeholder, null, 2) + '\n');
    console.log('Placeholder written to', OUTPUT_PATH);
    return;
  }

  console.log('Running grid search…');
  const totalSteps =
    E_THRESHOLD_RANGE.length *
    ZCR_LOW_RANGE.length *
    ZCR_HIGH_RANGE.length *
    HANGOVER_RANGE.length;
  console.log(`  Grid: ${totalSteps} parameter combinations`);

  const best = gridSearch(samples);

  const result: VadCalibrationResult = {
    producedAt: new Date().toISOString(),
    corpusSummary: {
      total: samples.length + skipped,
      labeled: samples.length,
      skipped,
      byCategory,
    },
    bestParams: {
      eThresholdDb: best.params.eThresholdDb,
      zcrLow: best.params.zcrLow,
      zcrHigh: best.params.zcrHigh,
      hangoverMs: best.params.hangoverMs,
    },
    bestScore: +best.score.toFixed(4),
    truePositiveRate: +best.tpr.toFixed(4),
    falsePositiveRate: +best.fpr.toFixed(4),
    gridSearchSteps: totalSteps,
    planDefaults: { ...PLAN_DEFAULTS },
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2) + '\n');

  console.log('\nBest parameters:');
  console.log(`  E_THRESHOLD:  ${best.params.eThresholdDb} dBFS  (plan default: ${PLAN_DEFAULTS.eThresholdDb})`);
  console.log(`  ZCR_LOW:      ${best.params.zcrLow}       (plan default: ${PLAN_DEFAULTS.zcrLow})`);
  console.log(`  ZCR_HIGH:     ${best.params.zcrHigh}      (plan default: ${PLAN_DEFAULTS.zcrHigh})`);
  console.log(`  HANGOVER_MS:  ${best.params.hangoverMs}       (plan default: ${PLAN_DEFAULTS.hangoverMs})`);
  console.log(`\nScore (TPR − FPR): ${best.score.toFixed(4)}`);
  console.log(`  TPR: ${best.tpr.toFixed(4)}  FPR: ${best.fpr.toFixed(4)}`);
  console.log('\nResult written to:', OUTPUT_PATH);
}

main();
