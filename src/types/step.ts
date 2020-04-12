import { Node, Range } from './ast';
import { Expression } from './expression';
import { VariableMap } from './helper';
import { ErrorResult, Result } from './result';

export abstract class Step extends Node {
  constructor(range: Range, public readonly target: Expression) {
    super(range);
  }

  public evaluate(expr: Expression, env: VariableMap): Expression | Result {
    try {
      return this.evaluate_(expr, env);
    } catch (err) {
      return this.makeError(err.message);
    }
  }

  public makeEvaluateResult(
    isSuccess: boolean,
    failedResult: Result,
    successfulExpression?: Expression
  ) {
    return isSuccess ? successfulExpression || this.target : failedResult;
  }

  protected abstract evaluate_(expr: Expression, env: VariableMap): Expression | Result;
}

export class StepRoot extends Step {
  constructor(range: Range, public target: Expression) {
    super(range, target);
  }

  protected evaluate_(expr: Expression, env: VariableMap): Expression | Result {
    return this.target;
  }
}

export class StepAlpha extends Step {
  constructor(range: Range, public target: Expression) {
    super(range, target);
  }

  protected evaluate_(expr: Expression, env: VariableMap): Expression | Result {
    const e1 = this.target.alphaNormalize(env);
    const e2 = expr.alphaNormalize(env);

    return this.makeEvaluateResult(
      e1.equalsTo(e2),
      this.makeError('Expression is an invalid reduction')
    );
  }
}

export class StepBeta extends Step {
  public static isBetaEq(e1: Expression, e2: Expression, env: VariableMap): boolean {
    const betaReducedExprs = e2.betaReduce();
    return betaReducedExprs.some(candidate => candidate.equalsTo(e1));
  }

  constructor(range: Range, public target: Expression) {
    super(range, target);
  }

  protected evaluate_(expr: Expression, env: VariableMap): Expression | Result {
    return this.makeEvaluateResult(
      StepBeta.isBetaEq(this.target, expr, env),
      this.makeError('Expression is an invalid reduction')
    );
  }
}

export class StepUnBeta extends StepBeta {
  constructor(range: Range, public expr: Expression) {
    super(range, expr);
  }

  protected evaluate_(expr: Expression, env: VariableMap): Expression | Result {
    return this.makeEvaluateResult(
      StepBeta.isBetaEq(expr, this.target, env),
      this.makeError('Expression is an invalid reduction')
    );
  }
}

export class StepDefn extends Step {
  constructor(range: Range, public target: Expression) {
    super(range, target);
  }

  protected evaluate_(expr: Expression, env: VariableMap): Expression | Result {
    const e1 = this.target.defnExpand(env);
    const e2 = expr.defnExpand(env);

    return this.makeEvaluateResult(
      e1.equalsTo(e2),
      this.makeError('Expression is an invalid reduction')
    );
  }
}

export class StepTrns extends Step {
  public static isTrnsEq(e1: Expression, e2: Expression, env: VariableMap) {
    const init = e2.normalize(env);
    const stack = [init];
    const seen = new Set();

    while (stack.length > 0) {
      const e = stack.pop();
      const eHash = e.toString();
      if (!seen.has(eHash)) {
        if (e.equivTo(e1, env)) {
          return true;
        } else {
          seen.add(eHash);
          const bExprs = e.betaReduce();
          stack.push(...bExprs);
        }
      }
    }
    return false;
  }

  constructor(range: Range, public target: Expression) {
    super(range, target);
  }

  protected evaluate_(expr: Expression, env: VariableMap): Expression | Result {
    return this.makeEvaluateResult(
      StepTrns.isTrnsEq(this.target, expr, env),
      this.makeError('Expression is an invalid reduction')
    );
  }
}

export class StepUnTrns extends StepTrns {
  constructor(range: Range, public expr: Expression) {
    super(range, expr);
  }

  protected evaluate_(expr: Expression, env: VariableMap): Expression | Result {
    return this.makeEvaluateResult(
      StepTrns.isTrnsEq(expr, this.target, env),
      this.makeError('Expression is an invalid reduction')
    );
  }
}

export class StepNorm extends Step {
  constructor(range: Range, public target: Expression) {
    super(range, target);
  }

  protected evaluate_(expr: Expression, env: VariableMap): Expression | Result {
    const e1 = expr
      .normalize(env)
      .normalReduce()
      .alphaNormalize(env);
    const e2 = this.target.normalize(env);

    return this.makeEvaluateResult(
      e1.equalsTo(e2),
      this.makeError('Expression is an invalid reduction')
    );
  }
}

export class StepIsNorm extends Step {
  constructor(range: Range) {
    super(range, null);
  }

  protected evaluate_(expr: Expression, env: VariableMap): Expression | Result {
    return this.makeEvaluateResult(
      expr.normalize(env).betaReduce().length === 0,
      this.makeError('Expression can be further reduced'),
      expr
    );
  }
}
