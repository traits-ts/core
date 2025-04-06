
<img src="https://raw.githubusercontent.com/traits-ts/core/refs/heads/master/etc/logo.svg" width="200" style="float: right" align="right" alt=""/>

@traits-ts/core
===============

**Traits for TypeScript Classes (Core)**

<p/>
<a href="https://traits-ts.org">Project Home</a> |
<a href="https://github.com/traits-ts/core">Github Repository</a> |
<a href="https://npmjs.com/@traits-ts/core">NPM Distribution</a>

<p/>
<img src="https://nodei.co/npm/@traits-ts/core.png?downloads=true&stars=true" alt=""/>

[![github (author stars)](https://img.shields.io/github/stars/rse?logo=github&label=author%20stars&color=%233377aa)](https://github.com/rse)
[![github (author followers)](https://img.shields.io/github/followers/rse?label=author%20followers&logo=github&color=%234477aa)](https://github.com/rse)
<br/>
[![npm (project release)](https://img.shields.io/npm/v/@traits-ts/core?logo=npm&label=npm%20release&color=%23cc3333)](https://npmjs.com/@traits-ts/core)
[![npm (project downloads)](https://img.shields.io/npm/dm/@traits-ts/core?logo=npm&label=npm%20downloads&color=%23cc3333)](https://npmjs.com/@traits-ts/core)

About
-----

This is a TypeScript library providing a *trait* (aka *mixin*)
facility for extending classes with *multiple* base functionalities,
although TypeScript/JavaScript technically do not allow multiple
inheritance.

For this, it internally leverages the regular `class extends` mechanism
and "linearizes" the trait hierarchy at the JavaScript level, so it
is does not have to manipulate the run-time objects at all. At the
TypeScript level, it is fully type-safe and recursively derives all
properties of the traits a class is derived from.

This library consists of just three API functions: `trait` for defining
a trait (or sub-trait), the API function `derive` for deriving a base
class from one or more defined traits, and the API type-guard function
`derived` to ensure an object has the functionality of a trait under
run-time.

See also [@traits-ts/stdlib](https://github.com/traits-ts/stdlib) for
a companion library of standard, reusable, generic, typed traits (aka mixins),
based on this base library. Currently, this standard library consists
of the reusable traits *Identifiable*, *Configurable*, *Bindable*,
*Subscribable*, *Hookable*, *Finalizable*, *Traceable*, and
*Serializable*.

Installation
------------

```sh
$ npm install --save @traits-ts/core
```

API
---

The Application Programming Interface (API) of **@traits-ts/core** consists
of just three API functions and can be used in the following way:

```ts
//  Import API functions.
import { trait, derive, derived } from "@traits-ts/core"
//       =====  ======  =======

//  Define regular trait Foo.
const Foo = trait((base) => class Foo extends base { ... })
//          =====================     ============

//  Define regular sub-trait Foo, inheriting from super-traits Bar and Qux.
const Foo = trait([ Bar, Qux ], (base) => class Foo extends base { ... })
//                ============

//  Define generic trait Foo.
const Foo = <T>() => trait((base) => class Foo extends base { ... <T> ... })
//          =====                                                 ===

//  Define generic sub-trait Foo, inheriting from super-traits Bar and Qux.
const Foo = <T>() => trait([ Bar, Qux<T> ], (base) => class Foo extends base { ... <T> ... })
//          =====          ===============                                         ===

//  Define application class with features derived from traits Foo, Bar and Qux.
class Sample extends derive(Foo, Bar<Baz>, Qux) { ... }
//                   ==========================

//  Define application class with features derived from traits and a trailing regular class
class Sample extends derive(Foo, Bar<Baz>, Qux, EventEmitter) { ... }
//                                              ============

//  Call super constructor from application class constructor.
class Sample extends derive(...) { constructor () { super(); ... } ... }
//                                                  =======

//  Call super method from application class method.
class Sample extends derive(...) { foo () { ...; super.foo(...); ... } ... }
//                                               ==============

//  Check whether application class is derived from a trait.
const sample = new Sample(); if (derived(sample, Foo)) ...
//                               ====================
```

Examples
-------

### Regular, Orthogonal/Independent Traits

```ts
import { trait, derive } from "@traits-ts/core"

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

animal.squeak() // -> "squeak"
animal.talk()   // -> "talk"
animal.walk()   // -> "walk"
```

### Regular, Bounded/Dependent Traits

```ts
import { trait, derive } from "@traits-ts/core"

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

queue.get()    // -> undefined
queue.put(-1)
queue.get()    // -> undefined
queue.put(1)
queue.get()    // -> 3
queue.put(10)
queue.get()    // -> 21
```

### Generic, Bounded/Dependent Traits

```ts
import { trait, derive } from "@traits-ts/core"

const Queue = <T>() => trait((base) => class extends base {
    private buf: Array<T> = []
    get ()     { return this.buf.pop() }
    put (x: T) { this.buf.unshift(x) }
})
const Tracing = <T>() => trait([ Queue<T> ], (base) => class extends base {
    private trace (ev: string, x?: T) { console.log(ev, x) }
    get ()     { const x = super.get(); this.trace("get", x); return x }
    put (x: T) { this.trace("put", x); super.put(x) }
})

const MyTracingQueue = class MyTracingQueue extends
    derive(Tracing<string>, Queue<string>) {}

const queue = new MyTracingQueue()

queue.put("foo")  // -> console: put foo
queue.get()       // -> console: get foo
queue.put("bar")  // -> console: put bar
queue.put("qux")  // -> console: put qux
queue.get()       // -> console: get bar
queue.get()       // -> console: get qux
```

History
-------

The **@traits-ts/core** library was developed in January 2025 by Dr. Ralf
S. Engelschall. It is heavily inspired by Scala traits and the API
of **@ddd-ts/traits**, although **@traits-ts/core** is a "from scratch"
implementation for TypeScript.

Support
-------

The work on this Open Source Software was financially supported by the
german non-profit organisation *SEA Software Engineering Academy gGmbH*.

License
-------

Copyright &copy; 2025 Dr. Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

