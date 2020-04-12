
// tslint:disable:no-expression-statement
import fs from 'fs';
import path from 'path';
import { Result } from '../src/types';
import { elsaRun } from './test-utils';

const casedir = 'tests/__cases__/ok/';

describe('ok', () => {
  fs.readdirSync(casedir).forEach(fname => {
    const code = fs.readFileSync(path.join(casedir, fname)).toString();
    test(fname, () => {
      elsaRun(code).forEach((result: Result) => {
        expect(result.type).toBe('Success');
      });
    });
  });
});
