import { IFileRange } from '../parser';
import { ErrorResult, InfoResult, SuccessResult, WarningResult } from './result';

export class Location {
  public static min(...locations: Location[]) {
    return locations.reduce((m, l) => (m.offset <= l.offset ? m : l));
  }

  public static max(...locations: Location[]) {
    return locations.reduce((m, l) => (m.offset >= l.offset ? m : l));
  }

  constructor(
    public readonly offset,
    public readonly line: number,
    public readonly column: number
  ) {}
}

export class Range {
  public static fromParserLocation(loc: IFileRange): Range {
    const start = new Location(loc.start.offset, loc.start.line - 1, loc.start.column - 1);
    const end = new Location(loc.end.offset, loc.end.line - 1, loc.end.column - 1);
    return new Range(start, end);
  }

  constructor(public readonly start: Location, public readonly end: Location) {}

  public merge(...ranges: Range[]) {
    const start = Location.min(this.start, ...ranges.map(r => r.start));
    const end = Location.max(this.end, ...ranges.map(r => r.end));
    return new Range(start, end);
  }
}

export class Node {
  constructor(public range: Range) {}

  public makeError(message?: string): ErrorResult {
    return new ErrorResult(this.range, message);
  }

  public makeWarning(message?: string): WarningResult {
    return new WarningResult(this.range, message);
  }

  public makeInfo(message?: string): InfoResult {
    return new InfoResult(this.range, message);
  }

  public makeSuccess(message?: string): SuccessResult {
    return new SuccessResult(this.range, message);
  }
}
