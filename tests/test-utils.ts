import { parse } from '../src/parser';
import { Evaluation, Result } from '../src/types';

export function elsaRun(code: string): Result[] {
  const program = parse(code);
  const env = program.buildEnv();
  if (env instanceof Result) {
    return [env];
  } else {
    return program.evals.map((ev: Evaluation) => ev.evaluate(env));
  }
}
