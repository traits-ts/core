/*
**  @rse/traits - Traits for TypeScript Classes
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

import * as chai from "chai"
import sinon     from "sinon"
import sinonChai from "sinon-chai"

import { Trait, Derive, hasTrait } from "./traits"

const expect = chai.expect
chai.config.includeStack = true
chai.use(sinonChai)

describe("Trait Facility", () => {
    it("exposed API", () => {
        expect(Trait).to.be.a("function")
        expect(Derive).to.be.a("function")
        expect(hasTrait).to.be.a("function")
    })

    it("basic usage", () => {
        const Swim = Trait((base) => class Swim extends base {
            static swimmers = 1
            swimming = 0
            swim () { return this.swimming++ }
        })
        const Walk = Trait((base) => class Walk extends base {
            static walkers = 2
            walking = 0
            walk () { return this.walking++ }
        })
        class Sample extends Derive(Swim, Walk) {
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
        expect(Sample.samplers).to.be.equal(3)
        sample.perform()
    })

    it("complex usage", () => {
        const spy = sinon.spy()
        const Foo = Trait((base) => class Foo extends base {
            constructor () { super(); spy("Foo") }
        })
        const Bar = <T extends any>() => Trait((base) => class Bar extends base {
            constructor () { super(); spy("Bar") }
        })
        const Baz = Trait([ Bar<string>, Foo ], (base) => class Baz extends base {
            constructor () { super(); spy("Baz") }
        })
        class App extends Derive(Baz) {
            constructor () { super(); spy("App") }
        }
        const app = new App()
        expect(hasTrait(app, Foo)).to.be.equal(true)
        expect(spy.getCalls().map((x) => x.args[0]))
            .to.be.deep.equal([ "Foo", "Bar", "Baz", "App" ])
    })

    it("double derivation", () => {
        const spy = sinon.spy()
        const Foo = Trait((base) => class extends base {
            constructor () { super(); spy("Foo") }
        })
        const Bar = Trait([ Foo ], (base) => class extends base {
            constructor () { super(); spy("Bar") }
        })
        const Baz = Trait([ Bar, Foo ], (base) => class Baz extends base {
            constructor () { super(); spy("Baz") }
        })
        class App extends Derive(Baz, Foo, Foo) {
            constructor () { super(); spy("App") }
        }
        const app = new App()
        expect(spy.getCalls().map((x) => x.args[0]))
            .to.be.deep.equal([ "Foo", "Bar", "Baz", "App" ])
    })
})

