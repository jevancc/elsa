import { Range } from './ast';

export abstract class Result {
  public readonly type: string;
  public readonly range: Range;
  public readonly message?: string;
}

export class SuccessResult extends Result {
  public readonly type = 'Success';
  constructor(public readonly range: Range, public readonly message?: string) {
    super();
  }
}

export class InfoResult extends Result {
  public readonly type = 'Info';
  constructor(public readonly range: Range, public readonly message?: string) {
    super();
  }
}
export class WarningResult extends Result {
  public readonly type = 'Warning';
  constructor(public readonly range: Range, public readonly message?: string) {
    super();
  }
}

export class ErrorResult extends Result {
  public readonly type = 'Error';
  constructor(public readonly range: Range, public readonly message?: string) {
    super();
  }
}
