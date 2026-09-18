import { UndeclaredVariableError } from "./errors.js";

const key = (name) => String(name).toUpperCase();

export class Environment {
  constructor(parent = null) {
    this.parent = parent;
    this.values = new Map();
  }

  child() {
    return new Environment(this);
  }

  declare(name, value = null) {
    this.values.set(key(name), value);
    return value;
  }

  has(name) {
    const normalized = key(name);
    return this.values.has(normalized) || Boolean(this.parent?.has(normalized));
  }

  get(name) {
    const normalized = key(name);
    if (this.values.has(normalized)) return this.values.get(normalized);
    if (this.parent) return this.parent.get(normalized);
    throw new UndeclaredVariableError(name);
  }

  set(name, value) {
    const normalized = key(name);
    if (this.values.has(normalized)) {
      this.values.set(normalized, value);
      return value;
    }
    if (this.parent?.has(normalized)) return this.parent.set(normalized, value);
    throw new UndeclaredVariableError(name);
  }
}
