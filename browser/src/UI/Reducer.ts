import * as State from "./State"

import * as Actions from "./Actions"

import * as _ from "lodash"

export const reducer = (s: State.IState, a: Actions.Action) => {

    if (!s) {
        return s
    }

    switch (a.type) {
        case "SET_CURSOR_POSITION":
            return Object.assign({}, s, {
                cursorPixelX: a.payload.pixelX,
                cursorPixelY: a.payload.pixelY,
                fontPixelWidth: a.payload.fontPixelWidth,
                fontPixelHeight: a.payload.fontPixelHeight,
                cursorCharacter: a.payload.cursorCharacter,
                cursorPixelWidth: a.payload.cursorPixelWidth,
            })
        case "SET_ACTIVE_WINDOW_DIMENSIONS":
            return { ...s, ...{ activeWindowDimensions: a.payload.dimensions } }
        case "SET_MODE":
            return { ...s, ...{ mode: a.payload.mode } }
        case "SET_COLORS":
            return { ...s, ...{ foregroundColor: a.payload.foregroundColor } }
        case "SHOW_QUICK_INFO":
            return Object.assign({}, s, {
                quickInfo: {
                    title: a.payload.title,
                    description: a.payload.description,
                },
            })
        case "HIDE_QUICK_INFO":
            return Object.assign({}, s, {
                quickInfo: null,
            })
        case "SHOW_AUTO_COMPLETION":
            return Object.assign({}, s, {
                autoCompletion: {
                    base: a.payload.base,
                    entries: a.payload.entries,
                    selectedIndex: 0,
                },
            })
        case "HIDE_AUTO_COMPLETION":
            return Object.assign({}, s, {
                autoCompletion: null,
            })
        case "SHOW_SIGNATURE_HELP":
            return Object.assign({}, s, {
                signatureHelp: a.payload,
            })
        case "HIDE_SIGNATURE_HELP":
            return Object.assign({}, s, {
                signatureHelp: null,
            })
         case "HIDE_CURSOR_LINE":
             return Object.assign({}, s, {
                 cursorLineVisible: false,
            })
         case "HIDE_CURSOR_COLUMN":
             return Object.assign({}, s, {
                 cursorColumnVisible: false,
            })
         case "SHOW_CURSOR_LINE":
             return Object.assign({}, s, {
                 cursorLineVisible: true,
            })
         case "SHOW_CURSOR_COLUMN":
             return Object.assign({}, s, {
                 cursorColumnVisible: true,
            })
        case "SET_CURSOR_LINE_OPACITY":
            return Object.assign({}, s, {
                cursorLineOpacity: a.payload.opacity,
            })
        case "SET_CURSOR_COLUMN_OPACITY":
            return Object.assign({}, s, {
                cursorLineOpacity: a.payload.opacity,
            })
        default:
            return Object.assign({}, s, {
                autoCompletion: autoCompletionReducer(s.autoCompletion, a), // FIXME: null
                popupMenu: popupMenuReducer(s.popupMenu, a), // FIXME: null
            })
    }
}

export const popupMenuReducer = (s: State.IMenu | null, a: Actions.Action) => {

    // TODO: sync max display items (10) with value in Menu.render() (Menu.tsx)
    let size = s ? Math.min(10, s.filteredOptions.length) : 0

    switch (a.type) {
        case "SHOW_MENU":
            const sortedOptions = _.sortBy(a.payload.options, (f) => f.pinned ? 0 : 1).map((o) => ({
                icon: o.icon,
                detail: o.detail,
                label: o.label,
                pinned: o.pinned,
                detailHighlights: [],
                labelHighlights: [],
            }))

            return {
                id: a.payload.id,
                filter: "",
                filteredOptions: sortedOptions,
                options: a.payload.options,
                selectedIndex: 0,
            }
        case "HIDE_MENU":
            return null
        case "NEXT_MENU":
            if (!s) {
                return s
            }

            return Object.assign({}, s, {
                selectedIndex: (s.selectedIndex + 1) % size,
            })
        case "PREVIOUS_MENU":
            if (!s) {
                return s
            }

            return Object.assign({}, s, {
                selectedIndex: s.selectedIndex > 0 ? s.selectedIndex - 1 : size - 1,
            })
        case "FILTER_MENU":
            if (!s) {
                return s
            }

            // If we already had search results, and this search is a superset of the previous,
            // just filter the already-pruned subset
            const optionsToSearch = a.payload.filter.indexOf(s.filter) === 0 ? s.filteredOptions : s.options
            const filteredOptionsSorted = filterMenuOptions(optionsToSearch, a.payload.filter)

            return Object.assign({}, s, {
                filter: a.payload.filter,
                filteredOptions: filteredOptionsSorted,
            })
        default:
            return s
    }
}

export function filterMenuOptions(options: Oni.Menu.MenuOption[], searchString: string): State.IMenuOptionWithHighlights[] {

    if (!searchString) {
        const opt = options.map((o) => {
            return {
                label: o.label,
                detail: o.detail,
                icon: o.icon,
                pinned: o.pinned,
                detailHighlights: [],
                labelHighlights: [],
            }
        })

        return _.sortBy(opt, (o) => o.pinned ? 0 : 1)
    }

    const searchArray = searchString.split("")

    let initialFilter = options
    searchArray.forEach((str) => {
        initialFilter = initialFilter.filter((f) => f.detail.indexOf(str) >= 0 || f.label.indexOf(str) >= 0)
    })

    const highlightOptions = initialFilter.map((f) => {
        const detailArray = f.detail.split("")
        const labelArray = f.label.split("")
        const detailMatches = fuzzyMatchCharacters(detailArray, searchArray)
        const labelMatches = fuzzyMatchCharacters(labelArray, detailMatches.remainingCharacters)

        return {
            icon: f.icon,
            pinned: f.pinned,
            label: f.label,
            detail: f.detail,
            detailArray,
            labelArray,
            detailMatches,
            labelMatches,
            detailHighlights: detailMatches.highlightIndices,
            labelHighlights: labelMatches.highlightIndices,
        }
    })

    const filteredOptions = highlightOptions.filter((f) => f.labelMatches.remainingCharacters.length === 0)

    const filteredOptionsSorted = _.sortBy(filteredOptions, (f) => {
        const baseVal = f.pinned ? 0 : 2

        const totalSearchSize = searchArray.length
        const matchingInLabel = fuzzyMatchCharacters(f.labelArray, searchArray)

        const labelMatchPercent = matchingInLabel.highlightIndices.length / totalSearchSize

        return baseVal - labelMatchPercent
    })

    return filteredOptionsSorted
}

export interface IFuzzyMatchResults {
    highlightIndices: number[]
    remainingCharacters: string[]
}

export function fuzzyMatchCharacters(text: string[], searchString: string[]): IFuzzyMatchResults {
    const startValue = {
        highlightIndices: <number[]>[],
        remainingCharacters: searchString,
    }

    const outputValue = text.reduce((previousValue: IFuzzyMatchResults, currValue: string, idx: number) => {

        const { highlightIndices, remainingCharacters } = previousValue

        if (remainingCharacters.length === 0) {
            return previousValue
        }

        if (remainingCharacters[0] === currValue) {
            return {
                highlightIndices: highlightIndices.concat([idx]),
                remainingCharacters: remainingCharacters.slice(1, remainingCharacters.length),
            }
        }

        return previousValue

    }, startValue)

    return outputValue
}

export const autoCompletionReducer = (s: State.IAutoCompletionInfo | null, a: Actions.Action) => {
    if (!s) {
        return s
    }

    // TODO: sync max display items (10) with value in AutoCompletion.render() (AutoCompletion.tsx)
    const currentEntryCount = Math.min(10, s.entries.length)

    switch (a.type) {
        case "NEXT_AUTO_COMPLETION":
            return Object.assign({}, s, {
                selectedIndex: (s.selectedIndex + 1) % currentEntryCount,
            })
        case "PREVIOUS_AUTO_COMPLETION":
            return Object.assign({}, s, {
                selectedIndex: s.selectedIndex > 0 ? s.selectedIndex - 1 : currentEntryCount - 1,
            })
        default:
            return Object.assign({}, s, {
                entries: autoCompletionEntryReducer(s.entries, a),
            })
    }
}

export const autoCompletionEntryReducer = (s: Oni.Plugin.CompletionInfo[], action: Actions.Action) => {
    switch (action.type) {
        case "SET_AUTO_COMPLETION_DETAILS":
            return s.map((entry) => {
                if (action.payload.detailedEntry && entry.label === action.payload.detailedEntry.label) {
                    return action.payload.detailedEntry
                }
                return entry
            })
        default:
            return s
    }
}
