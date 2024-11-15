import { NextFunction, Request, Response } from "express"
import { servicePuppeteer, goToConfig } from "@/cron/puppeteer"
import { logger } from "@utils/logger"
import { timeout } from "@/helper"

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
    public getPropertyTrendyol = async (req: Request, res: Response, next: NextFunction) => {
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
    public getPriceTrendyol = async (req: Request, res: Response, next: NextFunction) => {
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
    public getPropertyHepsiburada = async (req: Request, res: Response, next: NextFunction) => {
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
                promises.push(this.getHepsiburadaProperty(item, index))
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
    public getPriceHepsiburada = async (req: Request, res: Response, next: NextFunction) => {
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

                promises.push(this.getHepsiburadaPrice(item, index))
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
    async getHepsiburadaProperty(item, index) {
        pages[`hepsiburada_property_${index}`] = await servicePuppeteer.newPage(
            `hepsiburada_property_${index}`
        )
        await pages[`hepsiburada_property_${index}`].goto(item.url, goToConfig)
        await pages[`hepsiburada_property_${index}`].waitForSelector("body", { timeout: 60000 })
        const techSpecs = await pages[`hepsiburada_property_${index}`].$("#techSpecs")

        if (!techSpecs) {
            return "#techSpecs element not found"
        }

        const tableRows = []
        const tableEl = await techSpecs.$(":nth-of-type(2)")
        const dynamicClassName = await (
            await tableEl.$(":first-child")
        ).evaluate(a => a.getAttribute("class"))
        if (!dynamicClassName) {
            return "dynamicClassName not found"
        }

        const els = await tableEl.$$(`.${dynamicClassName}`)
        for (let index = 0; index < els.length; index++) {
            const el = els[index]
            tableRows.push(el)
        }

        const propertyArr = []
        for (let index = 0; index < tableRows.length; index++) {
            const data = {}
            const tableRow = tableRows[index]
            const property = await tableRow.evaluate(a => a.children[0].innerText)
            const value = await tableRow.evaluate(a => a.children[1].innerText)

            data[property] = value
            propertyArr.push(data)
        }

        // const innerText = await techSpecs.evaluate(a => a.innerText)
        // const innerTextArr = innerText.split(/\r?\n/)

        // if (!innerTextArr || innerTextArr.length < 1) {
        //     return "#innerTextArr element not found"
        // }

        // const propertyArr = []

        // const newTextArr = []
        // for (let index = 0; index < innerTextArr.length; index++) {
        //     const innerTextItem = innerTextArr[index]
        //     if (!["Diğer", "Ürün özellikleri"].includes(innerTextItem.trim())) {
        //         newTextArr.push(innerTextItem)
        //     }
        // }

        // for (let i = 0; i < newTextArr.length; i++) {
        //     const el = newTextArr[i]
        //     const data = {}

        //     if (i % 2 == 0) {
        //         data[el] = ""
        //     } else {
        //         if (el) {
        //             data[newTextArr[i - 1]] = el
        //             propertyArr.push(data)
        //         } else {
        //             delete data[newTextArr[i - 1]]
        //         }
        //     }
        // }

        await servicePuppeteer.closePage(`hepsiburada_property_${index}`)
        return { id: item.id, url: item.url, data: propertyArr }
    }
    async getHepsiburadaPrice(item, index) {
        pages[`hepsiburada_price_${index}`] = await servicePuppeteer.newPage(
            `hepsiburada_price_${index}`
        )
        await pages[`hepsiburada_price_${index}`].goto(item.url, goToConfig)
        await pages[`hepsiburada_price_${index}`].waitForSelector("body", { timeout: 60000 })

        const productPriceWrapper = await pages[`hepsiburada_price_${index}`].$(
            "div[data-test-id='price-current-price']"
        )

        if (!productPriceWrapper) return null
        const priceStr = await productPriceWrapper.evaluate(a => a.children[0].innerText)

        let str
        const indexDr = priceStr.indexOf(",")
        str = priceStr
        if (indexDr > -1) {
            str = priceStr.substring(indexDr, indexDr - priceStr.length)
        }
        const priceVal = Number(str.replaceAll(".", ""))
        await servicePuppeteer.closePage(`hepsiburada_price_${index}`)

        return { id: item.id, url: item.url, data: priceVal }
    }
    public getPropertyPtt = async (req: Request, res: Response, next: NextFunction) => {
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
                promises.push(this.getPttProperty(item, index))
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
    public getPricePtt = async (req: Request, res: Response, next: NextFunction) => {
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

                promises.push(this.getPttPrice(item, index))
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
    async getPttProperty(item, index) {
        pages[`ptt_property_${index}`] = await servicePuppeteer.newPage(`ptt_property_${index}`)
        await pages[`ptt_property_${index}`].goto(item.url, goToConfig)
        await pages[`ptt_property_${index}`].waitForSelector("body", { timeout: 60000 })
        const tableAuto = await pages[`ptt_property_${index}`].$("table[class*='table-auto']")
        const liItems = []

        if (!tableAuto) {
            return "#productTechSpecContainer element not found"
        }
        const trEls = await tableAuto.$$("tr")
        for (let index = 0; index < trEls.length; index++) {
            const trEl = trEls[index]
            const data = {}

            const property = await trEl.evaluate(a => a.children[0].innerText)
            const value = await trEl.evaluate(a => a.children[1].innerText)

            data[property] = value
            liItems.push(data)
        }
        await servicePuppeteer.closePage(`ptt_property_${index}`)
        return { id: item.id, url: item.url, data: liItems }
    }
    async getPttPrice(item, index) {
        pages[`ptt_price_${index}`] = await servicePuppeteer.newPage(`ptt_price_${index}`)
        await pages[`ptt_price_${index}`].goto(item.url, goToConfig)
        await pages[`ptt_price_${index}`].waitForSelector("body", { timeout: 60000 })

        await pages[`ptt_price_${index}`].waitForSelector("div[class~='text-eGreen-700']", {
            timeout: 60000,
        })
        const textEgreen = await pages[`ptt_price_${index}`].$("div[class*='text-eGreen-700']")
        const priceStr = await textEgreen.evaluate((item: any) => item.innerText)

        const indexPtt = priceStr.indexOf(",")
        let str = priceStr
        if (indexPtt > -1) {
            str = priceStr.substring(indexPtt, indexPtt - priceStr.length)
        }

        const priceVal = Number(str.replaceAll("TL", "").replaceAll(".", "").trim())
        await servicePuppeteer.closePage(`ptt_price_${index}`)

        return { id: item.id, url: item.url, data: priceVal }
    }
    public getPropertyKoctas = async (req: Request, res: Response, next: NextFunction) => {
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
                promises.push(this.getKoctasProperty(item, index))
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
    async getKoctasProperty(item, index) {
        pages[`koctas_property_${index}`] = await servicePuppeteer.newPage(
            `koctas_property_${index}`
        )
        await pages[`koctas_property_${index}`].goto(item.url, goToConfig)
        await pages[`koctas_property_${index}`].waitForSelector("body", { timeout: 60000 })
        await pages[`koctas_property_${index}`].waitForSelector("a[href='#single-prop-0']", {
            timeout: 60000,
        })

        const collapseBtn = await pages[`koctas_property_${index}`].$("a[href='#single-prop-0']")
        if (!collapseBtn) {
            return "#collapseBtn element not found"
        }
        await collapseBtn.click()
        await timeout(200)

        const collapseContent = await pages[`koctas_property_${index}`].$("#single-prop-0")
        if (!collapseContent) {
            return "#collapseContent element not found"
        }
        const liItems = []
        const trEls = await collapseContent.$$("tr")

        for (let index = 0; index < trEls.length; index++) {
            const trEl = trEls[index]
            const data = {}

            const property = await trEl.evaluate(a => a.children[0].innerText)
            const value = await trEl.evaluate(a => a.children[1].innerText)

            data[property.trim()] = value.trim()
            liItems.push(data)
        }
        await servicePuppeteer.closePage(`koctas_property_${index}`)
        return { id: item.id, url: item.url, data: liItems }
    }
    public getPriceKoctas = async (req: Request, res: Response, next: NextFunction) => {
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

                promises.push(this.getKoctasPrice(item, index))
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
    async getKoctasPrice(item, index) {
        pages[`koctas_price_${index}`] = await servicePuppeteer.newPage(`koctas_price_${index}`)
        await pages[`koctas_price_${index}`].goto(item.url, goToConfig)
        await pages[`koctas_price_${index}`].waitForSelector("body", { timeout: 60000 })
        await pages[`koctas_price_${index}`].waitForSelector("div[class~='prdd-price-last']", {
            timeout: 60000,
        })

        const priceDiv = await pages[`koctas_price_${index}`].$("div[class~='prdd-price-last']")
        if (!priceDiv) {
            return "#priceDiv element not found"
        }
        const priceStr = await priceDiv.evaluate((item: any) => item.innerText)

        const indexPtt = priceStr.replaceAll(" ", "").indexOf(",")
        let str = priceStr
        if (indexPtt > -1) {
            str = priceStr.substring(indexPtt, indexPtt - priceStr.length)
        }

        const priceVal = Number(str.replaceAll("TL", "").replaceAll(".", "").trim())
        await servicePuppeteer.closePage(`koctas_price_${index}`)

        return { id: item.id, url: item.url, data: priceVal }
    }
    public getPropertyCiceksepeti = async (req: Request, res: Response, next: NextFunction) => {
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
                promises.push(this.getCiceksepetiProperty(item, index))
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
    async getCiceksepetiProperty(item, index) {
        pages[`ciceksepeti_property_${index}`] = await servicePuppeteer.newPage(
            `ciceksepeti_property_${index}`
        )
        await pages[`ciceksepeti_property_${index}`].goto(item.url, goToConfig)
        await pages[`ciceksepeti_property_${index}`].waitForSelector("body", { timeout: 60000 })
        await pages[`ciceksepeti_property_${index}`].waitForSelector("a[href='#single-prop-0']", {
            timeout: 60000,
        })

        const collapseBtn = await pages[`ciceksepeti_property_${index}`].$(
            "a[href='#single-prop-0']"
        )
        if (!collapseBtn) {
            return "#collapseBtn element not found"
        }
        await collapseBtn.click()
        await timeout(200)

        const collapseContent = await pages[`ciceksepeti_property_${index}`].$("#single-prop-0")
        if (!collapseContent) {
            return "#collapseContent element not found"
        }
        const liItems = []
        const trEls = await collapseContent.$$("tr")

        for (let index = 0; index < trEls.length; index++) {
            const trEl = trEls[index]
            const data = {}

            const property = await trEl.evaluate(a => a.children[0].innerText)
            const value = await trEl.evaluate(a => a.children[1].innerText)

            data[property.trim()] = value.trim()
            liItems.push(data)
        }
        await servicePuppeteer.closePage(`ciceksepeti_property_${index}`)
        return { id: item.id, url: item.url, data: liItems }
    }
    public getPriceCiceksepeti = async (req: Request, res: Response, next: NextFunction) => {
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

                promises.push(this.getCiceksepetiPrice(item, index))
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
    async getCiceksepetiPrice(item, index) {
        pages[`ciceksepeti_price_${index}`] = await servicePuppeteer.newPage(
            `ciceksepeti_price_${index}`
        )
        await pages[`ciceksepeti_price_${index}`].goto(item.url, goToConfig)
        await pages[`ciceksepeti_price_${index}`].waitForSelector("body", { timeout: 60000 })
        await pages[`ciceksepeti_price_${index}`].waitForSelector(
            "div[class~='js-price-integer']",
            {
                timeout: 60000,
            }
        )

        const priceDiv = await pages[`ciceksepeti_price_${index}`].$(
            "div[class~='js-price-integer']"
        )
        if (!priceDiv) {
            return "#priceDiv element not found"
        }
        const priceStr = await priceDiv.evaluate((item: any) => item.innerText)

        const indexPtt = priceStr.replaceAll(" ", "").indexOf(",")
        let str = priceStr
        if (indexPtt > -1) {
            str = priceStr.substring(indexPtt, indexPtt - priceStr.length)
        }

        const priceVal = Number(str.replaceAll("TL", "").replaceAll(".", "").trim())
        await servicePuppeteer.closePage(`ciceksepeti_price_${index}`)

        return { id: item.id, url: item.url, data: priceVal }
    }
}

export default IndexController
