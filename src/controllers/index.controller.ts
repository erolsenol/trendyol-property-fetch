import { NextFunction, Request, Response } from "express"
import { servicePuppeteer, goToConfig } from "@/cron/puppeteer"
import { logger } from "@utils/logger"

const pages = {}
let browser = null

class IndexController {
    public index = (req: Request, res: Response, next: NextFunction) => {
        try {
            res.sendStatus(200)
        } catch (error) {
            next(error)
        }
    }

    public favicon = (req: Request, res: Response, next: NextFunction) => {
        try {
            res.send("favicongDir")
            // res.sendStatus(204)
        } catch (error) {
            next(error)
        }
    }

    public getProperty = async (req: Request, res: Response, next: NextFunction) => {
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
            const promises = []
            for (let index = 0; index < data.length; index++) {
                const item = data[index]
                promises.push(this.getTrendyolProperty(item, index))
            }
            const allRes = await Promise.all(promises)
            logger.info(`@@@@@  allRes:${allRes}  @@@@@`)
            res.status(200).json({
                data: allRes,
                message: "success",
            })
        } catch (error) {
            next(error)
        }
    }

    public getPrice = async (req: Request, res: Response, next: NextFunction) => {
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
            const promises = []
            for (let index = 0; index < data.length; index++) {
                const item = data[index]
                promises.push(this.getTrendyolPrice(item, index))
            }
            const allRes = await Promise.all(promises)
            logger.info(`@@@@@  allRes:${allRes}  @@@@@`)
            res.status(200).json({
                data: allRes,
                message: "success",
            })
        } catch (error) {
            next(error)
        }
    }
    async getTrendyolProperty(item, index) {
        pages[`property_${index}`] = await servicePuppeteer.newPage(`property_${index}`)
        await pages[`property_${index}`].goto(item.url, goToConfig)
        await pages[`property_${index}`].waitForSelector("body", { timeout: 60000 })
        const detailAttrContainer = await pages[`property_${index}`].$$(".detail-attr-container")
        const liItems = []

        if (!detailAttrContainer) {
            return "detail-attr-container element not found"
        }
        for (let index = 0; index < detailAttrContainer.length; index++) {
            const elDetailContainer = detailAttrContainer[index]
            const liEls = await elDetailContainer.$$("li")

            for (let index = 0; index < liEls.length; index++) {
                const data = {}
                const liEl = liEls[index]
                const property = await liEl.evaluate(a => a.children[0].innerText)
                const value = await liEl.evaluate(a => a.children[1].innerText)

                data[property] = value
                liItems.push(data)
            }
        }
        await servicePuppeteer.closePage(`property_${index}`)
        return { id: item.id, url: item.url, data: liItems }
    }

    async getTrendyolPrice(item, index) {
        pages[`price_${index}`] = await servicePuppeteer.newPage(`price_${index}`)
        await pages[`price_${index}`].goto(item.url, goToConfig)
        await pages[`price_${index}`].waitForSelector("body", { timeout: 60000 })
        const productPriceContainer = await pages[`price_${index}`].$(".product-price-container")
        if (!productPriceContainer) return null

        const priceEl = await productPriceContainer.$(".prc-dsc")
        if (!priceEl) return null

        const priceStr = await priceEl.evaluate(a => a.innerText)
        const indexCommaTrendyol = priceStr.indexOf(",")
        let str = priceStr
        if (indexCommaTrendyol > -1) {
            str = priceStr.substring(indexCommaTrendyol, indexCommaTrendyol - priceStr.length)
        }
        const priceVal = Number(str.replace("TL", "").replace(".", "").replace(",", "").trim())
        await servicePuppeteer.closePage(`price_${index}`)

        return { id: item.id, url: item.url, data: priceVal }
    }
}

export default IndexController
