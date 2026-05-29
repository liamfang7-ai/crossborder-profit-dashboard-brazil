export type FormulaVariables = {
  sales_brl: number;
  quantity: number;
  order_count: number;
  unit_price_brl: number;
  exchange_rate: number;
  sales_mxn?: number;
  unit_price_mxn?: number;
};

export type FormulaResult = {
  value: number;
  error: string | null;
};

const allowedVariables = new Set([
  "sales_brl",
  "quantity",
  "order_count",
  "unit_price_brl",
  "exchange_rate",
  "sales_mxn",
  "unit_price_mxn",
]);

function tokenize(formula: string) {
  const tokens: string[] = [];
  let index = 0;

  while (index < formula.length) {
    const char = formula[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[+\-*/()]/.test(char)) {
      tokens.push(char);
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let value = char;
      index += 1;

      while (index < formula.length && /[0-9.]/.test(formula[index])) {
        value += formula[index];
        index += 1;
      }

      if (!Number.isFinite(Number(value))) {
        throw new Error(`数字无效：${value}`);
      }

      tokens.push(value);
      continue;
    }

    if (/[a-z_]/i.test(char)) {
      let value = char;
      index += 1;

      while (index < formula.length && /[a-z0-9_]/i.test(formula[index])) {
        value += formula[index];
        index += 1;
      }

      if (!allowedVariables.has(value)) {
        throw new Error(`不允许的变量：${value}`);
      }

      tokens.push(value);
      continue;
    }

    throw new Error(`不允许的字符：${char}`);
  }

  return tokens;
}

function precedence(operator: string) {
  return operator === "+" || operator === "-" ? 1 : 2;
}

function toRpn(tokens: string[]) {
  const output: string[] = [];
  const operators: string[] = [];
  let previous: string | null = null;

  tokens.forEach((token) => {
    if (allowedVariables.has(token) || Number.isFinite(Number(token))) {
      output.push(token);
      previous = "value";
      return;
    }

    if (token === "(") {
      operators.push(token);
      previous = token;
      return;
    }

    if (token === ")") {
      while (operators.length > 0 && operators[operators.length - 1] !== "(") {
        output.push(operators.pop() as string);
      }

      if (operators.pop() !== "(") {
        throw new Error("括号不匹配");
      }

      previous = "value";
      return;
    }

    const normalizedToken =
      token === "-" && (!previous || previous === "(" || "+-*/".includes(previous))
        ? "u-"
        : token;

    if (normalizedToken === "u-") {
      operators.push(normalizedToken);
      previous = token;
      return;
    }

    while (
      operators.length > 0 &&
      operators[operators.length - 1] !== "(" &&
      operators[operators.length - 1] !== "u-" &&
      precedence(operators[operators.length - 1]) >= precedence(normalizedToken)
    ) {
      output.push(operators.pop() as string);
    }

    operators.push(normalizedToken);
    previous = token;
  });

  while (operators.length > 0) {
    const operator = operators.pop() as string;

    if (operator === "(") {
      throw new Error("括号不匹配");
    }

    output.push(operator);
  }

  return output;
}

export function safeFormula(
  formula: string | null | undefined,
  variables: FormulaVariables,
): FormulaResult {
  const trimmed = formula?.trim();

  if (!trimmed) {
    return { value: 0, error: null };
  }

  try {
    const stack: number[] = [];

    toRpn(tokenize(trimmed)).forEach((token) => {
      if (allowedVariables.has(token)) {
        const value =
          token === "sales_mxn"
            ? variables.sales_mxn ?? variables.sales_brl
            : token === "unit_price_mxn"
              ? variables.unit_price_mxn ?? variables.unit_price_brl
              : variables[token as keyof FormulaVariables];

        stack.push(value ?? 0);
        return;
      }

      if (Number.isFinite(Number(token))) {
        stack.push(Number(token));
        return;
      }

      if (token === "u-") {
        const value = stack.pop();

        if (value === undefined) {
          throw new Error("公式缺少操作数");
        }

        stack.push(-value);
        return;
      }

      const right = stack.pop();
      const left = stack.pop();

      if (left === undefined || right === undefined) {
        throw new Error("公式缺少操作数");
      }

      if (token === "+") stack.push(left + right);
      if (token === "-") stack.push(left - right);
      if (token === "*") stack.push(left * right);
      if (token === "/") stack.push(right === 0 ? 0 : left / right);
    });

    if (stack.length !== 1 || !Number.isFinite(stack[0])) {
      throw new Error("公式结果无效");
    }

    return { value: stack[0], error: null };
  } catch (error) {
    return {
      value: 0,
      error: error instanceof Error ? error.message : "公式错误",
    };
  }
}
