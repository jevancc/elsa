import { Definition, Identifier } from './program';

type VariableMapValue = Identifier | Definition;

export class VariableMap {
  private vars: Map<Identifier, VariableMapValue>;
  private idcnt = 0;

  constructor(items?: Array<[Identifier, VariableMapValue]>) {
    this.vars = new Map(items || []);
  }

  public [Symbol.iterator]() {
    return this.vars[Symbol.iterator]();
  }

  public get(id: Identifier): VariableMapValue {
    return this.vars.get(id) || id;
  }

  public set(id: Identifier, value?: VariableMapValue): VariableMapValue {
    value = value || this.createVariableId();
    this.vars.set(id, value);
    return value;
  }

  public delete(id: Identifier): boolean {
    return this.vars.delete(id);
  }

  public has(id: Identifier): boolean {
    return this.vars.has(id);
  }

  public copy(): VariableMap {
    const nmap = new VariableMap([...this.vars]);
    nmap.idcnt = this.idcnt;
    return nmap;
  }

  private createVariableId(): Identifier {
    return `$x${this.idcnt++}`;
  }
}
