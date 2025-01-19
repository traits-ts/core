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

/*  utility type: merge two constructors  */
type ConsMergeTwo<
    A extends (new (...args: any[]) => any),
    B extends (new (...args: any[]) => any)
> =
    A extends (new (...args: infer ArgsA) => infer RetA) ? (
        B extends (new (...args: infer ArgsB) => infer RetB) ? (
            new (...args: ArgsA & ArgsB) => RetA & RetB
        ) : never
    ) : never

/*  utility type: merge one or more constructors  */
type ConsMergeAny<
    T extends Cons[]
> =
    T extends [ infer Single extends Cons ] ?
        Single
    : (
        T extends [ infer Head extends Cons, ...infer Tail extends Cons[] ] ?
            ConsMergeTwo<Head, ConsMergeAny<Tail>> /* RECURSION */
        : (
            Cons
        )
    )

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

/*  ==== TRAIT DEFINITION ====  */

/*  API: trait type  */
export type Trait<
    T  extends ConsFactory<Cons> = ConsFactory<Cons>,
    ST extends ((TraitAny | TypeFactory<TraitAny>)[] | undefined) = undefined
> = {
    id:          number  /* unique id (primary,   for hasTrait)      */
    symbol:      symbol  /* unique id (secondary, currently unused)  */
    factory:     T
    superTraits: ST
}

/*  short-hand for arbitrary trait  */
type TraitAny =
    Trait<ConsFactory<Cons>, (TraitAny | TypeFactory<TraitAny>)[] | undefined>

/*  API: generate trait (regular variant)  */
/* eslint no-redeclare: off */
export function Trait<
    T extends ConsFactory<Cons>
> (factory: T): Trait<T>

/*  API: generate trait (super-trait variant)  */
export function Trait<
    const ST extends (TraitAny | TypeFactory<TraitAny>)[],
    T extends ConsFactory<Cons,
        ST extends [ infer First, ...infer Rest ] ? (
            First extends TypeFactory<TraitAny> ? ExtractFactory<ReturnType<First>> :
            First extends TraitAny              ? ExtractFactory<First> :
            any
        ) : any
    >
> (superTraits: ST, factory: T): Trait<T, ST>

/*  API: generate trait (technical implementation)  */
export function Trait<
    const ST extends (TraitAny | TypeFactory<TraitAny>)[],
    T extends ConsFactory<Cons,
        ST extends [ infer First, ...infer Rest ] ? (
            First extends TypeFactory<TraitAny> ? ExtractFactory<ReturnType<First>> :
            First extends TraitAny              ? ExtractFactory<First> :
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

/*  utility types: extract factory and supertraits from a trait  */
type ExtractFactory<T extends TraitAny> =
    T extends Trait<
        ConsFactory<infer C>,
        (TraitAny | TypeFactory<TraitAny>)[] | undefined
    > ? C : never
type ExtractSuperTrait<T extends TraitAny> =
    T extends Trait<
        ConsFactory<Cons>,
        infer ST extends ((TraitAny | TypeFactory<TraitAny>)[] | undefined)
    > ? ST : never

/*  utility type: derive type constructor: from constructor  */
type DeriveConsTraitCons<T extends Cons> =
    new (...args: ConstructorParameters<T>) => InstanceType<T>

/*  utility type: derive type constructor: from single trait  */
type DeriveConsTrait<T extends TraitAny> =
    DeriveConsTraitCons<ExtractFactory<T>> |
    DeriveConsTraitsAll<ExtractSuperTrait<T>> /* RECURSION */

/*  utility type: derive type constructor: from one or more traits or trait factories  */
type DeriveConsTraitsAll<T extends ((TraitAny | TypeFactory<TraitAny>)[] | undefined)> =
    T extends (TraitAny | TypeFactory<TraitAny>)[] ? (
        { [ K in keyof T ]:
            T[K] extends TraitAny              ? DeriveConsTrait<T[K]>             :
            T[K] extends TypeFactory<TraitAny> ? DeriveConsTrait<ReturnType<T[K]>> :
            never
        }
    ) : never

/*  utility type: derive type constructor: from one or more traits or trait factories  */
type DeriveConsTraits<T extends (TraitAny | TypeFactory<TraitAny>)[]> =
    ConsMergeAny<DeriveConsTraitsAll<T>>

/*  utility type: derive type statics: from constructor  */
type DeriveStatCons<T extends Cons> =
    UnionToIntersection<Explode<T>>

/*  utility type: derive type statics: from single trait  */
type DerviceStatTrait<T extends TraitAny> =
    DeriveStatCons<ExtractFactory<T>> &
    DeriveStatTraits<ExtractSuperTrait<T>> /* RECURSION */

/*  utility type: derive type statics: from one or more traits or trait factories  */
type DeriveStatTraits<T extends ((TraitAny | TypeFactory<TraitAny>)[] | undefined)> =
    T extends (TraitAny | TypeFactory<TraitAny>)[] ? (
        UnionToIntersection<{
            [ K in keyof T ]:
                T[K] extends TraitAny              ? DerviceStatTrait<T[K]>             :
                T[K] extends TypeFactory<TraitAny> ? DerviceStatTrait<ReturnType<T[K]>> :
                never
        }[number]>
    ) : never

/*  utility type: derive type from one or more traits or trait factories  */
type DeriveTraits<T extends (TraitAny | TypeFactory<TraitAny>)[]> =
    DeriveConsTraits<T> &
    DeriveStatTraits<T>

/*  utility function: add an additional invisible property to an object  */
const extendProperties =
    (cons: Cons, field: string | symbol, value: any) =>
    Object.defineProperty(cons, field, { value, enumerable: false, writable: false })

/*  utility function: get raw trait  */
const rawTrait = (x: (TraitAny | TypeFactory<TraitAny>)) =>
    isTypeFactory(x) ? x() : x

/*  utility function: derive a trait  */
const deriveTrait = (
    trait$:  TraitAny | TypeFactory<TraitAny>,
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
            for (const superTrait$ of reverseTraitList(trait.superTraits))
                clz = deriveTrait(superTrait$, clz, derived) /*  RECURSION  */

        /*  derive this trait  */
        clz = trait.factory(clz)
        extendProperties(clz, "id", crc32(trait.factory.toString()))
        extendProperties(clz, trait.symbol, true)
    }

    return clz
}

/*  utility function: get reversed trait list  */
const reverseTraitList = (traits: (TraitAny | TypeFactory<TraitAny>)[]) =>
    traits.slice().reverse() as (TraitAny | TypeFactory<TraitAny>)[]

/*  API: type derive  */
export const Derive =
    <T extends (TraitAny | TypeFactory<TraitAny>)[]>
    (...traits: T): DeriveTraits<T> => {
    /*  start with an empty root base class  */
    let clz: Cons<any> = class ROOT {}

    /*  track already derived traits  */
    const derived = new Map<number, boolean>()

    /*  iterate over all traits  */
    for (const trait$ of reverseTraitList(traits))
        clz = deriveTrait(trait$, clz, derived)

    return clz as DeriveTraits<T>
}

/*  ==== TRAIT TYPE-GUARDING ====  */

/*  internal type: implements trait type  */
type HasTraitType<T extends TraitAny> =
    InstanceType<ExtractFactory<T>>

/*  internal type: implements trait type or trait type factory  */
type HasTrait<T extends (TraitAny | TypeFactory<TraitAny>)> =
    T extends TypeFactory<TraitAny> ? HasTraitType<ReturnType<T>> :
    T extends TraitAny              ? HasTraitType<T> :
    never

/*  API: type guard for checking whether class instance implements a trait  */
export const hasTrait = <
    T extends (TraitAny | TypeFactory<TraitAny>)
> (instance: unknown, trait: T):
    instance is HasTrait<T> => {
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
