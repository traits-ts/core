/*
**  @rse/traits - Traits for TypeScript Classes
**  Copyright (c) 2025 Dr. Ralf S. Engelschall <rse@engelschall.com>
**  Licensed under MIT license <https://spdx.org/licenses/MIT>
*/

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
    (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

/*  API: trait type  */
export type Trait<
    T  extends ConsFactory<Cons> = ConsFactory<Cons>,
    ST extends (Trait | TypeFactory<Trait>)[] = any[]
> = {
    id:           number  /* unique id (primary, for implementsTrait) */
    symbol:       symbol  /* unique id (secondary, basely unused)  */
    factory:      T
    superTraits?: ST
}

/*  utility type: extract factory and supertraits from a trait  */
type ExtractFactory<T extends Trait> =
    T extends Trait<
        ConsFactory<infer F>
    > ? F : never
type ExtractSuperTrait<T extends Trait> =
    T extends Trait<
        ConsFactory<Cons>,
        infer ST extends (Trait | TypeFactory<Trait>)[]
    > ? ST : never

/*  internal type derive: constructor  */
type DeriveCons<T extends Cons> =
    { new (...args: ConstructorParameters<T>): InstanceType<T> } &
    UnionToIntersection<Explode<InstanceType<T>>>

/*  internal type derive: trait  */
/* eslint no-use-before-define: off */
type DeriveTrait<T extends Trait> =
    DeriveCons<ExtractFactory<T>> &
    DeriveTraits<ExtractSuperTrait<T>>

/*  internal type derive: traits  */
type DeriveTraits<T extends (Trait | TypeFactory<Trait>)[]> =
    UnionToIntersection<{
        [ K in keyof T ]:
            T[K] extends Trait              ? DeriveTrait<T[K]>             :
            T[K] extends TypeFactory<Trait> ? DeriveTrait<ReturnType<T[K]>> :
            never
    }[number]>

/*  utility function: add an additional invisible property to an object  */
const extendProperties =
    (cons: Cons, field: string | symbol, value: any) =>
    Object.defineProperty(cons, field, { value, enumerable: false, writable: false })

/*  utility function: derive all class from a base class via the class factory  */
const deriveClass = (trait: Trait, baseClz: Cons<any>) => {
    const clz = trait.factory(baseClz)
    extendProperties(clz, "id", crc32(trait.factory.toString()))
    extendProperties(clz, trait.symbol, true)
    return clz
}

/*  utility function: get reversed trait list  */
const reverseTraitList = (traits: (Trait | TypeFactory<Trait>)[]) =>
    traits.slice().reverse() as (Trait | TypeFactory<Trait>)[]

/*  utility function: get raw trait  */
const rawTrait = (x: (Trait | TypeFactory<Trait>)) =>
    isTypeFactory(x) ? x() : x

/*  API: type derive  */
export const Derive =
    <T extends (Trait | TypeFactory<Trait>)[]>
    (...traits: T): DeriveTraits<T> => {
    /*  start with an empty root base class  */
    let clz: Cons<any> = class ROOT {}

    /*  iterate over all traits  */
    for (const trait$ of reverseTraitList(traits)) {
        const trait = rawTrait(trait$)

        /*  iterate over all of its super traits  */
        if (trait.superTraits !== undefined) {
            for (const superTrait$ of reverseTraitList(trait.superTraits)) {
                const superTrait = rawTrait(superTrait$)

                /*  derive from supertrait  */
                clz = deriveClass(superTrait, clz)
            }
        }

        /*  derive from trait  */
        clz = deriveClass(trait, clz)
    }
    return clz as DeriveTraits<T>
}

/*  API: generate trait (regular variant)  */
/* eslint no-redeclare: off */
export function Trait<
    T extends ConsFactory<Cons>
> (factory: T): Trait<T>

/*  API: generate trait (super-trait variant)  */
export function Trait<
    const ST extends (Trait | TypeFactory<Trait>)[],
    T extends ConsFactory<Cons,
        ST extends [ infer First, ...infer Rest ] ? (
            First extends TypeFactory<Trait> ? ExtractFactory<ReturnType<First>> :
            First extends Trait              ? ExtractFactory<First> :
            Cons
        ) : Cons
    >
> (superTraits: ST, factory: T): Trait<T, ST>

/*  API: generate trait (technical implementation)  */
export function Trait<
    const ST extends (Trait | TypeFactory<Trait>)[],
    T extends ConsFactory<Cons,
        ST extends [ infer First, ...infer Rest ] ? (
            First extends TypeFactory<Trait> ? ExtractFactory<ReturnType<First>> :
            First extends Trait              ? ExtractFactory<First> :
            Cons
        ) : Cons
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

/*  internal implements derive type: trait  */
type ImplementsTrait<T extends Trait> =
    InstanceType<ExtractFactory<T>>

/*  internal implements derive type: trait or trait type factory  */
type ImplementsTraitOrFunc<T extends (Trait | TypeFactory<Trait>)> =
    T extends TypeFactory<Trait> ? ImplementsTrait<ReturnType<T>> :
    T extends Trait              ? ImplementsTrait<T> :
    never

/*  API: type guard for checking whether class instance implements a trait  */
export const hasTrait = <
    T extends (Trait | TypeFactory<Trait>)
> (instance: unknown, trait: T):
    instance is ImplementsTraitOrFunc<T> => {
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
