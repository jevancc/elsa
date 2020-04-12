import _ from 'lodash';
import { Node, Range } from './ast';
import { VariableMap } from './helper';
import { Definition, Identifier } from './program';

export abstract class Expression extends Node {
  public abstract substitute(
    env: VariableMap,
    normalVarName: boolean,
    expandDefn: boolean,
    deepExpand: boolean
  ): Expression;
  public abstract freeVariables(): Map<Identifier, Expression>;
  public abstract betaReduce(): Expression[];
  public abstract normalReduce(): Expression;
  public abstract equalsTo(expr: Expression): boolean;
  public abstract toString(): string;

  public alphaNormalize(env: VariableMap): Expression {
    return this.substitute(env.copy(), true, false, false);
  }

  public defnExpand(env: VariableMap): Expression {
    return this.substitute(env.copy(), false, true, true);
  }

  public normalize(env: VariableMap): Expression {
    return this.substitute(env.copy(), true, true, true);
  }

  public equivTo(expr: Expression, env: VariableMap): boolean {
    return this.normalize(env.copy()).equalsTo(expr.normalize(env.copy()));
  }
}

export class VariableExpression extends Expression {
  constructor(range: Range, public readonly id: Identifier) {
    super(range);
  }

  public freeVariables(): Map<Identifier, Expression> {
    return new Map([[this.id, this]]);
  }

  public substitute(
    env: VariableMap,
    normalizeVar = true,
    expandDefn = false,
    deepExpand = false
  ): Expression {
    const value = env.get(this.id);
    if (value instanceof Definition) {
      if (expandDefn) {
        if (normalizeVar || deepExpand) {
          return value.expr.substitute(env, normalizeVar, expandDefn && deepExpand, deepExpand);
        } else {
          return value.expr;
        }
      } else {
        return new VariableExpression(this.range, value.id);
      }
    } else {
      return new VariableExpression(this.range, value as Identifier);
    }
  }

  public betaReduce(): VariableExpression[] {
    return [];
  }

  public normalReduce(): VariableExpression {
    return new VariableExpression(this.range, this.id);
  }

  public equalsTo(expr: Expression): boolean {
    return expr instanceof VariableExpression && this.id === expr.id;
  }

  public toString(): string {
    return this.id;
  }
}

export class LambdaExpression extends Expression {
  public static make(range: Range, xs: Identifier[], expr: Expression): LambdaExpression {
    return _.reduceRight(
      xs,
      (e: Expression, x: Identifier) => new LambdaExpression(range, x, e),
      expr
    ) as LambdaExpression;
  }

  constructor(range: Range, public param: Identifier, public expr: Expression) {
    super(range);
  }

  public applyCallArg(arg: Expression): Expression {
    const freeVars = arg.freeVariables();
    const apply = (expr: Expression, isParamFree = false): Expression => {
      if (expr instanceof VariableExpression) {
        if (expr.id !== this.param) {
          return expr;
        } else if (isParamFree) {
          // Need to perform alpha-renaming first to resolve ambiguity
          // Example: (\x y -> x) (y)
          return null;
        } else {
          return arg;
        }
      } else if (expr instanceof ApplyExpression) {
        let lhs: Expression;
        let rhs: Expression;
        // tslint:disable no-conditional-assignment
        if ((lhs = apply(expr.lhs, isParamFree)) && (rhs = apply(expr.rhs, isParamFree))) {
          return new ApplyExpression(expr.range, lhs, rhs);
        } else {
          return null;
        }
        // tslint:enable no-conditional-assignment
      } else if (expr instanceof LambdaExpression) {
        if (this.param === expr.param) {
          return expr;
        } else {
          const bExpr = apply(expr.expr, isParamFree || freeVars.has(expr.param));
          if (bExpr) {
            return new LambdaExpression(expr.range, expr.param, bExpr);
          } else {
            return null;
          }
        }
      } else {
        throw new Error('Unreachable');
      }
    };

    return apply(this.expr);
  }

  public freeVariables(): Map<Identifier, Expression> {
    const vars = this.expr.freeVariables();
    vars.delete(this.param);
    return vars;
  }

  public substitute(
    env: VariableMap,
    normalizeVar = true,
    expandDefn = false,
    deepExpand = false
  ): LambdaExpression {
    if (normalizeVar) {
      const r = env.get(this.param);
      const newParamName = env.set(this.param) as string;
      const expr = new LambdaExpression(
        this.range,
        newParamName,
        this.expr.substitute(env, normalizeVar, expandDefn, deepExpand)
      );
      env.set(this.param, r);
      return expr;
    } else {
      return new LambdaExpression(
        this.range,
        this.param,
        this.expr.substitute(env, normalizeVar, expandDefn, deepExpand)
      );
    }
  }

  public betaReduce(): LambdaExpression[] {
    return this.expr.betaReduce().map(expr => new LambdaExpression(this.range, this.param, expr));
  }

  public normalReduce(): LambdaExpression {
    return new LambdaExpression(this.range, this.param, this.expr.normalReduce());
  }

  public equalsTo(expr: Expression): boolean {
    return (
      expr instanceof LambdaExpression && this.param === expr.param && this.expr.equalsTo(expr.expr)
    );
  }

  public toString(): string {
    let e = this.expr;
    let s = '\\' + this.param + ' ';
    while (e instanceof LambdaExpression) {
      s += e.param + ' ';
      e = e.expr;
    }
    s += '-> ' + e.toString();
    return s;
  }
}

export class ApplyExpression extends Expression {
  public static make(range: Range, exprs: Expression[]): ApplyExpression {
    return _.reduce(
      exprs,
      (ae: Expression, e: Expression) => new ApplyExpression(range, ae, e)
    ) as ApplyExpression;
  }

  constructor(range: Range, public lhs: Expression, public rhs: Expression) {
    super(range);
  }

  public freeVariables(): Map<Identifier, Expression> {
    const lvars = this.lhs.freeVariables();
    const rvars = this.rhs.freeVariables();
    rvars.forEach((v, k) => lvars.set(k, v));
    return lvars;
  }

  public substitute(
    env: VariableMap,
    normalizeVar = true,
    expandDefn = false,
    deepExpand = false
  ): ApplyExpression {
    return new ApplyExpression(
      this.range,
      this.lhs.substitute(env, normalizeVar, expandDefn, deepExpand),
      this.rhs.substitute(env, normalizeVar, expandDefn, deepExpand)
    );
  }

  public betaReduce(): Expression[] {
    const appliedExpr =
      this.lhs instanceof LambdaExpression && (this.lhs as LambdaExpression).applyCallArg(this.rhs);

    return [
      ...this.lhs.betaReduce().map(expr => new ApplyExpression(this.range, expr, this.rhs)),
      ...this.rhs.betaReduce().map(expr => new ApplyExpression(this.range, this.lhs, expr)),
      ...(appliedExpr ? [appliedExpr] : [])
    ];
  }

  public normalReduce(): Expression {
    const callByNameReduce = (e: Expression): Expression => {
      if (e instanceof ApplyExpression) {
        const rlhs = callByNameReduce(e.lhs);
        return rlhs instanceof LambdaExpression
          ? callByNameReduce(rlhs.applyCallArg(e.rhs))
          : new ApplyExpression(e.range, rlhs, e.rhs);
      } else {
        return e;
      }
    };

    const lhs = callByNameReduce(this.lhs);
    return lhs instanceof LambdaExpression
      ? lhs.applyCallArg(this.rhs).normalReduce()
      : new ApplyExpression(this.range, lhs.normalReduce(), this.rhs.normalReduce());
  }

  public equalsTo(expr: Expression): boolean {
    return (
      expr instanceof ApplyExpression && this.lhs.equalsTo(expr.lhs) && this.rhs.equalsTo(expr.rhs)
    );
  }

  public toString(): string {
    return `(${this.lhs.toString()}) (${this.rhs.toString()})`;
  }
}
