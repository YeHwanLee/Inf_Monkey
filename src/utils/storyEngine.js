export const TARGET_WORD = 'BANANA';
const TOTAL_CHARS = 20;

export function generateAttempt() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let fullText = '';

  for (let i = 0; i < TOTAL_CHARS; i++) {
    fullText += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  let bestMatchCount = -1;
  let bestMatchIndex = 0;

  for (let i = 0; i <= TOTAL_CHARS - TARGET_WORD.length; i++) {
    let currentMatch = 0;
    for (let j = 0; j < TARGET_WORD.length; j++) {
      if (fullText[i + j] === TARGET_WORD[j]) {
        currentMatch++;
      }
    }
    if (currentMatch > bestMatchCount) {
      bestMatchCount = currentMatch;
      bestMatchIndex = i;
    }
  }

  const matchRate = ((bestMatchCount / TARGET_WORD.length) * 100).toFixed(1);

  return {
    text: fullText,
    bestMatchIndex: bestMatchIndex,
    bestMatchCount: bestMatchCount,
    matchRate: parseFloat(matchRate),
  };
}
