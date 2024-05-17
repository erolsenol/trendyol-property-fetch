import { NextFunction, Request, Response } from "express"
import { servicePuppeteer, goToConfig } from "@/cron/puppeteer"
import _ from "lodash"

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
            console.log("data length: " + data.length)
            if (!browser) {
                browser = await servicePuppeteer.newBrowser()
            }

            const resArr = []
            for (let index = 0; index < data.length; index++) {
                const item = data[index]
                const liItems = await this.getTrendyolProperty(item, index)
                console.log("liItems", liItems)
                resArr.push(liItems)
            }

            res.status(200).json({
                data: resArr,
                message: "success",
            })
        } catch (error) {
            next(error)
        }
    }

    async getTrendyolProperty(url, index) {
        pages[index] = await servicePuppeteer.newPage(index)
        await pages[index].goto(url, goToConfig)
        await pages[index].waitForSelector("body", { timeout: 15000 })
        const detailAttrContainer = await pages[index].$$(".detail-attr-container")
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
        await servicePuppeteer.closePage(index)
        return liItems
    }
}

export default IndexController
