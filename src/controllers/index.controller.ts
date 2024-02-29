import { NextFunction, Request, Response } from "express"
import { join } from "path"
import { servicePuppeteer, goToConfig } from "@/cron/puppeteer"

let browser, page

async function initBrowser() {
    browser = await servicePuppeteer.newBrowser()
    page = await servicePuppeteer.newPage("1")
}
initBrowser()

const favicongDir: string = join(__dirname, "../assets/favicon/favicon-32.ico")

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
            res.sendFile(favicongDir)
            // res.sendStatus(204)
        } catch (error) {
            next(error)
        }
    }

    public getProperty = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { url } = req.body
            if (!url) {
                res.status(400).json({
                    message: "url property required",
                })
                return
            }
            await page.goto(url, goToConfig)
            await page.waitForSelector("body", { timeout: 15000 })
            const detailAttrContainer = await page.$(".detail-attr-container")

            if (!detailAttrContainer) {
                res.status(200).json({
                    message: "detail-attr-container element not found",
                })
                return
            }
            const liEls = await detailAttrContainer.$$("li")
            const liItems = []

            for (let index = 0; index < liEls.length; index++) {
                const liEl = liEls[index]
                const property = await liEl.evaluate(a => a.children[0].innerText)
                const value = await liEl.evaluate(a => a.children[1].innerText)
                const data = {}
                data[property] = value
                liItems.push(data)
            }

            res.status(200).json({
                data: liItems,
                message: "success",
            })
        } catch (error) {
            next(error)
        }
    }
}

export default IndexController
