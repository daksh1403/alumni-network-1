export class PlsqlError extends Error {
  constructor(message, code = "PLSQL_ERROR", position = null) {
    super(message);
    this.name = code;
    this.code = code;
    this.position = position;
  }
}

export class SyntaxError extends PlsqlError {
  constructor(message, position = null) {
    super(message, "SYNTAX_ERROR", position);
  }
}

export class UndeclaredVariableError extends PlsqlError {
  constructor(name) {
    super(`Variable "${name}" has not been declared.`, "UNDECLARED_VARIABLE");
  }
}

export class UnsupportedFeatureError extends PlsqlError {
  constructor(feature) {
    super(`${feature} is not currently supported.`, "UNSUPPORTED_FEATURE");
  }
}

export class NoDataFoundError extends PlsqlError {
  constructor() {
    super("SELECT INTO returned no rows.", "NO_DATA_FOUND");
  }
}

export class TooManyRowsError extends PlsqlError {
  constructor() {
    super("SELECT INTO returned more than one row.", "TOO_MANY_ROWS");
  }
}

export class ZeroDivideError extends PlsqlError {
  constructor() {
    super("division by zero", "ZERO_DIVIDE");
  }
}
