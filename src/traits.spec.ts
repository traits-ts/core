/*
**  @rse/traits - Traits for TypeScript Classes
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import * as chai from "chai"
import sinon     from "sinon"
import sinonChai from "sinon-chai"

import { trait, derive, derived } from "./traits"

const expect = chai.expect
chai.config.includeStack = true
chai.use(sinonChai)

describe("@rse/traits", () => {
    it("exposed API", () => {
        expect(trait).to.be.a("function")
        expect(derive).to.be.a("function")
        expect(derived).to.be.a("function")
    })

    it("basic usage", () => {
        const Swim = trait((base) => class Swim extends base {
            static swimmers = 1
            swimming = 0
            swim () { return this.swimming++ }
        })
        const Walk = trait((base) => class Walk extends base {
            static walkers = 2
            static fastWalk () { return "fastWalk" }
            walking = 0
            walk () { return this.walking++ }
        })
        class Sample extends derive(Swim, Walk) {
            static samplers = 3
            sampling = 0
            perform () {
                expect(this.sampling).to.be.equal(0)
                expect(this.swimming).to.be.equal(0)
                expect(this.walking).to.be.equal(0)
                expect(this.swim()).to.be.equal(0)
                expect(this.walk()).to.be.equal(0)
                expect(this.swim()).to.be.equal(1)
                expect(this.walk()).to.be.equal(1)
                expect(this.swim()).to.be.equal(2)
                expect(this.walk()).to.be.equal(2)
            }
        }
        const sample = new Sample()
        expect(Sample.swimmers).to.be.equal(1)
        expect(Sample.walkers).to.be.equal(2)
        expect(Sample.samplers).to.be.equal(3)
        expect(Sample.fastWalk()).to.be.equal("fastWalk")
        sample.perform()
    })

    it("complex usage", () => {
        const spy = sinon.spy()
        const Foo = trait((base) => class Foo extends base {
            constructor () { super(); spy("Foo") }
        })
        const Bar = <T extends any>() => trait((base) => class Bar extends base {
            constructor () { super(); spy("Bar") }
        })
        const Baz = trait([ Bar<string>, Foo ], (base) => class Baz extends base {
            constructor () { super(); spy("Baz") }
        })
        class App extends derive(Baz) {
            constructor () { super(); spy("App") }
        }
        const app = new App()
        expect(derived(app, Foo)).to.be.equal(true)
        expect(spy.getCalls().map((x) => x.args[0]))
            .to.be.deep.equal([ "Foo", "Bar", "Baz", "App" ])
    })

    it("double derivation", () => {
        const spy = sinon.spy()
        const Foo = trait((base) => class extends base {
            constructor () { super(); spy("Foo") }
        })
        const Bar = trait([ Foo ], (base) => class extends base {
            constructor () { super(); spy("Bar") }
        })
        const Baz = trait([ Bar, Foo ], (base) => class Baz extends base {
            constructor () { super(); spy("Baz") }
        })
        class App extends derive(Baz, Foo, Foo) {
            constructor () { super(); spy("App") }
        }
        const app = new App()
        expect(spy.getCalls().map((x) => x.args[0]))
            .to.be.deep.equal([ "Foo", "Bar", "Baz", "App" ])
    })

    it("super usage", () => {
        const Foo = trait((base) => class Foo extends base {
            quux (arg: string) {
                return `foo.quux(${arg})`
            }
        })
        const Bar = trait((base) => class Bar extends base {
            quux (arg: string) {
                return `bar.quux(${super.quux(arg)})`
            }
        })
        class App extends derive(Bar, Foo) {
            quux (arg: string) {
                return `app.quux(${super.quux(arg)})`
            }
        }
        const app = new App()
        expect(app.quux("start")).to.be.equal("app.quux(bar.quux(foo.quux(start)))")
    })

    it("sample regular", () => {
        interface IntQueue {
            get (): number | undefined
            put (x: number): void
        }
        const BasicIntQueue = trait((base) => class extends base implements IntQueue {
            private buf: Array<number> = []
            get () { return this.buf.pop() }
            put (x: number) { this.buf.unshift(x) }
        })
        const Doubling = trait((base) => class extends base implements IntQueue {
            get () { return super.get() }
            put (x: number) { super.put(2 * x) }
        })
        const Incrementing = trait((base) => class extends base implements IntQueue {
            get () { return super.get() }
            put (x: number) { super.put(x + 1) }
        })
        const Filtering = trait((base) => class extends base implements IntQueue {
            get () { return super.get() }
            put (x: number) { if (x >= 0) super.put(x) }
        })
        const Queue = class Queue extends derive(
            Filtering, Doubling, Incrementing, BasicIntQueue) {}
        const queue = new Queue()
        expect(queue.get()).to.be.equal(undefined)
        queue.put(-1)
        expect(queue.get()).to.be.equal(undefined)
        queue.put(1)
        expect(queue.get()).to.be.equal(3)
        queue.put(10)
        expect(queue.get()).to.be.equal(21)
    })

    it("sample generic", () => {
        interface Queue<T extends any> {
            get (): T | undefined
            put (x: T): void
        }
        const BasicQueue = <T extends number>() => trait((base) => class extends base implements Queue<T> {
            private buf: Array<T> = []
            get () { return this.buf.pop() }
            put (x: T) { this.buf.unshift(x) }
        })
        const Doubling = <T extends number>() => trait((base) => class extends base implements Queue<T> {
            get () { return super.get() }
            put (x: T) { super.put(2 * x) }
        })
        const Incrementing = <T extends number>() => trait((base) => class extends base implements Queue<T> {
            get () { return super.get() }
            put (x: T) { super.put(x + 1) }
        })
        const Filtering = <T extends number>() => trait((base) => class extends base implements Queue<T> {
            get () { return super.get() }
            put (x: T) { if (x >= 0) super.put(x) }
        })
        const MyQueue = class MyQueue extends derive(
            Filtering<number>,
            Doubling<number>,
            Incrementing<number>,
            BasicQueue<number>
        ) {}
        const queue = new MyQueue()
        expect(queue.get()).to.be.equal(undefined)
        queue.put(-1)
        expect(queue.get()).to.be.equal(undefined)
        queue.put(1)
        expect(queue.get()).to.be.equal(3)
        queue.put(10)
        expect(queue.get()).to.be.equal(21)
    })
})

