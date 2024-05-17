import cron from "node-cron"
import { prismaClient } from "@/prisma"
import moment from "moment"
import { Worker, Queue, QueueEvents, SandboxedJob } from "bullmq"
import IORedis from "ioredis"
import { execute } from "@getvim/execute"
import _ from "lodash"

import { NODE_ENV, SERVER_ADDRESS } from "@config"

import { servicePuppeteer, goToConfig } from "./puppeteer"
import { logger } from "../utils/logger"
import { telegram } from "./telegram"
import ServiceGoogleStorage from "./googleStorage"

const serviceGoogleStorage = new ServiceGoogleStorage()
let pageCount: number = 5,
    browserCount: number = 1

async function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
console.log("NODE_ENV", NODE_ENV, "NODE_ENV", NODE_ENV, "NODE_ENV", NODE_ENV)
interface dbUpdate {
    id?: number
    last_price?: number
    last_view_date: string
    hostname?: string
    no_stock: boolean
    last_message_date?: string
    message_count?: number
}

const POSTGRES_USER = process.env.POSTGRES_USER
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD
const PUPPETEER_PAGE_COUNT = Number(process.env.PUPPETEER_PAGE_COUNT || 6)
const INSTANCE_NO = process.env.INSTANCE_NO

console.log("process.env.INSTANCE_NO", process.env.INSTANCE_NO)
// const connection = new IORedis(process.env.REDIS_URL || "")
// const connection = new IORedis("redis://redis:6379")
// const connection = new IORedis("redis://:Snc3807!!@redis:6379/16")
// const connection = new IORedis()

const connection = new IORedis({
    port: 6379, // Redis port
    maxRetriesPerRequest: null,
})

const trackingQueues: any = {}
const queueEvents: any = {}
const trackingWorkers: any = {}
let trackingLength: number,
    trackingScanCount: number = 0

const appData = {}
const browsers: any = {}

async function startPriceTracking(browserName = "0", items: any = []) {
    try {
        logger.info(`@@@  startPriceTracking  browserName:${browserName}  @@@`)
        logger.info(`running a task every five minute INSTANCE_NO: ${INSTANCE_NO}`)
        // appData.start_date = moment().toISOString()
        // _index = 0

        if (!(browserName in servicePuppeteer.browsers)) {
            const resBrowser = await servicePuppeteer.newBrowser(browserName)
            browsers[browserName] = resBrowser
            await timeout(100)
            logger.info(`@@@  create browser:${browserName}  @@@`)
        } else {
            logger.info(`@@@  already have browser:${browserName}  @@@`)
        }

        if (items.length > 0) {
            appData.active_tracking = items.length
            appData.start_date = moment().toISOString()
            // page = await servicePuppeteer.newPage("cron")
            // page.setDefaultTimeout(0)

            const sortItems = _.shuffle(items)
            // if (sortItems.length > 2 && sortItems[0].hostname && sortItems[1].hostname) {
            //     sortItems.sort((a, b) => a.hostname?.localeCompare(b.hostname))
            // }

            for (let index = 0; index < sortItems.length; index++) {
                const sortItem = sortItems[index]
                trackingQueues[browserName].add(
                    `tracking_${browserName}`,
                    { ...sortItem, browser: browserName },
                    {
                        removeOnComplete: {
                            age: 600, // keep up to 10 minute
                            count: 500, // keep up to 500 jobs
                        },
                        removeOnFail: {
                            age: 3600, // keep up to 1 hours
                        },
                    }
                )
            }
            // const jobs = await trackingQueues[browserName].addBulk(
            //     sortItems.map(a => ({ ...a, browser: browserName }))
            // )
            // console.log("jobs:", jobs)
            console.log("add completed:", sortItems.length)
        }
    } catch (error) {
        console.log(error)
        logger.error(`[startPriceTracking] >> ${JSON.stringify(error)}`)
    }
}

async function trackingItemWork(job: SandboxedJob) {
    return new Promise<boolean>(async (resolve, reject) => {
        try {
            const index = job.data.id
            const itemId = job.data.id
            const item = job.data
            const browserName = job.data.browser
            // await servicePuppeteer.checkBrowser()
            logger.info(
                `@@@  trackingItemWork  index:${index}  @@  browserName:${browserName}  @@@`
            )
            if (
                !(browserName in servicePuppeteer.browsers) &&
                !(browserName in servicePuppeteer.pages)
            ) {
                return reject(false)
            }

            await servicePuppeteer.newPage(index.toString(), browserName)
            await timeout(50)
            const page = servicePuppeteer.pages[browserName][index.toString()]

            if (!page) {
                return reject(false)
            }

            const priceStr = await getUrlToPrice(item.id, item.url, page)
            if (!priceStr) {
                logger.info("priceStr null page.close")
                await servicePuppeteer.closePage(index.toString(), browserName)
                return resolve(true)
            }
            const hostname = urlToHost(item.url)

            const priceVal = stringToPrice(hostname, priceStr)
            console.log(
                `trackingItemWork hostname: ${hostname} - index: ${index} - priceVal: ${priceVal}`
            )
            const dbUpdate: dbUpdate = {
                no_stock: false,
                last_view_date: moment().toISOString(),
            }
            if (!item.hostname) {
                dbUpdate.hostname = hostname
            }
            if (hostname === "www.trendyol.com") {
                const noStockEl = await page.evaluate(() => {
                    const xpath = "//button[text()='Gelince Haber Ver']"
                    const matchingElement = document.evaluate(
                        xpath,
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    ).singleNodeValue

                    return matchingElement ? "1" : "0"
                })
                // logger.info(`@@@@@@@@ noStockEl:${noStockEl} @@@@@@@@@@@`)
                dbUpdate.no_stock = noStockEl == "1"
            }

            if (!(priceVal > 0)) {
                logger.info("priceVal < 1 page.close")
                await servicePuppeteer.closePage(index.toString(), browserName)
                return resolve(true)
            }

            if (!(item?.last_price > 0) && priceVal > 0) {
                dbUpdate.last_price = priceVal
            } else if (item?.last_price > 0 && priceVal > 0 && item?.target_rate) {
                const targetPrice = (item.last_price / 100) * (100 - item?.target_rate)

                // console.log("index", index)
                // console.log("priceVal", priceVal)
                // console.log("targetPrice", targetPrice)
                if (targetPrice == 0) {
                    // console.log("priceStr", priceStr)
                    // console.log("priceVal", priceVal)
                    // console.log("item.last_price", item.last_price)
                    // console.log("item?.target_rate", item?.target_rate)
                    // console.log("targetPrice", targetPrice)
                    // console.log("item.url", item.url)
                }

                if (priceVal <= targetPrice && priceVal > 0) {
                    logger.info(`send message: ${item.last_price} to ${priceVal}`)
                    const realTrackingData = await prismaClient.tracking.findUnique({
                        where: { id: itemId, status: true, deleted: false },
                    })
                    if (realTrackingData.last_message_date) {
                        const diffMinute = moment().diff(
                            moment(realTrackingData.last_message_date),
                            "minutes"
                        )
                        if (diffMinute > 29) {
                            const message = generateTelegramMessage(
                                item.last_price,
                                priceVal,
                                item.url
                            )
                            await telegram.sendMessage(item.user.telegram_id, message)
                            dbUpdate.last_message_date = moment().toISOString()
                            dbUpdate.message_count =
                                (Number(realTrackingData.message_count) || 0) + 1
                        } else {
                            logger.info(
                                `@@@   The message could not be sent because it was already sent 15 minutes ago   @@@`
                            )
                        }
                    } else {
                        const message = generateTelegramMessage(item.last_price, priceVal, item.url)
                        await telegram.sendMessage(item.user.telegram_id, message)
                        dbUpdate.last_message_date = moment().toISOString()
                        dbUpdate.message_count = (Number(realTrackingData.message_count) || 0) + 1
                    }
                }
                // Test Message
                // logger.info(`item.last_price - ${item.last_price}`)
                // logger.info(`targetPrice - ${targetPrice}`)
                // const testMessage = generateTelegramMessage(item.last_price, priceVal, item.url)
                // logger.info(`testMessage - ${testMessage}`)
                // await telegram.sendMessage(item.user.telegram_id, testMessage)

                if (item.last_price <= priceVal || priceVal <= targetPrice) {
                    dbUpdate.last_price = priceVal
                }
            }
            // if (dbUpdate.last_price && dbUpdate?.last_price > 0) {
            //     console.log(
            //         `dbUpdate.last_price up: ${dbUpdate.last_price} - itemId: ${itemId}`
            //     )
            // }

            logger.info(`Traking Last View Update -- itemId:${itemId}`)
            await prismaClient.tracking.update({ where: { id: itemId }, data: dbUpdate })

            await servicePuppeteer.closePage(index.toString(), browserName)
            return resolve(true)
        } catch (error) {
            console.error(error)
            logger.info("catch (error) page.close")
            await servicePuppeteer.closePage(job.data.id.toString(), job.data.browser)
            return reject(false)
        }
    })
}

async function scanCompleted() {
    return new Promise<boolean>(async (resolve, reject) => {
        try {
            appData.end_date = moment().toISOString()

            const diff = moment(appData.end_date).diff(moment(appData.start_date))
            const diffDuration = moment.duration(diff)
            appData.time_difference = moment
                .utc(diffDuration.asMilliseconds())
                .format("HH:mm:ss:SSS")

            const appUpsert = await prismaClient.app.upsert({
                where: { id: 1 },
                update: appData,
                create: appData,
            })
            logger.info("appUpsert", appUpsert)
            return resolve(true)
        } catch (error) {
            console.error(error)
            return reject(false)
        }
    })
}

async function getUrlToPrice(id: number, url: string, page: any) {
    return new Promise<string | Array<string>>(async resolve => {
        try {
            const hostname = urlToHost(url)
            await page.goto(url, goToConfig)

            // await page.waitForSelector("body")
            // await timeout(100)

            switch (hostname) {
                case "www.trendyol.com":
                    logger.info(`trendyol: id:${id}`)
                    const trendyolPrices = []
                    await page.waitForSelector(".product-price-container")
                    const productPriceContainer = await page.$(".product-price-container")
                    if (!productPriceContainer) return resolve("")
                    const prcDsc = await productPriceContainer.$(".prc-dsc")
                    if (!prcDsc) return resolve("")
                    const priceTrendyol = await prcDsc.evaluate(
                        (item: { innerText: string }) => item.innerText
                    )
                    trendyolPrices.push(priceTrendyol)
                    const otherMerchantsListItems = await page.$$(".other-merchants-list-item")
                    for (let index = 0; index < otherMerchantsListItems.length; index++) {
                        const otherItem = otherMerchantsListItems[index]
                        const otherPriceStr = await otherItem.evaluate(
                            i => i.querySelector(".prc-dsc")?.innerText
                        )
                        trendyolPrices.push(otherPriceStr)
                    }
                    logger.info(`trendyol: id:${id} resolve:${JSON.stringify(trendyolPrices)}`)
                    return resolve(trendyolPrices)

                case "www.vatanbilgisayar.com":
                    // const productDetailBigPrice = await page.$(".product-detail-big-price")
                    // console.log("vatanbilgisayar productDetailBigPrice", productDetailBigPrice)
                    // if (!productDetailBigPrice) return resolve("")
                    // console.log("vatanbilgisayar wait 2 start")

                    // console.log("vatanbilgisayar wait 2 end")
                    const mobilePrice = await page.$("#mobilePrice")
                    // console.log("vatanbilgisayar mobilePrice", mobilePrice)
                    if (!mobilePrice) return resolve("")
                    const priceVatan = await mobilePrice.evaluate(
                        (item: { innerText: string }) => item.innerText
                    )
                    return resolve(priceVatan)

                case "www.mediamarkt.com.tr":
                    const productPriceAmount = await page.$("meta[property='product:price:amount']")
                    if (!productPriceAmount) return resolve("")
                    const priceMedia = productPriceAmount.evaluate(
                        (item: { getAttribute: (arg0: string) => any }) =>
                            item.getAttribute("content")
                    )
                    return resolve(priceMedia)

                case "www.teknosa.com":
                    const addtocartComponent = await page.$(".addtocart-component")
                    if (!addtocartComponent) return resolve("")
                    const prcLast = await addtocartComponent.$(".prc-last")
                    if (!prcLast) return resolve("")
                    const priceTeknosa = prcLast.evaluate(
                        (item: { innerText: string }) => item.innerText
                    )
                    return resolve(priceTeknosa)

                case "www.hepsiburada.com":
                    const productPriceWrapper = await page.$(".product-price-wrapper")
                    if (!productPriceWrapper) return resolve("")
                    const currentPriceBeforePoint = await productPriceWrapper.$(
                        `span[data-bind="markupText:'currentPriceBeforePoint'"]`
                    )
                    if (!currentPriceBeforePoint) return resolve("")
                    const priceHepsiburada = await currentPriceBeforePoint.evaluate(
                        (item: { innerText: string }) => item.innerText
                    )
                    return resolve(priceHepsiburada)

                case "www.amazon.com.tr":
                    const centerCol = await page.$("#centerCol")
                    if (!centerCol) return resolve("")
                    const aPriceWhole = await centerCol.$(`span[class="a-price-whole"]`)
                    if (!aPriceWhole) return resolve("")
                    const priceAmazon = await aPriceWhole.evaluate(
                        (item: { innerText: string }) => item.innerText
                    )
                    return resolve(priceAmazon)

                case "www.ciceksepeti.com":
                    const productInfoPrice = await page.$(".product__info__price")
                    if (!productInfoPrice) return resolve("")
                    const jsPriceInteger = await productInfoPrice.$(`.js-price-integer`)
                    if (!jsPriceInteger) return resolve("")
                    const priceCiceksepeti = await jsPriceInteger.evaluate(
                        (item: { innerText: string }) => item.innerText
                    )
                    return resolve(priceCiceksepeti)

                case "www.carrefoursa.com":
                    const pdPriceCont = await page.$(".pd-price-cont")
                    if (!pdPriceCont) return resolve("")
                    const itemPrice = await pdPriceCont.$(`span[class*='item-price']`)
                    if (!itemPrice) return resolve("")
                    const priceCarrefoursa = await itemPrice.evaluate((item: any) =>
                        item.getAttribute("content")
                    )
                    return resolve(priceCarrefoursa)

                case "www.dr.com.tr":
                    const priceWrapper = await page.$("div[class*='price-wrapper']")
                    if (!priceWrapper) return resolve("")
                    const currentPrice = await priceWrapper.$(`span[class='current-price']`)
                    if (!currentPrice) return resolve("")
                    const priceDr = await currentPrice.evaluate((item: any) => item.innerText)
                    return resolve(priceDr)

                case "www.idefix.com":
                    const priceIdefix = await page.evaluate(() => {
                        const priceItem = document.querySelector(
                            "span[class*='text-[1.125rem] xl:text-[1.375rem] leading-[1.875rem]']"
                            // "#__next > main > div.lg:!mt-3.!my-0.lg:my-20.my-10 > div > div > div > div.lg:w-[68%].xl:w-[60%].lg:flex.lg:gap-4.xl:gap-6 > div.hidden.lg:block.xl:w-[42%].flex-1 > div.mb-6 > div.gap-y-4.mb-[1.625rem] > div.inline-flex.gap-4.justify-between.items-center.w-full > div > span"
                        )

                        return priceItem?.innerText
                    })
                    console.log("priceIdefix", priceIdefix)
                    return resolve(priceIdefix)

                case "www.migros.com.tr":
                    const productDetails = await page.$("div[class='product-details']")
                    if (!productDetails) return resolve("")
                    const migrosAmount = await productDetails.$(`span[class='amount']`)
                    if (!migrosAmount) return resolve("")
                    const priceMigros = await migrosAmount.evaluate((item: any) => item.innerText)
                    return resolve(priceMigros)

                case "www.n11.com":
                    const priceDetail = await page.$("div[class='priceDetail']")
                    if (!priceDetail) return resolve("")
                    const n11Ins = await priceDetail.$(`ins`)
                    if (!n11Ins) return resolve("")
                    const priceN11 = await n11Ins.evaluate((item: any) => item.innerText)
                    return resolve(priceN11)

                // case "www.sahibinden.com":
                //     const turnstileWrapper = await page.$("#turnstile-wrapper")
                //     if (turnstileWrapper) {
                //         await page.solveRecaptchas()
                //         await timeout(40000)
                //         await page.waitForSelector(".classifiedInfo ")
                //     }

                //     const classifiedInfo = await page.$(".classifiedInfo ")
                //     if (!classifiedInfo) return resolve(false)
                //     const h3El = await classifiedInfo.$(`h3`)
                //     if (!h3El) return resolve(false)
                //     const priceSahibinden = await h3El.evaluate(item => item.innerText)
                //     return resolve(priceSahibinden)

                default:
                    return resolve("")
            }
        } catch (error) {
            console.error(error)
            logger.error(`[getUrlToPrice]  >> id:${id} >>  ${url} >> ${JSON.stringify(error)}`)
            // await trackingUpdate(id, { status: false })
            return resolve("")
        }
    })
}

function stringToPrice(hostname: string, strPrice: string | Array<string>): number {
    try {
        if (!strPrice) {
            return 0
        }
        let str = null
        switch (hostname) {
            case "www.trendyol.com":
                const trendyolPriceNumbers = []
                for (let index = 0; index < strPrice.length; index++) {
                    const item = strPrice[index]
                    const indexCommaTrendyol = item.indexOf(",")
                    str = item
                    if (indexCommaTrendyol > -1) {
                        str = item.substring(indexCommaTrendyol, indexCommaTrendyol - item.length)
                    }
                    trendyolPriceNumbers.push(
                        Number(str.replace("TL", "").replace(".", "").replace(",", "").trim())
                    )
                }
                if (trendyolPriceNumbers.length < 1) return 0
                trendyolPriceNumbers.sort()
                return trendyolPriceNumbers[0]

            case "www.vatanbilgisayar.com":
                const indexVatan = strPrice.indexOf(",")
                str = strPrice
                if (indexVatan > -1) {
                    str = strPrice.substring(indexVatan, indexVatan - strPrice.length)
                }
                return Number(str.replace(".", "").replace("TL", "").trim())

            case "www.mediamarkt.com.tr":
                const indexMediamarkt = strPrice.indexOf(".")
                return Number(
                    strPrice.substring(indexMediamarkt, indexMediamarkt - strPrice.length).trim()
                )

            case "www.teknosa.com":
                const indexTeknosa = strPrice.indexOf(",")
                str = strPrice
                if (indexTeknosa > -1) {
                    str = strPrice.substring(indexTeknosa, indexTeknosa - strPrice.length)
                }
                return Number(str.replace(" TL", "").replace(".", "").trim())

            case "www.hepsiburada.com":
                return Number(strPrice.replaceAll(".", ""))

            case "www.amazon.com.tr":
                const indexAmazon = strPrice.indexOf(",")
                str = strPrice
                if (indexAmazon > -1) {
                    str = strPrice.substring(indexAmazon, indexAmazon - strPrice.length)
                }
                return Number(str.replace(".", "").trim())

            case "www.ciceksepeti.com":
                return Number(strPrice.replace(".", "").trim())

            case "www.sahibinden.com":
                const indexSahibinden = strPrice.indexOf(" TL")
                str = strPrice
                if (indexSahibinden > -1) {
                    str = strPrice.substring(indexSahibinden, indexSahibinden - strPrice.length)
                }
                return Number(str.replace(".", "").trim())

            case "www.carrefoursa.com":
                const indexCarrefoursa = strPrice.indexOf(".")
                str = strPrice
                if (indexCarrefoursa > -1) {
                    str = strPrice.substring(indexCarrefoursa, indexCarrefoursa - strPrice.length)
                }
                return Number(str.replace(".", "").trim())

            case "www.dr.com.tr":
                const indexDr = strPrice.indexOf(",")
                str = strPrice
                if (indexDr > -1) {
                    str = strPrice.substring(indexDr, indexDr - strPrice.length)
                }
                return Number(str.replace("TL", "").replace(".", "").trim())

            case "www.idefix.com":
                const indexIdefix = strPrice.indexOf(",")
                str = strPrice
                if (indexIdefix > -1) {
                    str = strPrice.substring(indexIdefix, indexIdefix - strPrice.length)
                }
                return Number(str.replace("TL", "").replace(".", "").trim())

            case "www.migros.com.tr":
                const indexMigros = strPrice.indexOf(",")
                str = strPrice
                if (indexMigros > -1) {
                    str = strPrice.substring(indexMigros, indexMigros - strPrice.length)
                }
                return Number(str.replace("TL", "").replace(".", "").trim())

            case "www.n11.com":
                const indexN11 = strPrice.indexOf(",")
                str = strPrice
                if (indexN11 > -1) {
                    str = strPrice.substring(indexN11, indexN11 - strPrice.length)
                }
                return Number(str.replace("TL", "").replace(".", "").trim())

            default:
                return 0
        }
    } catch (error) {
        console.log("error stringToPrice:", error)
        console.error(error)
        logger.error(`[stringToPrice]  >>  ${hostname} >> ${strPrice} >> ${JSON.stringify(error)}`)
        return 0
    }
}

function generateTelegramMessage(lastPrice: number, price: number, url: string) {
    // let str
    // const indexPrice = price.toString().indexOf(".")
    // str = price.toString()
    // if (indexPrice > -1) {
    //     str = str.substring(indexPrice, indexPrice - str.length)
    // }
    return `${url} Fiyatı ${lastPrice} TL' den ${price} TL' ye Düştü`
}

function urlToHost(url: string) {
    const domain = new URL(url)
    return domain.hostname
}

async function trackingUpdate(id: number, data: any) {
    prismaClient.tracking.update({ where: { id }, data })
}

// Text Content innertext innerhtml search sample trendyol its working
// var xpath = "//button[text()='Gelince Haber Ver']";
// var matchingElement = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

function createBackup() {
    logger.info(`@@@ createBackup Start @@@`)
    const d = new Date()
    const dir = process.cwd()
    const fileName = `price_tracking_db_${d.getDate()}_${d.getMonth()}_${d.getFullYear()}_backup.tar`
    const writePath = `${dir}/${NODE_ENV == "production" ? "dist/" : "src/"}backup/${fileName}`

    logger.info("@@@@@@ run execute execute @@@@@@")
    execute(
        `${NODE_ENV == "production" ? "docker exec -it postgres bash &&" : ""} export PGPASSWORD='${POSTGRES_PASSWORD}'; pg_dump -U ${POSTGRES_USER} -h ${SERVER_ADDRESS} -p 5432 -f ${writePath} -F t -d price-tracking-db`
    )
        .then(async () => {
            logger.info(`@@@ Backup created successfully @@@`)
            serviceGoogleStorage.uploadFile(writePath, fileName)
        })
        .catch((error: any) => {
            logger.error(`@@@ [createBackup] >> Failed CI/CD! ${JSON.stringify(error)}   @@@`)
            console.error("Failed CI/CD!", error)
        })
    execute(`redis-cli flushall`)
        .then(async () => {
            logger.info(`@@@ redis-cli flushall completed @@@`)
        })
        .catch((error: any) => {
            logger.error(`@@@ [redis-cli flushall] >> Failed ! ${JSON.stringify(error)}   @@@`)
        })
}

export default async function startCronJob() {
    if (["production", "development"].includes(NODE_ENV || "")) {
        const appObj = await prismaClient.app.findFirst()
        logger.info(`cron_time: ${appObj.cron_time}`)

        const cronValid = cron.validate(`0 */${appObj.cron_time || "5"} * * * *`)
        logger.info(`@@@  cronValid:${cronValid}  @@@`)
        if (!cronValid) {
            cron.schedule(`0 */3 * * * *`, async () => startSearch())
        } else {
            cron.schedule(`0 */${appObj.cron_time || "3"} * * * *`, async () => startSearch())
        }
        startSearch()
        appData.start_date = moment().toISOString()
    }

    if (NODE_ENV == "production") {
        cron.schedule("0 0 23 * * *", async () => {
            createBackup()
        })
        createBackup()
    }
}

async function startSearch() {
    logger.info("@@@  startSearch  @@@")
    const appObj = await prismaClient.app.findFirst()
    pageCount = appObj.page_count || 5
    browserCount = appObj.browser_count || 1
    const items = await prismaClient.tracking.findMany({
        where: { status: true, deleted: false },
        include: {
            user: true,
        },
    })
    trackingLength = items.length
    logger.info(`@@@  pageCount:${pageCount}  @@@  browserCount:${browserCount}  @@@`)
    logger.info(`@@@   tracking items length: ${items.length}   @@@`)

    for (let index = 0; index < browserCount; index++) {
        // if (index in trackingQueues) {
        //     // await trackingQueues[index].drain()
        //     await trackingQueues[index].clean(
        //         cronTime * 60000, // 1 minute
        //         items.length, // max number of jobs to clean
        //         "wait"
        //     )
        // }
        if (!(index in trackingQueues)) {
            trackingQueues[index] = new Queue(`queue_${index}`, {
                connection,
            })
            queueEvents[index] = new QueueEvents(`queue_${index}`)
            queueEvents[index].on("completed", async ({ jobId }: any) => {
                trackingScanCount++
                if (trackingScanCount % trackingLength == 0) {
                    await scanCompleted()
                    trackingScanCount = 0
                    appData.start_date = moment().toISOString()
                }
            })
        } else {
            await trackingQueues[index].obliterate()
        }
        if (!(index in trackingWorkers)) {
            trackingWorkers[index] = new Worker(
                `queue_${index}`,
                async (job: any) => trackingItemWork(job),
                {
                    connection,
                    concurrency: pageCount,
                    removeOnComplete: { age: 1800, count: 500 },
                    removeOnFail: { age: 1 * 3600, count: 2000 },
                    autorun: true,
                    useWorkerThreads: true,
                    limiter: {
                        max: pageCount,
                        duration: pageCount * 1100,
                        groupKey: `queue_${index}`,
                    },
                }
            )
        }

        // const counts = await trackingQueues[index].getJobCounts("wait")
        // const countWait = counts.wait
        // logger.info(`@@@  getJobCounts - countWait:${countWait}  @@@@`)
        // if (countWait > items.length) {
        //     let deletedJobIds
        //     if (countWait > items.length * 2) {
        //         deletedJobIds = await trackingQueues[index].clean(
        //             cronTime * 2 * 60000, // 1 minute
        //             Math.floor(countWait / 2), // max number of jobs to clean
        //             "wait"
        //         )
        //     } else {
        //         deletedJobIds = await trackingQueues[index].clean(
        //             cronTime * 2 * 60000, // 1 minute
        //             Math.floor(items.length / 3), // max number of jobs to clean
        //             "wait"
        //         )
        //     }

        //     logger.info(
        //         `@@@   trackingQueues[${index}].clean response:   ${JSON.stringify(deletedJobIds)}   @@@`
        //     )
        //     logger.info(`@@@   deletedJobIds:${deletedJobIds.length}   @@@`)
        // }

        startPriceTracking(index.toString(), items)
    }
}
