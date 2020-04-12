import fs from 'fs';
import * as pegjs from 'pegjs';
import * as tspegjs from 'ts-pegjs';

const grammarFile = 'src/grammar.pegjs';
const parserFile = 'src/parser.ts';

const grammar = fs.readFileSync(grammarFile).toString();
const parserSource = pegjs.generate(grammar, {
  cache: false,
  optimize: 'speed',
  output: 'source',
  plugins: [tspegjs],
  returnTypes: {
    ApplyExpression: 'types.ApplyExpression',
    Definition: 'types.Definition',
    Evaluation: 'types.Evaluation',
    Expression: 'types.Expression',
    FunctionExpression: 'types.Expression',
    Identifier: 'string',
    LambdaExpression: 'types.LambdaExpression',
    ParenthesesExpression: 'types.Expression',
    Program: 'types.Program',
    Step: 'types.Step',
    StepType: 'types.Step'
  },
  tspegjs: {
    customHeader: `
      import _ from 'lodash';
      import * as types from './types';
    `,
    noTslint: true
  }
});

fs.writeFileSync(parserFile, parserSource);
