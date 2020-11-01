const getDeclaredVariables = (code: string): string[] => {
    return code.match(/(?<=--)(.*?)(?=:)/g) ?? []
}

const isVariableUsed = (variable: string, code: string): boolean => {
    return code.includes(`var(--${variable})`);
}

const removeLevel = (code: string): string => {
    const declaredVariables = getDeclaredVariables(code)
    let _code = code;

    for (const variable of declaredVariables) {
        if (!isVariableUsed(variable, _code)) {
            const LINES_WHERE_IS_USED = new RegExp(`.*--${variable}.*;`, "g")
            _code = _code.replace(LINES_WHERE_IS_USED, "")
        }
    }
    return  _code;
}

const cleanHangingVariables = (code: string): string => {
    const MAX_NESTING = 10;
    
    let _code = code;
    for (let i = 0; i < MAX_NESTING; ++i) {
        _code = removeLevel(_code)
    }
    return _code;
}

export default cleanHangingVariables;