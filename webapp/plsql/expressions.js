import { ZeroDivideError } from "./errors.js";

const truthy = (value) => Boolean(value);

export async function evaluate(node, environment, context = {}) {
  if (node.type === "Literal") return node.value;
  if (node.type === "Identifier") return environment.get(node.name);
  if (node.type === "MemberExpression") {
    const object = await evaluate(node.object, environment, context);
    return object?.[node.property] ?? object?.[node.property.toUpperCase()];
  }
  if (node.type === "BindExpression") {
    const object = environment.get(node.scope);
    return object?.[node.property] ?? object?.[node.property.toUpperCase()];
  }
  if (node.type === "CursorAttribute") {
    const cursor = context.cursors?.get(node.cursor);
    return cursor?.attribute(node.attribute);
  }
  if (node.type === "UnaryExpression") {
    const value = await evaluate(node.argument, environment, context);
    return node.operator === "NOT" ? !truthy(value) : -Number(value);
  }
  if (node.type === "BinaryExpression") {
    const left = await evaluate(node.left, environment, context);
    if (node.operator === "AND" && !truthy(left)) return false;
    if (node.operator === "OR" && truthy(left)) return true;
    const right = await evaluate(node.right, environment, context);
    switch (node.operator) {
      case "AND": return truthy(left) && truthy(right);
      case "OR": return truthy(left) || truthy(right);
      case "=": return left === right;
      case "<>":
      case "!=": return left !== right;
      case "<": return left < right;
      case "<=": return left <= right;
      case ">": return left > right;
      case ">=": return left >= right;
      case "||": return `${left ?? ""}${right ?? ""}`;
      case "+": return Number(left) + Number(right);
      case "-": return Number(left) - Number(right);
      case "*": return Number(left) * Number(right);
      case "/":
        if (Number(right) === 0) throw new ZeroDivideError();
        return Number(left) / Number(right);
      default: throw new Error(`Unsupported operator ${node.operator}`);
    }
  }
  if (node.type === "CallExpression") {
    const args = [];
    for (const arg of node.args) args.push(await evaluate(arg, environment, context));
    if (context.callFunction) return context.callFunction(node.name, args, environment);
    throw new Error(`Function ${node.name} is not available.`);
  }
  throw new Error(`Unsupported expression ${node.type}.`);
}
