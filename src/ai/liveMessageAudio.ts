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

export interface InlineAudioPart {
  data: string;
  index: number;
}

export function extractInlineAudioParts(serverContent: LiveServerContentLike | null | undefined): InlineAudioPart[] {
  const parts = serverContent?.modelTurn?.parts;
  if (!Array.isArray(parts)) return [];

  const audioParts: InlineAudioPart[] = [];
  for (let i = 0; i < parts.length; i++) {
    const data = parts[i]?.inlineData?.data;
    if (typeof data === 'string' && data.length > 0) {
      audioParts.push({ data, index: i });
    }
  }

  return audioParts;
}
