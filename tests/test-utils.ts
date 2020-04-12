import { parse } from '../src';
import { Evaluation, Result } from '../src/types';

export function elsaRun(code: string): Result[] {
  const program = parse(code);
  if (program instanceof Result) {
    return [program];
  } else {
    const env = program.buildEnv();
    if (env instanceof Result) {
      return [env];
    } else {
      return program.evals.map((ev: Evaluation) => ev.evaluate(env));
    }
  }
}
