interface LiveInlineDataPart {
  inlineData?: {
    data?: unknown;
  };
}

interface LiveServerContentLike {
  modelTurn?: {
    parts?: LiveInlineDataPart[] | null;
  } | null;
}

export function extractInlineAudioParts(serverContent: LiveServerContentLike | null | undefined): string[] {
  const parts = serverContent?.modelTurn?.parts;
  if (!Array.isArray(parts)) return [];

  const audioParts: string[] = [];
  for (const part of parts) {
    const data = part?.inlineData?.data;
    if (typeof data === 'string' && data.length > 0) {
      audioParts.push(data);
    }
  }

  return audioParts;
}
