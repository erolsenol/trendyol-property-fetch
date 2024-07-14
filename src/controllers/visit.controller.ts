import { NextFunction, Request, Response } from "express"
import { servicePuppeteer, goToConfig } from "@/cron/puppeteer"
import { logger } from "@/utils/logger"
import { timeout, autoScroll, randomNumber } from "@/helper"

const pages = {}
let browser = null

class VisitController {
    public visitHepsiburada = async (req: Request, res: Response, next: NextFunction) => {
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
                const item = data[index]
                const resVisit = await this.visitHepsiburadaLogic(item)
                console.log("resVisit", resVisit)
            }

            res.status(200).json({
                data: [],
                message: "success",
            })
        } catch (error) {
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
        switch (logicNum) {
            case 1:
                await autoScroll(pages[`hepsiburada_visit`])
                break

            default:
                break
        }

        return { id: item.id, url: item.url, message: "success" }
    }
}

export default VisitController
