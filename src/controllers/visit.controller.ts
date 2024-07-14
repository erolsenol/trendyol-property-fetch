import { NextFunction, Request, Response } from "express"
import { servicePuppeteer, goToConfig } from "@/cron/puppeteer"
import { logger } from "@/utils/logger"
import { timeout, autoScroll, randomNumber, addToBasket } from "@/helper"
import { prismaClient } from "@/prisma"

const pages = {}
let browser = null

class VisitController {
    public visitHepsiburada = async (req: Request, res: Response, next: NextFunction) => {
        const breakTime = randomNumber(2000, 10000)
        try {
            const { data } = req.body
            if (!data) {
                res.status(400).json({
                    message: "data property required",
                })
                return
            }

            if (!browser) {
                browser = await servicePuppeteer.newBrowser()
            }
            logger.info(`@@@@@  data.length:${data.length}  @@@@@`)

            for (let index = 0; index < data.length; index++) {
                if (!data[index]?.url) {
                    continue
                }
                const item = data[index]
                let dbVisit = await prismaClient.offer.findUnique({
                    where: {
                        url: item.url,
                    },
                })

                if (!dbVisit) {
                    dbVisit = await prismaClient.offer.create({
                        data: {
                            url: item.url,
                        },
                    })
                }

                const resVisit = await this.visitHepsiburadaLogic(item)

                if (resVisit?.message === "success" && dbVisit.id) {
                    await prismaClient.offer.update({
                        where: {
                            id: dbVisit.id,
                        },
                        data: {
                            visitCount: (dbVisit.visitCount += 1),
                        },
                    })
                }
            }

            await timeout(breakTime)
            await pages[`hepsiburada_visit`].close()
            res.status(200).json({
                data: [],
                message: "success",
            })
        } catch (error) {
            await timeout(breakTime)
            await pages[`hepsiburada_visit`].close()
            next(error)
        }
    }

    async visitHepsiburadaLogic(item) {
        pages[`hepsiburada_visit`] = await servicePuppeteer.newPage(`hepsiburada_visit`)
        await pages[`hepsiburada_visit`].goto(item.url, goToConfig)
        await pages[`hepsiburada_visit`].waitForSelector("body", { timeout: 60000 })

        await timeout(7500)
        const url = await pages[`hepsiburada_visit`].evaluate(() => document.location.href)
        console.log(url)

        const logicNum = randomNumber(1, 2)
        console.log("logicNum", logicNum)
        switch (logicNum) {
            case 1:
                await autoScroll(pages[`hepsiburada_visit`])
                break
            case 2:
                await addToBasket(pages[`hepsiburada_visit`])
                await pages[`hepsiburada_visit`].waitForSelector("#addToCart", { timeout: 10000 })
                const addToCart = await pages[`hepsiburada_visit`].$("#addToCart")
                console.log("addToCart", addToCart)
                if (addToCart) {
                    await addToCart.click()
                    console.log("click okk")
                    await timeout(3000)
                }
                break

            default:
                break
        }

        return { id: item.id, url: item.url, message: "success" }
    }
}

export default VisitController
