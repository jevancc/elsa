import _ from 'lodash';
import { Node, Range } from './ast';
import { Expression } from './expression';
import { VariableMap } from './helper';
import { ErrorResult, Result } from './result';
import { Step } from './step';

export type Identifier = string;

export class Program extends Node {
  constructor(range: Range, public defns: Definition[], public evals: Evaluation[]) {
    super(range);
  }

  public buildEnv(): VariableMap | ErrorResult {
    const dupDefnIdResult = this.checkDuplicatedDefinId();
    if (dupDefnIdResult) {
      return dupDefnIdResult;
    }

    const env = new VariableMap(this.defns.map(defn => [defn.id, defn]));
    const ubVarResult = this.checkUnboundedVariableInDefn(env);
    if (ubVarResult) {
      return ubVarResult;
    } else {
      return env;
    }
  }

  private checkDuplicatedDefinId(): ErrorResult | null {
    const ids = new Set();
    for (const defn of this.defns) {
      if (ids.has(defn.id)) {
        return defn.makeError(`Identifier '${defn.id}' has already been declared`);
      } else {
        ids.add(defn.id);
      }
    }
    return null;
  }

  private checkUnboundedVariableInDefn(env: VariableMap): ErrorResult | null {
    for (const [, defn] of env) {
      if (defn instanceof Definition) {
        const freeVars = defn.expr.freeVariables();
        for (const [varId, varExpr] of freeVars) {
          if (!env.has(varId)) {
            return varExpr.makeError(
              `Definition '${defn.id}' has an unbounded variable '${varId}'`
            );
          }
        }
      }
    }
    return null;
  }
}

export class Evaluation extends Node {
  constructor(range: Range, public name: Identifier, public steps: Step[]) {
    super(range);
  }

  public evaluate(env: VariableMap): Result {
    const evaluation = this.steps.reduce(
      (prev: Expression | Result, step: Step) =>
        prev instanceof Result ? prev : step.evaluate(prev, env),
      null
    );

    if (evaluation instanceof Result) {
      return evaluation;
    } else {
      return this.makeSuccess();
    }
  }
}

export class Definition extends Node {
  constructor(range: Range, public id: Identifier, public expr: Expression) {
    super(range);
  }
}
