const TWO_CHAR_OPERATORS = new Set([":=", "..", "||", "<=", ">=", "<>", "!="]);
const SINGLE_CHAR = new Set("()+-*/%,;.=<>:".split(""));

export function tokenize(source) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let column = 1;

  const advance = (count = 1) => {
    for (let j = 0; j < count; j += 1) {
      if (source[i] === "\n") {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      i += 1;
    }
  };

  const add = (type, value, startLine, startColumn, raw = value) => {
    tokens.push({ type, value, raw, line: startLine, column: startColumn });
  };

  while (i < source.length) {
    if (/\s/.test(source[i])) {
      advance();
      continue;
    }
    if (source.startsWith("--", i)) {
      while (i < source.length && source[i] !== "\n") advance();
      continue;
    }
    if (source.startsWith("/*", i)) {
      advance(2);
      while (i < source.length && !source.startsWith("*/", i)) advance();
      if (i < source.length) advance(2);
      continue;
    }

    const startLine = line;
    const startColumn = column;
    const char = source[i];

    if (char === "'") {
      advance();
      let value = "";
      while (i < source.length) {
        if (source[i] === "'" && source[i + 1] === "'") {
          value += "'";
          advance(2);
        } else if (source[i] === "'") {
          advance();
          break;
        } else {
          value += source[i];
          advance();
        }
      }
      add("string", value, startLine, startColumn);
      continue;
    }

    const number = source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      advance(number[0].length);
      add("number", Number(number[0]), startLine, startColumn, number[0]);
      continue;
    }

    const identifier = source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_$#]*/);
    if (identifier) {
      advance(identifier[0].length);
      add("identifier", identifier[0].toUpperCase(), startLine, startColumn, identifier[0]);
      continue;
    }

    const two = source.slice(i, i + 2);
    if (TWO_CHAR_OPERATORS.has(two)) {
      advance(2);
      add("operator", two, startLine, startColumn);
      continue;
    }
    if (SINGLE_CHAR.has(char)) {
      advance();
      add("operator", char, startLine, startColumn);
      continue;
    }

    throw new Error(`Unexpected character "${char}" at line ${line}, column ${column}.`);
  }

  tokens.push({ type: "eof", value: "EOF", raw: "", line, column });
  return tokens;
}
