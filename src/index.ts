import * as parser from './parser';
import { ErrorResult, Program, Range } from './types';

export function parse(code: string, options?: parser.IParseOptions): Program | ErrorResult {
  try {
    return parser.parse(code, options);
  } catch (err) {
    if (err.name && err.name === 'SyntaxError') {
      const range = Range.fromParserLocation(err.location);
      const message = err.message;
      return new ErrorResult(range, message);
    } else {
      throw err;
    }
  }
}
