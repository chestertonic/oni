import * as assert from "assert"

import * as DOMRenderer from "./../../src/Renderer/Span"

describe("Span", () => {

    describe("flattenSpansToArray", () => {
        it("simple test", () => {

            const output = DOMRenderer.flattenSpansToArray([{startX: 1, endX: 2}, {startX: 3, endX: 5}])
            assert.deepEqual(output, [null, true, false, true, true])
        })
    })

    describe("expandArrayToSpans", () => {
        it("simple test", () => {

            const input = [{startX: 1, endX: 2}, {startX: 3, endX: 5}]
            const array = DOMRenderer.flattenSpansToArray(input)
            const expanded = DOMRenderer.expandArrayToSpans(array)

            assert.deepEqual(expanded, input)
        })
    })

    describe("collapeSpans", () => {
        it("does not collapse spans that are not adjacent", () => {
            const spans = [{startX: 1, endX: 4}, {startX: 5, endX: 6}]
            const outSpans = DOMRenderer.collapseSpans(spans)

            assert.deepEqual(outSpans, spans)
        })

        it("does collapse spans that overlap", () => {
            const spans = [{startX: 1, endX: 4}, {startX: 3, endX: 5}]
            const outSpans = DOMRenderer.collapseSpans(spans)

            assert.deepEqual(outSpans, [{startX: 1, endX: 5}])
        })
    })
})
