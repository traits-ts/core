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
})

