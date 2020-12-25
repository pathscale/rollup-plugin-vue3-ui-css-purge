import { getDeclaredVariables, isVariableUsed } from "./utils";

export default (code: string): string => {
  let _code = code;
  const originalCount = getDeclaredVariables(_code).length;
  let purgedCount = 0;

  for (;;) {
    const vars = getDeclaredVariables(_code);
    const unused = vars.filter(v => !isVariableUsed(v, _code));
    if (unused.length === 0) break;

    for (const v of unused) {
      const decl = new RegExp(`.*--${v}:.*`, "g");
      _code = _code.replace(decl, "");
      if (_code.includes(`--${v}:`)) throw new Error("hey");
    }

    purgedCount += unused.length;
  }

  console.log(`POST-CLEANER - VARIABLES (${purgedCount} out of ${originalCount})`);
  return _code;
};
