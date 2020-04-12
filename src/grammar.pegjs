
{
  function range() {
    const loc = location();
    const start = new types.Location(loc.start.offset, loc.start.line - 1, loc.start.column - 1);
    const end = new types.Location(loc.end.offset, loc.end.line - 1, loc.end.column - 1);
    return new types.Range(start, end);
  }
}
Program "program"
  = defns:(_ Definition _)* evals:(_ Evaluation _)* {
    defns = defns.map(e => e[1]);
    evals = evals.map(e => e[1]);
    return new types.Program(range(), defns, evals);
  }

Definition "definition"
  = "let" _ id:Identifier _ "=" _ expr:Expression {
    return new types.Definition(range(), id, expr);
  }

Evaluation "eval"
  = "eval" _ name:Identifier _ ":" _ rootExpr:Expression steps:(_ Step)* {
    steps = steps.map((e) => e[1]);
    return new types.Evaluation(range(), name, [
      new types.StepRoot(rootExpr.range, rootExpr),
      ...steps,
      ...(steps.length > 0
        ? [new types.StepIsNorm((_.last(steps) as types.Step).range)]
        : [])
    ]);
  }

Step "step"
  = stepType:StepType _ expr:Expression {
    return new stepType(range(), expr);
  }

StepType
  = "=a>" { return types.StepAlpha; }
  / "=b>" { return types.StepBeta; }
  / "=d>" { return types.StepDefn; }
  / "=*>" { return types.StepTrns; }
  / "=~>" { return types.StepNorm; }
  / "<b=" { return types.StepUnBeta; }
  / "<*=" { return types.StepUnTrns; }

Expression "expression"
  = LambdaExpression
  / ApplyExpression
  / Identifier
  / ParenthesesExpression

LambdaExpression "lambda expression"
  = "\\" xs:(_ Identifier _)+ "->" _ expr:Expression {
    xs = xs.map((e) => e[1]);
    return types.LambdaExpression.make(range(), xs, expr);
  }

ApplyExpression "apply expression"
  = expr:FunctionExpression exprs:(_ FunctionExpression)* {
    exprs = [expr].concat(exprs.map((e) => e[1]));
    return types.ApplyExpression.make(range(), exprs);
  }

FunctionExpression "function expression"
  = id:Identifier {
    return new types.VariableExpression(range(), id);
  }
  / ParenthesesExpression

ParenthesesExpression
  = "(" _ expr:Expression _ ")" {
    return expr;
  }

Identifier
  = !Keyword ([a-zA-Z0-9][a-zA-Z#_0-9]*) {
  	return text();
  }

Keyword
  = "let" / "eval"

_ "whitespace"
  = (__ / "\n"/ LineComment)*

__
  = [ \t\r]
  / BlockComment

EOF "end of input"
  = !.

LineComment "comment"
  = "--" (!"\n" .)* ("\n" / EOF)

BlockComment "comment"
  = "{-" (!"-}" .)* "-}"
