import { parseCards } from '../../src/game/deck';
import { evaluateStep, findSolution } from '../../src/tutorial/evaluate';
import { LESSONS } from '../../src/tutorial/lessons';

describe('tutorial lessons', () => {
  const steps = LESSONS.flatMap(l => l.steps.map(s => ({ lesson: l.id, step: s })));

  it('has valid card ids everywhere', () => {
    steps.forEach(({ step }) => {
      [step.cards, step.pile, step.starter, step.reveal?.hand, step.reveal?.starter].forEach(c => {
        if (c) {
          expect(() => parseCards(c)).not.toThrow();
        }
      });
    });
  });

  it.each(steps.filter(s => s.step.check).map(s => [s.lesson, s.step.title, s.step] as const))(
    '%s / %s can be solved and rejects an empty answer',
    (_l, _t, step) => {
      const sol = findSolution(step);
      expect(sol).not.toBeNull();
      expect(evaluateStep(step, sol!).ok).toBe(true);
      if (step.check!.kind !== 'discard') {
        expect(evaluateStep(step, []).ok).toBe(false);
      }
    },
  );

  it('rejects wrong answers', () => {
    const fifteen = LESSONS.find(l => l.id === 'fifteens')!.steps[1];
    expect(evaluateStep(fifteen, ['7C', '3S']).ok).toBe(false);
    expect(evaluateStep(fifteen, ['7C', '8D']).ok).toBe(true);
    const nobs = LESSONS.find(l => l.id === 'starter')!.steps[3];
    expect(evaluateStep(nobs, ['JS']).ok).toBe(false);
    expect(evaluateStep(nobs, ['JH']).ok).toBe(true);
    const peg31 = LESSONS.find(l => l.id === 'pegging')!.steps[4];
    expect(evaluateStep(peg31, ['5H']).ok).toBe(false); // would be 32
    expect(evaluateStep(peg31, ['4C']).ok).toBe(true);
  });
});
