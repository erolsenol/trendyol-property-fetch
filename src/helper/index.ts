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
                    console.log("if true")
                    clearInterval(timer)
                    resolve(true)
                }
                console.log("if false")
            }, 100)
        })
    })
}
