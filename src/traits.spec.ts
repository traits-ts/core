/*
**  @traits-ts/core - Traits for TypeScript Classes
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

describe("@traits-ts/traits", () => {
    it("exposed API", () => {
        expect(trait).to.be.a("function")
        expect(derive).to.be.a("function")
        expect(derived).to.be.a("function")
    })

    it("basic derivation", () => {
        const Trait1 = trait((base) => class extends base {
            trait1 () {}
        })
        const Trait2 = <T>() => trait((base) => class extends base {
            trait2 () {}
        })
        class Clazz {
            clazz () {}
        }
        class Clazz2 {
            clazz2 () {}
        }
        const Sample = class Sample extends
            derive(Trait1, Clazz) {}
        const sample = new Sample()
        expect(sample.trait1).to.be.a("function")
        expect(sample.clazz).to.be.a("function")
        expect(derived(sample, Trait1)).to.be.equal(true)
        expect(derived(sample, Trait2)).to.be.equal(false)
        expect(derived(sample, Clazz)).to.be.equal(true)
        expect(derived(sample, Clazz2)).to.be.equal(false)
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

    it("constructor super usage", () => {
        const spy = sinon.spy()
        interface Sample {
            foo1: string
            foo2: number
        }
        const Foo = <T extends Sample>() => trait((base) => class Foo extends base {
            constructor (params: { [ key: string ]: unknown; foo?: T } | undefined) {
                super(params)
                spy("Foo", params?.foo?.foo1 === "foo" && params?.foo?.foo2 === 7)
            }
        })
        const Bar = trait([ Foo<Sample> ], (base) => class Bar extends base {
            constructor (params: { [key: string ]: unknown; bar?: number } | undefined) {
                super(params)
                spy("Bar", params?.bar === 42)
            }
        })
        class App extends derive(Bar) {
            constructor () {
                super({ foo: { foo1: "foo", foo2: 7 }, bar: 42 })
                spy("App")
            }
        }
        const app = new App()
        expect(spy.getCalls().map((x) => x.args.join(":")))
            .to.be.deep.equal([ "Foo:true", "Bar:true", "App" ])
    })

    it("sample traits: regular, orthogonal", () => {
        const Duck = trait((base) => class extends base {
            squeak () { return "squeak" }
        })
        const Parrot = trait((base) => class extends base {
            talk () { return "talk" }
        })
        const Animal = class Animal extends derive(Duck, Parrot) {
            walk () { return "walk" }
        }
        const animal = new Animal()
        expect(animal.squeak()).to.be.equal("squeak")
        expect(animal.talk()).to.be.equal("talk")
        expect(animal.walk()).to.be.equal("walk")
    })

    it("sample traits: regular, bounded", () => {
        const Queue = trait((base) => class extends base {
            private buf: Array<number> = []
            get () { return this.buf.pop() }
            put (x: number) { this.buf.unshift(x) }
        })
        const Doubling = trait([ Queue ], (base) => class extends base {
            put (x: number) { super.put(2 * x) }
        })
        const Incrementing = trait([ Queue ], (base) => class extends base {
            put (x: number) { super.put(x + 1) }
        })
        const Filtering = trait([ Queue ], (base) => class extends base {
            put (x: number) { if (x >= 0) super.put(x) }
        })

        const MyQueue = class MyQueue extends
            derive(Filtering, Doubling, Incrementing, Queue) {}
        const queue = new MyQueue()
        expect(queue.get()).to.be.equal(undefined)
        queue.put(-1)
        expect(queue.get()).to.be.equal(undefined)
        queue.put(1)
        expect(queue.get()).to.be.equal(3)
        queue.put(10)
        expect(queue.get()).to.be.equal(21)
    })

    it("sample traits: generic, bounded", () => {
        const Queue = <T>() => trait((base) => class extends base {
            private buf: Array<T> = []
            get () { return this.buf.pop() }
            put (x: T) { this.buf.unshift(x) }
        })
        const Tracing = <T>() => trait([ Queue<T> ], (base) => class extends base {
            public onTrace = (ev: string, x?: T) => {}
            get () { const x = super.get(); this.onTrace("get", x); return x }
            put (x: T) { this.onTrace("put", x); super.put(x) }
        })

        const MyTracingQueue = class MyTracingQueue extends
            derive(Tracing<string>, Queue<string>) {}
        const spy = sinon.spy()
        const queue = new MyTracingQueue()
        queue.onTrace = (ev: string, x?: string) => { spy(ev, x) }
        queue.put("foo")
        queue.get()
        queue.put("bar")
        queue.put("qux")
        queue.get()
        queue.get()
        expect(spy.getCalls().map((x) => x.args.join(":"))).to.be.deep.equal([
            "put:foo", "get:foo", "put:bar", "put:qux", "get:bar", "get:qux"
        ])
    })
})

