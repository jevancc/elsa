// tslint:disable:no-expression-statement
import fs from 'fs';
import path from 'path';
import { Result } from '../src/types';
import { elsaRun } from './test-utils';

const casedir = 'tests/__cases__/invalid/';

describe('invalid-reduction', () => {
  fs.readdirSync(casedir).forEach(fname => {
    const code = fs.readFileSync(path.join(casedir, fname)).toString();
    test(fname, () => {
      elsaRun(code).forEach((result: Result) => {
        expect(result.type).toBe('Error');
        expect(result.message).toEqual(expect.stringContaining('invalid reduction'));
      });
    });
  });
});





