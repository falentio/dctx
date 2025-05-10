import { Dctx } from "./index.ts";
import { assertEquals } from "@std/assert"

Deno.test("DCTX", async (t) => {
    const dctx = new Dctx(console.trace)
    await t.step("singleton", () => {
        const [get] = dctx.createSingleton(() => Date.now())
        assertEquals(get(), get())
    })

    await t.step("scoped", async () => {
        const [get] = dctx.createScoped(() => Date.now())
        await dctx.run(async () => {
            assertEquals(get(), get())
        })
    })

    await t.step("scoped-setter", async () => {
        const [get, set] = dctx.createScoped(() => Date.now())
        await dctx.run(async () => {
            set(12)
            assertEquals(get(), 12)
        })
    })
})