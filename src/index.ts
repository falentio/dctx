import { AsyncLocalStorage } from "node:async_hooks";

export type DependencyContextSetter<T> = (value: T) => void
export type DependencyContextGetter<T> = () => T
export type DependencyContext<T> = [DependencyContextGetter<T>, DependencyContextSetter<T>]

export class Dctx {
    private readonly storage = new AsyncLocalStorage<Map<symbol, unknown>>();
    constructor(
        private logger?: (...args: unknown[]) => void
    ) { }

    private callWithLogger<T>(fn: () => T, message: string) {
        this.logger?.(message)
        return fn()
    }

    /**
     * Creates a singleton instance of a class. It literally just `once` wrapper
     * @param factory - A function that returns the instance of the class.
     * @returns A tuple containing the getter and setter for the singleton instance.
     */
    createSingleton<T>(factory: () => T, name = factory.name): DependencyContext<T> {
        let instance: T
        this.logger?.(`Creating singleton for ${name}`)
        return [
            () => {
                this.logger?.(`Resolving singleton for ${name}`)
                return instance ||= this.callWithLogger(factory, `Creating singleton instance of ${name}`)
            },
            (i: T) => {
                this.logger?.(`Setting singleton for ${name} with value ${i}`)
                instance = i
            }
        ] as const
    }

    createScoped<T>(factory: () => T, name = factory.name): DependencyContext<T> {
        const key = Symbol()
        this.logger?.(`Creating scoped for ${name}`)
        const get = () => {
            this.logger?.(`Resolving scoped for ${name}`)
            const store = this.storage.getStore()
            if (!store) throw new Error("No context found")
            const value = store.get(key)
            if (!value) {
                const instance = this.callWithLogger(factory, `Creating scoped instance of ${name}`)
                store.set(key, instance)
                return instance
            }
            return value as T
        }

        const set = (value: T) => {
            this.logger?.(`Setting scoped for ${name} with value ${value}`)
            const store = this.storage.getStore()
            if (!store) throw new Error("No context found")
            store.set(key, value)
        }

        return [get, set] as const
    }

    run<T>(fn: () => Promise<T>): Promise<T> {
        if (this.storage.getStore()) throw new Error("Context already running")
        this.logger?.(`Running context`)
        return this.storage.run(new Map(), fn)
    }
}

export const dctx: Dctx = new Dctx()