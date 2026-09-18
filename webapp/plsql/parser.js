import { tokenize } from "./tokenizer.js";
import { SyntaxError, UnsupportedFeatureError } from "./errors.js";

const TYPES = new Set(["NUMBER", "INTEGER", "VARCHAR2", "VARCHAR", "CHAR", "BOOLEAN"]);
const BINARY_PRECEDENCE = new Map([
  ["OR", 1], ["AND", 2], ["=", 3], ["<>", 3], ["!=", 3], ["<", 3], ["<=", 3], [">", 3], [">=", 3],
  ["||", 4], ["+", 5], ["-", 5], ["*", 6], ["/", 6],
]);

const tokenSql = (token) => {
  if (token.type === "string") return `'${token.value.replaceAll("'", "''")}'`;
  if (token.type === "identifier") return token.value;
  return token.raw ?? String(token.value);
};

function tokensToSql(tokens) {
  return tokens.map(tokenSql).join(" ").trim();
}

class Parser {
  constructor(source) {
    this.tokens = tokenize(source);
    this.index = 0;
  }

  current() { return this.tokens[this.index]; }
  at(value) { return this.current().value === value; }
  match(value) {
    if (!this.at(value)) return false;
    this.index += 1;
    return true;
  }
  expect(value, message = `Expected ${value}.`) {
    if (!this.match(value)) throw new SyntaxError(message, this.current());
  }
  take() {
    const token = this.current();
    this.index += 1;
    return token;
  }
  expectIdentifier(message = "Expected identifier.") {
    const token = this.current();
    if (token.type !== "identifier") throw new SyntaxError(message, token);
    this.index += 1;
    return token.value;
  }
  consumeSemicolon() {
    this.expect(";", "Expected semicolon.");
  }

  parse() {
    if (this.at("CREATE")) return this.parseDefinition();
    const statement = this.parseBlock();
    this.match("/");
    if (!this.at("EOF")) throw new SyntaxError("Unexpected tokens after PL/SQL statement.", this.current());
    return statement;
  }

  parseDefinition() {
    this.expect("CREATE"); this.expect("OR"); this.expect("REPLACE");
    const kind = this.expectIdentifier("Expected PROCEDURE, FUNCTION, or TRIGGER.");
    if (kind === "TRIGGER") return this.parseTriggerDefinition();
    if (kind !== "PROCEDURE" && kind !== "FUNCTION") throw new UnsupportedFeatureError(kind);
    const name = this.expectIdentifier();
    const parameters = this.parseParameters();
    let returnType = null;
    if (kind === "FUNCTION") {
      this.expect("RETURN", "Expected RETURN type in function definition.");
      returnType = this.expectIdentifier();
    }
    this.match("IS"); this.match("AS");
    const body = this.parseBlock();
    this.match("/");
    if (!this.at("EOF")) throw new SyntaxError("Unexpected tokens after routine definition.", this.current());
    return { type: kind === "PROCEDURE" ? "ProcedureDefinition" : "FunctionDefinition", name, parameters, returnType, body };
  }

  parseParameters() {
    const parameters = [];
    if (!this.match("(")) return parameters;
    if (!this.match(")")) {
      do {
        const name = this.expectIdentifier();
        let mode = "IN";
        if (this.at("IN")) { this.take(); mode = this.match("OUT") ? "IN OUT" : "IN"; }
        else if (this.match("OUT")) mode = "OUT";
        const dataType = this.expectIdentifier();
        if (this.match("(")) { while (!this.match(")")) this.take(); }
        parameters.push({ name, mode, dataType });
      } while (this.match(","));
      this.expect(")");
    }
    return parameters;
  }

  parseTriggerDefinition() {
    const name = this.expectIdentifier();
    const timing = this.expectIdentifier();
    const event = this.expectIdentifier();
    this.expect("ON", "Expected ON in trigger definition.");
    const tableName = this.expectIdentifier();
    this.match("IS"); this.match("AS");
    const body = this.parseBlock();
    this.match("/");
    if (!this.at("EOF")) throw new SyntaxError("Unexpected tokens after trigger definition.", this.current());
    return { type: "TriggerDefinition", name, timing, event, tableName, body };
  }

  parseBlock() {
    const declarations = [];
    if (this.match("DECLARE")) {
      while (!this.at("BEGIN")) declarations.push(this.parseDeclaration());
    }
    this.expect("BEGIN", "Expected BEGIN.");
    const body = this.parseStatements(new Set(["EXCEPTION", "END"]));
    let exception = null;
    if (this.match("EXCEPTION")) exception = this.parseExceptionBlock();
    this.expect("END", "Expected END.");
    this.match(this.current().type === "identifier" ? this.current().value : "__NO_LABEL__");
    this.consumeSemicolon();
    return { type: "Block", declarations, body, exception };
  }

  parseDeclaration() {
    if (this.match("CURSOR")) {
      const name = this.expectIdentifier();
      this.expect("IS", "Expected IS after cursor name.");
      const sql = this.collectUntilSemicolon();
      return { type: "CursorDeclaration", name, sql };
    }
    const name = this.expectIdentifier("Expected variable name.");
    const dataType = this.expectIdentifier("Expected variable type.");
    if (!TYPES.has(dataType)) throw new UnsupportedFeatureError(`Variable type ${dataType}`);
    if (this.match("(")) {
      while (!this.match(")")) this.take();
    }
    let initializer = null;
    if (this.match(":=")) initializer = this.parseExpression();
    this.consumeSemicolon();
    return { type: "VariableDeclaration", name, dataType, initializer };
  }

  parseStatements(stopWords) {
    const statements = [];
    while (!stopWords.has(this.current().value) && !this.at("EOF")) statements.push(this.parseStatement());
    return statements;
  }

  parseStatement() {
    if (this.at("NULL")) { this.take(); this.consumeSemicolon(); return { type: "NullStatement" }; }
    if (this.at("DBMS_OUTPUT")) return this.parseOutput();
    if (this.at("IF")) return this.parseIf();
    if (this.at("FOR")) return this.parseFor();
    if (this.at("WHILE")) return this.parseWhile();
    if (this.at("LOOP")) return this.parseLoop();
    if (this.at("EXIT")) return this.parseExit();
    if (this.at("SELECT")) return this.parseSelectInto();
    if (["INSERT", "UPDATE", "DELETE", "CREATE", "ALTER", "DROP"].includes(this.current().value)) {
      const sql = this.collectUntilSemicolon();
      return { type: "SqlStatement", sql };
    }
    if (this.at("OPEN")) { this.take(); const name = this.expectIdentifier(); this.consumeSemicolon(); return { type: "OpenCursor", name }; }
    if (this.at("FETCH")) return this.parseFetch();
    if (this.at("CLOSE")) { this.take(); const name = this.expectIdentifier(); this.consumeSemicolon(); return { type: "CloseCursor", name }; }
    if (this.at("RETURN")) { this.take(); const expression = this.parseExpression(); this.consumeSemicolon(); return { type: "ReturnStatement", expression }; }

    if (this.current().type === "identifier") {
      const name = this.take().value;
      if (this.match(":=")) {
        const expression = this.parseExpression();
        this.consumeSemicolon();
        return { type: "Assignment", name, expression };
      }
      const args = this.parseCallArguments();
      this.consumeSemicolon();
      return { type: "ProcedureCall", name, args };
    }

    const sql = this.collectUntilSemicolon();
    if (/^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(sql)) return { type: "SqlStatement", sql };
    throw new SyntaxError(`Unsupported statement beginning with ${this.current().value}.`, this.current());
  }

  parseOutput() {
    this.expect("DBMS_OUTPUT"); this.expect("."); this.expect("PUT_LINE"); this.expect("(");
    const expression = this.parseExpression();
    this.expect(")"); this.consumeSemicolon();
    return { type: "OutputStatement", expression };
  }

  parseIf() {
    this.expect("IF");
    const branches = [];
    const condition = this.parseExpression();
    this.expect("THEN", "Expected THEN after IF condition.");
    branches.push({ condition, body: this.parseStatements(new Set(["ELSIF", "ELSE", "END"])) });
    while (this.match("ELSIF")) {
      const nextCondition = this.parseExpression();
      this.expect("THEN", "Expected THEN after ELSIF condition.");
      branches.push({ condition: nextCondition, body: this.parseStatements(new Set(["ELSIF", "ELSE", "END"])) });
    }
    const alternate = this.match("ELSE") ? this.parseStatements(new Set(["END"])) : [];
    this.expect("END"); this.expect("IF"); this.consumeSemicolon();
    return { type: "IfStatement", branches, alternate };
  }

  parseFor() {
    this.expect("FOR");
    const name = this.expectIdentifier();
    this.expect("IN", "Expected IN in FOR loop.");
    if (this.match("(")) {
      const sql = this.collectBalancedUntil(")");
      this.expect(")"); this.expect("LOOP");
      const body = this.parseStatements(new Set(["END"]));
      this.expect("END"); this.expect("LOOP"); this.consumeSemicolon();
      return { type: "CursorForLoop", name, sql, body };
    }
    if (this.current().type === "identifier" && this.tokens[this.index + 1]?.value === "IN") {
      const queryName = this.take().value;
      this.expect("IN"); this.expect("(");
      const sql = this.collectBalancedUntil(")");
      this.expect(")"); this.expect("LOOP");
      const body = this.parseStatements(new Set(["END"]));
      this.expect("END"); this.expect("LOOP"); this.consumeSemicolon();
      return { type: "CursorForLoop", name, queryName, sql, body };
    }
    const reverse = this.match("REVERSE");
    const start = this.parseExpression(); this.expect(".."); const end = this.parseExpression();
    this.expect("LOOP");
    const body = this.parseStatements(new Set(["END"]));
    this.expect("END"); this.expect("LOOP"); this.consumeSemicolon();
    return { type: "ForLoop", name, start, end, reverse, body };
  }

  parseWhile() {
    this.expect("WHILE"); const condition = this.parseExpression(); this.expect("LOOP");
    const body = this.parseStatements(new Set(["END"]));
    this.expect("END"); this.expect("LOOP"); this.consumeSemicolon();
    return { type: "WhileLoop", condition, body };
  }

  parseLoop() {
    this.expect("LOOP"); const body = this.parseStatements(new Set(["END"]));
    this.expect("END"); this.expect("LOOP"); this.consumeSemicolon();
    return { type: "Loop", body };
  }

  parseExit() {
    this.expect("EXIT"); this.expect("WHEN", "Expected WHEN after EXIT.");
    const condition = this.parseExpression(); this.consumeSemicolon();
    return { type: "ExitWhen", condition };
  }

  parseFetch() {
    this.expect("FETCH"); const cursor = this.expectIdentifier(); this.expect("INTO");
    const targets = [this.expectIdentifier()];
    while (this.match(",")) targets.push(this.expectIdentifier());
    this.consumeSemicolon();
    return { type: "FetchCursor", cursor, targets };
  }

  parseSelectInto() {
    const tokens = this.collectUntilSemicolonTokens();
    const intoIndex = tokens.findIndex((token) => token.value === "INTO");
    if (intoIndex < 0) return { type: "SqlStatement", sql: tokensToSql(tokens) };
    const fromIndex = tokens.findIndex((token, index) => index > intoIndex && token.value === "FROM");
    if (fromIndex < 0) throw new SyntaxError("SELECT INTO requires a FROM clause.", tokens[0]);
    const targets = tokens.slice(intoIndex + 1, fromIndex).filter((token) => token.value !== ",").map((token) => token.value);
    return { type: "SelectIntoStatement", sql: tokensToSql([...tokens.slice(0, intoIndex), ...tokens.slice(fromIndex)]), targets };
  }

  parseExceptionBlock() {
    const handlers = [];
    while (this.match("WHEN")) {
      const names = [this.expectIdentifier()];
      while (this.match("OR")) names.push(this.expectIdentifier());
      this.expect("THEN");
      handlers.push({ names, body: this.parseStatements(new Set(["WHEN", "END"])) });
    }
    return { handlers };
  }

  parseCallArguments() {
    if (!this.match("(")) return [];
    const args = [];
    if (!this.match(")")) {
      do args.push(this.parseExpression()); while (this.match(","));
      this.expect(")");
    }
    return args;
  }

  parseExpression(minPrecedence = 0) {
    let left = this.parsePrefix();
    while (true) {
      const operator = this.current().value;
      const precedence = BINARY_PRECEDENCE.get(operator);
      if (!precedence || precedence < minPrecedence) break;
      this.take();
      const right = this.parseExpression(precedence + 1);
      left = { type: "BinaryExpression", operator, left, right };
    }
    return left;
  }

  parsePrefix() {
    if (this.match("-")) return { type: "UnaryExpression", operator: "-", argument: this.parsePrefix() };
    if (this.match("NOT")) return { type: "UnaryExpression", operator: "NOT", argument: this.parsePrefix() };
    if (this.match(":")) {
      const scope = this.expectIdentifier(); this.expect("."); const property = this.expectIdentifier();
      return { type: "BindExpression", scope, property };
    }
    const token = this.take();
    if (token.type === "number" || token.type === "string") return { type: "Literal", value: token.value };
    if (token.value === "NULL") return { type: "Literal", value: null };
    if (token.value === "TRUE" || token.value === "FALSE") return { type: "Literal", value: token.value === "TRUE" };
    if (token.value === "(") {
      const expression = this.parseExpression(); this.expect(")"); return expression;
    }
    if (token.type !== "identifier") throw new SyntaxError("Expected expression.", token);
    let expression = { type: "Identifier", name: token.value };
    if (this.at(".")) {
      this.take(); expression = { type: "MemberExpression", object: expression, property: this.expectIdentifier() };
    } else if (this.at("%")) {
      this.take(); expression = { type: "CursorAttribute", cursor: token.value, attribute: this.expectIdentifier() };
    }
    if (this.at("(")) {
      const args = this.parseCallArguments();
      expression = { type: "CallExpression", name: token.value, args };
    }
    return expression;
  }

  collectUntilSemicolonTokens() {
    const collected = [];
    let depth = 0;
    while (!this.at("EOF")) {
      if (this.at("(") || this.at("[")) depth += 1;
      if (this.at(")") || this.at("]")) depth -= 1;
      if (this.at(";") && depth === 0) { this.take(); return collected; }
      collected.push(this.take());
    }
    throw new SyntaxError("Expected semicolon.", this.current());
  }

  collectUntilSemicolon() { return tokensToSql(this.collectUntilSemicolonTokens()); }

  collectBalancedUntil(end) {
    const collected = []; let depth = 0;
    while (!this.at("EOF")) {
      if (this.at("(") || this.at("[")) depth += 1;
      if (this.at(")") || this.at("]")) {
        if (depth === 0 && end === ")") break;
        depth -= 1;
      }
      collected.push(this.take());
    }
    return tokensToSql(collected);
  }
}

export function parse(source) {
  return new Parser(source).parse();
}
