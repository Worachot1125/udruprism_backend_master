export type SelectionState =
    | { mode: "none" }
    | { mode: "some"; picked: Set<string> }
    | { mode: "allFiltered"; excluded: Set<string> };

export const clearSelection = (): SelectionState => ({ mode: "none" });

export const selectAllFiltered = (): SelectionState => ({
    mode: "allFiltered",
    excluded: new Set(),
});

export const toggleOne = (
    id: string,
    checked: boolean,
    s: SelectionState,
): SelectionState => {
    if (s.mode === "none") {
        return checked ? { mode: "some", picked: new Set([id]) } : s;
    }
    if (s.mode === "some") {
        const picked = new Set(s.picked);
        if (checked) picked.add(id);
        else picked.delete(id);
        return picked.size ? { mode: "some", picked } : { mode: "none" };
    }
    // allFiltered
    const excluded = new Set(s.excluded);
    if (checked) excluded.delete(id);
    else excluded.add(id);
    return { mode: "allFiltered", excluded };
};

export const isSelected = (id: string, s: SelectionState): boolean => {
    if (s.mode === "none") return false;
    if (s.mode === "some") return s.picked.has(id);
    return !s.excluded.has(id);
};
