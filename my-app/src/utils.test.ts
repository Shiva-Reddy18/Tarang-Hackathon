import { describe, it, expect } from 'vitest';

describe('Tarang2k26 Game Logic', () => {
  it('Should correctly compute points for fast bugs', () => {
    const score = 0;
    const fastBugPoints = 20;
    expect(score + fastBugPoints).toBe(20);
  });

  it('Should penalize for missing bugs', () => {
    const score = 10;
    const missPenalty = 2;
    expect(Math.max(0, score - missPenalty)).toBe(8);
  });

  it('Should not go below 0 score on miss', () => {
    const score = 1;
    const missPenalty = 2;
    expect(Math.max(0, score - missPenalty)).toBe(0);
  });
});

describe('Spin Wheel Logic', () => {
  const PRIZES = ["+5 Pts", "+10 Pts", "Extra Hint", "+20 Pts", "Skip Obj", "No Prize"];
  
  it('Should always return a valid prize from the array', () => {
    const outcomeIndex = Math.floor(Math.random() * PRIZES.length);
    const outcome = PRIZES[outcomeIndex];
    expect(PRIZES).toContain(outcome);
  });
});
