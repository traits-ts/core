/*
**  @rse/traits - Traits for TypeScript Classes
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

/* eslint no-use-before-define: off */

/*  ==== UTILITY DEFINITIONS ====  */

/*  utility function: CRC32-hashing a string into a unique identifier  */
const crcTable = [] as number[]
for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++)
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1))
    crcTable[n] = c
}
const crc32 = (str: string) => {
    let crc = 0 ^ (-1)
    for (let i = 0; i < str.length; i++)
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF]
    return (crc ^ (-1)) >>> 0
}

/*  utility type and function: regular function  */
type Func<T extends any = any> =
    (...args: any[]) => T
const isFunc =
    <T extends any = any>
    (fn: unknown): fn is Func<T> =>
    typeof fn === "function" && !!fn.prototype && !!fn.prototype.constructor

/*  utility type and function: constructor (function)  */
type Cons<T extends any = any> =
    new (...args: any[]) => T
const isCons =
    <T extends any = any>
    (fn: unknown): fn is Cons<T> =>
    typeof fn === "function" && !!fn.prototype && !!fn.prototype.constructor

/*  utility type and function: constructor factory (function)  */
type ConsFactory<T extends Cons = Cons, B extends any = any> =
    (base: B) => T
const isConsFactory =
    <T extends Cons = Cons, B extends any = any>
    (fn: unknown): fn is ConsFactory<T, B> =>
    typeof fn === "function" && !fn.prototype && fn.length === 1

/*  utility type and function: type factory (function)  */
type TypeFactory<T extends any = any> =
    () => T
const isTypeFactory =
    <T extends any = any>
    (fn: unknown): fn is TypeFactory<T> =>
    typeof fn === "function" && !fn.prototype && fn.length === 0

/*  utility type: map an object type into a bare properties type  */
type Explode<T extends any> =
    { [ P in keyof T ]: T[P] }

/*  utility type: convert a union type to an intersection type  */
type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends
    (k: infer I) => void ? I : never

/*  utility type: convert an array type to a union type  */
type ArrayToUnion<T extends any[]> =
    T[number]

/*  utility type: convert two arrays of types into an array of union types  */
type MixParams<T1 extends any[], T2 extends any[]> =
    T1 extends [] ? (
        T2 extends [] ? [] : T2
    ) : (
        T2 extends [] ? T1 : (
            T1 extends [ infer H1, ...infer R1 ] ? (
                T2 extends [ infer H2, ...infer R2 ] ?
                    [ H1 & H2, ...MixParams<R1, R2> ]
                    : []
            ) : []
        )
    )

/*  ==== TRAIT DEFINITION ====  */

/*  API: trait type  */
type TraitDefTypeT  = ConsFactory<Cons>
type TraitDefTypeST = (Trait | TypeFactory<Trait>)[] | undefined
export type Trait<
    T  extends TraitDefTypeT  = TraitDefTypeT,
    ST extends TraitDefTypeST = TraitDefTypeST
> = {
    id:          number  /* unique id (primary,   for hasTrait)      */
    symbol:      symbol  /* unique id (secondary, currently unused)  */
    factory:     T
    superTraits: ST
}

/*  API: generate trait (regular variant)  */
/* eslint no-redeclare: off */
export function trait<
    T extends ConsFactory<Cons>
> (factory: T): Trait<T, undefined>

/*  API: generate trait (super-trait variant)  */
export function trait<
    const ST extends (Trait | TypeFactory<Trait>)[],
    T extends ConsFactory<Cons,
        ST extends [ infer First, ...infer Rest ] ? (
            First extends TypeFactory<Trait> ? ExtractFactory<ReturnType<First>> :
            First extends Trait              ? ExtractFactory<First> :
            any
        ) : any
    >
> (superTraits: ST, factory: T): Trait<T, ST>

/*  API: generate trait (technical implementation)  */
export function trait<
    const ST extends (Trait | TypeFactory<Trait>)[],
    T extends ConsFactory<Cons,
        ST extends [ infer First, ...infer Rest ] ? (
            First extends TypeFactory<Trait> ? ExtractFactory<ReturnType<First>> :
            First extends Trait              ? ExtractFactory<First> :
            any
        ) : any
    >
> (...args: any[]): Trait<T, ST> {
    const factory: T      = (args.length === 2 ? args[1] : args[0])
    const superTraits: ST = (args.length === 2 ? args[0] : undefined)
    return {
        id: crc32(factory.toString()),
        symbol: Symbol("trait"),
        factory,
        superTraits
    }
}

/*  ==== TRAIT DERIVATION ====  */

/*  ---- TRAIT PART EXTRACTION ----  */

/*  utility types: extract factory from a trait  */
type ExtractFactory<
    T extends Trait
> =
    T extends Trait<
        ConsFactory<infer C>,
        TraitDefTypeST
    > ? C : never

/*  utility types: extract supertraits from a trait  */
type ExtractSuperTrait<
    T extends Trait
> =
    T extends Trait<
        TraitDefTypeT,
        infer ST extends TraitDefTypeST
    > ? ST : never

/*  ---- TRAIT CONSTRUCTOR DERIVATION ----  */

/*  utility type: derive type constructor: merge two constructors  */
type DeriveTraitsConsConsMerge<
    A extends Cons,
    B extends Cons
> =
    A extends (new (...args: infer ArgsA) => infer RetA) ? (
        B extends (new (...args: infer ArgsB) => infer RetB) ? (
            new (...args: MixParams<ArgsA, ArgsB>) => RetA & RetB
        ) : never
    ) : never

/*  utility type: derive type constructor: extract plain constructor  */
type DeriveTraitsConsCons<
    T extends Cons
> =
    new (...args: ConstructorParameters<T>) => InstanceType<T>

/*  utility type: derive type constructor: from trait parts  */
type DeriveTraitsConsTraitParts<
    C  extends Cons,
    ST extends ((Trait | TypeFactory<Trait>)[] | undefined)
> =
    ST extends undefined ? DeriveTraitsConsCons<C> :
    ST extends []        ? DeriveTraitsConsCons<C> :
    DeriveTraitsConsConsMerge<
        DeriveTraitsConsCons<C>,
        DeriveTraitsConsAll<ST>> /* RECURSION */

/*  utility type: derive type constructor: from single trait  */
type DeriveTraitsConsTrait<
    T extends Trait
> =
    DeriveTraitsConsTraitParts<
        ExtractFactory<T>,
        ExtractSuperTrait<T>>

/*  utility type: derive type constructor: from single trait or trait factory  */
type DeriveTraitsConsOne<
    T extends (Trait | TypeFactory<Trait>)
> =
    T extends Trait              ? DeriveTraitsConsTrait<T>             :
    T extends TypeFactory<Trait> ? DeriveTraitsConsTrait<ReturnType<T>> :
    never

/*  utility type: derive type constructor: from one or more traits or trait factories  */
type DeriveTraitsConsAll<
    T extends ((Trait | TypeFactory<Trait>)[] | undefined)
> =
    T extends (Trait | TypeFactory<Trait>)[] ? (
        T extends [ infer First extends (Trait | TypeFactory<Trait>) ] ? (
            DeriveTraitsConsOne<First>
        ) : (
            T extends [
                infer    First extends (Trait | TypeFactory<Trait>),
                ...infer Rest  extends (Trait | TypeFactory<Trait>)[] ] ? (
                DeriveTraitsConsConsMerge<
                    DeriveTraitsConsOne<First>,
                    DeriveTraitsConsAll<Rest>> /* RECURSION */
            ) : never
        )
    ) : never

/*  utility type: derive type constructor  */
type DeriveTraitsCons<
    T extends (Trait | TypeFactory<Trait>)[]
> =
    DeriveTraitsConsAll<T>

/*  ---- TRAIT STATICS DERIVATION ----  */

/*  utility type: derive type statics: merge two objects with statics  */
type DeriveTraitsStatsConsMerge<
    T1 extends {},
    T2 extends {}
> =
    T1 & T2

/*  utility type: derive type statics: extract plain statics  */
type DeriveTraitsStatsCons<
    T extends Cons
> =
    Explode<T>

/*  utility type: derive type statics: from trait parts  */
type DeriveTraitsStatsTraitParts<
    C  extends Cons,
    ST extends ((Trait | TypeFactory<Trait>)[] | undefined)
> =
    ST extends undefined ? DeriveTraitsStatsCons<C> :
    ST extends []        ? DeriveTraitsStatsCons<C> :
    DeriveTraitsStatsConsMerge<
        DeriveTraitsStatsCons<C>,
        DeriveTraitsStatsAll<ST>> /* RECURSION */

/*  utility type: derive type statics: from single trait  */
type DeriveTraitsStatsTrait<
    T extends Trait
> =
    DeriveTraitsStatsTraitParts<
        ExtractFactory<T>,
        ExtractSuperTrait<T>>

/*  utility type: derive type statics: from single trait or trait factory  */
type DeriveTraitsStatsOne<
    T extends (Trait | TypeFactory<Trait>)
> =
    T extends Trait              ? DeriveTraitsStatsTrait<T>             :
    T extends TypeFactory<Trait> ? DeriveTraitsStatsTrait<ReturnType<T>> :
    never

/*  utility type: derive type statics: from one or more traits or trait factories  */
type DeriveTraitsStatsAll<
    T extends ((Trait | TypeFactory<Trait>)[] | undefined)
> =
    T extends (Trait | TypeFactory<Trait>)[] ? (
        T extends [ infer First extends (Trait | TypeFactory<Trait>) ] ? (
            DeriveTraitsStatsOne<First>
        ) : (
            T extends [
                infer    First extends (Trait | TypeFactory<Trait>),
                ...infer Rest  extends (Trait | TypeFactory<Trait>)[] ] ? (
                DeriveTraitsStatsConsMerge<
                    DeriveTraitsStatsOne<First>,
                    DeriveTraitsStatsAll<Rest>> /* RECURSION */
            ) : never
        )
    ) : never

/*  utility type: derive type statics  */
type DeriveTraitsStats<
    T extends (Trait | TypeFactory<Trait>)[]
> =
    DeriveTraitsStatsAll<T>

/*  ---- TRAIT DERIVATION ----  */

/*  utility type: derive type from one or more traits or trait factories  */
type DeriveTraits<
    T extends (Trait | TypeFactory<Trait>)[]
> =
    DeriveTraitsCons<T> &
    DeriveTraitsStats<T>

/*  ---- TRAIT DERIVATION RUNTIME ----  */

/*  utility function: add an additional invisible property to an object  */
const extendProperties =
    (cons: Cons, field: string | symbol, value: any) =>
    Object.defineProperty(cons, field, { value, enumerable: false, writable: false })

/*  utility function: get raw trait  */
const rawTrait = (x: (Trait | TypeFactory<Trait>)) =>
    isTypeFactory(x) ? x() : x

/*  utility function: derive a trait  */
const deriveTrait = (
    trait$:  Trait | TypeFactory<Trait>,
    baseClz: Cons<any>,
    derived: Map<number, boolean>
) => {
    /*  get real trait  */
    const trait = rawTrait(trait$)

    /*  start with base class  */
    let clz = baseClz

    /*  in case we still have not derived this trait...  */
    if (!derived.has(trait.id)) {
        derived.set(trait.id, true)

        /*  iterate over all of its super traits  */
        if (trait.superTraits !== undefined)
            for (const superTrait of reverseTraitList(trait.superTraits))
                clz = deriveTrait(superTrait, clz, derived) /*  RECURSION  */

        /*  derive this trait  */
        clz = trait.factory(clz)
        extendProperties(clz, "id", crc32(trait.factory.toString()))
        extendProperties(clz, trait.symbol, true)
    }

    return clz
}

/*  utility function: get reversed trait list  */
const reverseTraitList = (traits: (Trait | TypeFactory<Trait>)[]) =>
    traits.slice().reverse() as (Trait | TypeFactory<Trait>)[]

/*  API: type derive  */
export function derive
    <T extends (Trait | TypeFactory<Trait>)[]>
    (...traits: T): DeriveTraits<T> {
    /*  start with an empty root base class  */
    let clz: Cons<any> = class ROOT {}

    /*  track already derived traits  */
    const derived = new Map<number, boolean>()

    /*  iterate over all traits  */
    for (const trait of reverseTraitList(traits))
        clz = deriveTrait(trait, clz, derived)

    return clz as DeriveTraits<T>
}

/*  ==== TRAIT TYPE-GUARDING ====  */

/*  internal type: implements trait type  */
type DerivedType<T extends Trait> =
    InstanceType<ExtractFactory<T>>

/*  internal type: implements trait type or trait type factory  */
type Derived<T extends (Trait | TypeFactory<Trait>)> =
    T extends TypeFactory<Trait> ? DerivedType<ReturnType<T>> :
    T extends Trait              ? DerivedType<T> :
    never

/*  API: type guard for checking whether class instance is derived from a trait  */
export function derived
    <T extends (Trait | TypeFactory<Trait>)>
    (instance: unknown, trait: T): instance is Derived<T> {
    /*  ensure the class instance is really an object  */
    if (typeof instance !== "object")
        return false
    let obj = instance

    /*  determine unique id of trait  */
    const t = (isTypeFactory(trait) ? trait() : trait) as Trait
    const idTrait = t["id"]

    /*  iterate over class/trait hierarchy  */
    while (obj) {
        if (Object.hasOwn(obj, "constructor")) {
            const id = ((obj.constructor as any)["id"] as number) ?? 0
            if (id === idTrait)
                return true
        }
        obj = Object.getPrototypeOf(obj)
    }
    return false
}

