export function randomNumber(min: number = 1, max: number = 1000) {
    return Math.floor(Math.random() * (max - min)) + min
}

export async function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function autoScroll(page: any) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let totalHeight = 0
            const distance = Math.floor(Math.random() * (200 - 50)) + 50
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight

                window.scrollBy(0, distance)

                totalHeight += distance
                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer)
                    resolve(true)
                }
            }, 100)
        })
    })
}

export async function addToBasket(page: any) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let totalHeight = 0
            const distance = Math.floor(Math.random() * (200 - 50)) + 50
            const timer = setInterval(() => {
                const scrollHeight = 500

                window.scrollBy(0, distance)

                totalHeight += distance
                if (totalHeight >= scrollHeight - window.innerHeight) {
                    clearInterval(timer)
                    resolve(true)
                }
            }, 100)
        })
    })
}
