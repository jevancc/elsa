#!/usr/bin/env node
// tslint:disable no-shadowed-variable
import chalk from 'chalk';
import fs from 'fs';
import _ from 'lodash';
import ora from 'ora';
import yargs from 'yargs';
import { parse } from './parser';
import {
  ErrorResult,
  Evaluation,
  InfoResult,
  Range,
  SuccessResult,
  VariableMap,
  WarningResult
} from './types';

const argv = yargs
  .command('* <file>', '', yargs => {
    yargs.positional('file', {
      describe: 'input read from file',
      type: 'string'
    });
  })
  .help().argv;

function makeCodeRegionString(code: any, range: Range): string {
  const loc = range.start;
  const lineRange = [Math.max(loc.line - 1, 0), Math.max(loc.line - 1, 0) + 3];

  const makeLineNumber = (n = '') => {
    return chalk.gray(_.padStart(n.toString(), 6) + '| ');
  };

  return code
    .split('\n')
    .map((line, i) => {
      if (_.inRange(i, lineRange[0], lineRange[1])) {
        return (
          makeLineNumber(i + 1) +
          line +
          (i === loc.line ? '\n' + makeLineNumber() + _.padStart('^^', loc.column + 2) : '')
        );
      } else {
        return null;
      }
    })
    .filter(s => s)
    .join('\n');
}

function printCodeRegion(code: any, range: Range): void {
  process.stdout.write(makeCodeRegionString(code, range) + '\n\n');
}

function printSummary(nEvals: number, nPassed: number, nFailed: number): void {
  process.stdout.write(
    [
      '',
      chalk.greenBright(
        `${_.padEnd('-- Passed:', 10)} ${_.padStart(nPassed.toString(), 3)} / ${_.padStart(
          nEvals.toString(),
          3
        )}`
      ),
      chalk.redBright(
        `${_.padEnd('-- Failed:', 10)} ${_.padStart(nFailed.toString(), 3)} / ${_.padStart(
          nEvals.toString(),
          3
        )}`
      )
    ].join('\n')
  );
}

export function elsa(filename: string): void {
  const code = fs.readFileSync(filename).toString();

  const logParseEnv = ora(`... Parsing and Checking Definitions`).start();
  const program = parse(code);
  const envResult = program.buildEnv();
  let env: VariableMap = null;
  if (envResult instanceof ErrorResult) {
    logParseEnv.fail('... Parsing and Checking Definitions').stop();
    process.stdout.write(chalk.redBright(_.padStart('- ', 4) + envResult.message) + '\n');
    printCodeRegion(code, envResult.range);
    return;
  } else {
    logParseEnv.succeed('... Parsing and Checking Definitions').stop();
    env = envResult;
  }

  const nEvals = program.evals.length;
  let nPassed = 0;
  let nFailed = 0;

  program.evals.forEach((ev: Evaluation) => {
    const log = ora(chalk.bgCyan(' RUNS ') + ` ${ev.name}`).start();
    const result = ev.evaluate(env);
    if (result instanceof SuccessResult) {
      log.succeed(chalk.bgGreen(' PASS ') + ` ${chalk.whiteBright(ev.name)}`).stop();
      nPassed += 1;
    } else if (result instanceof ErrorResult) {
      log.fail(chalk.bgRed(' FAIL ') + ` ${chalk.whiteBright(ev.name)}`).stop();
      process.stdout.write(chalk.redBright(_.padStart('- ', 4) + result.message) + '\n');
      printCodeRegion(code, result.range);

      nFailed += 1;
    } else if (result instanceof WarningResult) {
      log.warn(chalk.bgYellow(' WARN ') + ` ${chalk.whiteBright(ev.name)}`).stop();
      process.stdout.write(chalk.yellowBright(_.padStart('- ', 4) + result.message) + '\n');
      printCodeRegion(code, result.range);

      nPassed += 1;
    } else if (result instanceof InfoResult) {
      log.info(chalk.bgGray(' INFO ') + ` ${chalk.whiteBright(ev.name)}`).stop();
      nPassed += 1;
    } else {
      log.stop();
    }
  });

  printSummary(nEvals, nPassed, nFailed);
}

elsa(argv.file as string);
