import { tokenize } from "./tokenizer.js";

export function detectStatementType(sql) {
  const tokens = tokenize(sql);
  const first = tokens[0]?.value?.toUpperCase();
  if (first === "DECLARE" || first === "BEGIN") return "PLSQL_BLOCK";
  if (first !== "CREATE") return "SQL";

  const values = tokens.slice(0, 8).map((token) => token.value.toUpperCase());
  const replaceIndex = values.indexOf("REPLACE");
  const kind = values[replaceIndex + 1];
  if (values.includes("OR") && kind === "PROCEDURE") return "PROCEDURE";
  if (values.includes("OR") && kind === "FUNCTION") return "FUNCTION";
  if (values.includes("OR") && kind === "TRIGGER") return "TRIGGER";
  return "SQL";
}
