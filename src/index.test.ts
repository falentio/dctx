import { AsyncLocalStorage } from "node:async_hooks";
import { Dctx } from "./index.ts";
import { assertEquals, assertNotEquals, assertRejects, assertThrows } from "@std/assert"


Deno.test("DCTX", async (t) => {
    await t.step("als work", () => {
        async () => {
            const asl = new AsyncLocalStorage<string>();
            let _ctxInstance: string | undefined;
            await new Promise<void>((resolve) => {
                asl.run("A", () => {
                    setTimeout(() => {
                        _ctxInstance = asl.getStore();
                        resolve();
                    }, 1);
                });
            });
            assertEquals(_ctxInstance, "A");
            assertEquals(asl.getStore(), undefined);
        }
    })

    await t.step("singleton", async (t) => {
        await t.step("get", async () => {
            const dctx = new Dctx(console.log)
            const [get] = dctx.createSingleton(() => Date.now())
            await dctx.run(async () => {
                const a = get()
                const b = get()
                assertEquals(a, b)
            })
        })

        await t.step("set", async () => {
            const dctx = new Dctx(console.log)
            const [get, set] = dctx.createSingleton(() => Date.now())
            await dctx.run(async () => {
                set(12)
                assertEquals(get(), 12)
            })

            await dctx.run(async () => {
                assertEquals(get(), 12)
            })
        })
    })

    await t.step("scoped", async (t) => {
        await t.step("get", async () => {
            const dctx = new Dctx(console.log)
            const [get] = dctx.createScoped(() => Date.now())
            await dctx.run(async () => {
                const a = get()
                const b = get()
                assertEquals(a, b)
            })
        })

        await t.step("set", async () => {
            const dctx = new Dctx(console.log)
            const [get, set] = dctx.createScoped(() => Date.now())
            await dctx.run(async () => {
                set(12)
                assertEquals(get(), 12)
            })

            await dctx.run(async () => {
                assertNotEquals(get(), 12)
            })
        })
    })

    await t.step("dependency", async (t) => {
        await t.step("singleton depends on singleton", async () => {
            const dctx = new Dctx(console.log)
            const [getA, setA] = dctx.createSingleton(() => 1)
            const [getB] = dctx.createSingleton(() => getA() + 1)
            await dctx.run(async () => {
                assertEquals(getB(), 2)
                setA(2)
                assertEquals(getB(), 2)
            })
        })

        await t.step("scoped depends on singleton", async () => {
            const dctx = new Dctx(console.log)
            const [getA, setA] = dctx.createSingleton(() => 1)
            const [getB] = dctx.createScoped(() => getA() + 1)
            await dctx.run(async () => {
                assertEquals(getB(), 2)
                setA(2)
                assertEquals(getB(), 2)
                assertEquals(getA(), 2)
            })

            await dctx.run(async () => {
                // getB is resolved again, so cached value is stale
                assertEquals(getB(), 3)
                // getA is singleton, so modified value is persisted
                assertEquals(getA(), 2)
            })
        })

        await t.step("singleton depends on scoped", async () => {
            const dctx = new Dctx(console.log)
            const [getA] = dctx.createScoped(() => 1)
            const [getB] = dctx.createSingleton(() => getA() + 1)
            await dctx.run(async () => {
                assertEquals(getB(), 2)
            })
        })

        await t.step("scoped depends on scoped", async () => {
            const dctx = new Dctx(console.log)
            const [getA] = dctx.createScoped(() => 1)
            const [getB] = dctx.createScoped(() => getA() + 1)
            await dctx.run(async () => {
                assertEquals(getB(), 2)
            })
        })
    })

    await t.step("nested", async () => {
        const dctx = new Dctx(console.log)
        await dctx.run(async () => {
            await assertRejects(() => dctx.run(async () => { }))
        })
    })
})