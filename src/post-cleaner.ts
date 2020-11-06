const getDeclaredVariables = (code: string): string[] => {
  return code.match(/(?<=--)(.*?)(?=:)/g) ?? [];
};

const isVariableUsed = (variable: string, code: string): boolean => {
  return code.includes(`var(--${variable})`);
};

const cleanHangingVariables = (code: string): string => {
  let _code = code;
  const originalCount = getDeclaredVariables(_code).length;
  let purgedCount = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const variables = getDeclaredVariables(_code);
    const unusedVariables = variables.filter(v => !isVariableUsed(v, _code));

    if (unusedVariables.length === 0) break;

    for (const variable of unusedVariables) {
      const DECLARATION = new RegExp(`.*--${variable}:.*`, "g");
      _code = _code.replace(DECLARATION, "");

      if (_code.includes(`--${variable}:`)) throw new Error("hey");
    }
    purgedCount += unusedVariables.length;
  }

  console.log(`purged ${purgedCount} variables out of ${originalCount}`);
  return _code;
};

export default cleanHangingVariables;
