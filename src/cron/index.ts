import cron from "node-cron"
import { prismaClient } from "@/prisma"
// import moment from "moment"
// import { Worker, Queue } from "bullmq"
// import IORedis from "ioredis"
import * as urlSlug from "url-slug"
import { execute } from "@getvim/execute"

import { servicePuppeteer, goToConfig } from "./puppeteer"
import { logger } from "../utils/logger"
import { NewsData, newsCategory } from "./constants"
import { randomNumber } from "@/helper"
import ServiceGoogleStorage from "./googleStorage"

const serviceGoogleStorage = new ServiceGoogleStorage()

// import Queue from "queue"

async function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

// const PUPPETEER_PAGE_COUNT = Number(process.env.PUPPETEER_PAGE_COUNT || 5)

// const connection = new IORedis({
//     maxRetriesPerRequest: null,
// })
// const trackingQueue = new Queue("queue", { connection })

// const trackingWorker = new Worker("queue", async job => trackingItemWork(job.data, job.data.id), {
//     connection,
//     concurrency: PUPPETEER_PAGE_COUNT,
//     removeOnComplete: { count: 1000 },
//     removeOnFail: { count: 5000 },
//     autorun: true,
// })

// const drainedIndex = 0
// trackingWorker.on("drained", async () => {
//     if (drainedIndex > 0) {
//         // await scanCompleted()
//     }
//     drainedIndex++
// })

const newsSites = ["haberler"]
const pages = {}
let dbSourceSites = [],
    dbSourceCategories = []

async function startNewsSearch() {
    try {
        console.log("running a task every */30 minute")
        console.log("dbSourceSites", dbSourceSites)
        if (dbSourceSites.length < 1) {
            dbSourceSites = await prismaClient.sourceSite.findMany()
            console.log("response dbSourceSites:", dbSourceSites)
        }
        console.log("dbSourceCategories", dbSourceCategories)
        if (dbSourceCategories.length < 1) {
            dbSourceCategories = await prismaClient.category.findMany()
        }
        console.log("servicePuppeteer.newBrowser")
        await servicePuppeteer.newBrowser()
        await timeout(250)

        for (let index = 0; index < newsSites.length; index++) {
            const site = newsSites[index]
            pages[site] = await servicePuppeteer.newPage(site)

            //bullmq
            let links = []
            if (site === "haber7") {
                links = await siteScanHaber7Links(site, pages[site])
            } else if (site === "haberler") {
                console.log("site  haberler siteScanHaberler7Links")
                links = await siteScanHaberler7Links(site, pages[site])
            }

            console.log("links.length", links.length)
            for (let linkIndex = 0; linkIndex < links.length; linkIndex++) {
                //Delay
                const num = randomNumber(1000, 4000)
                await timeout(num)
                let newsObj = new NewsData()
                const link = links[linkIndex]
                if (site === "haber7") {
                    newsObj = await getHaber7NewsContent(pages[site], link)
                } else if (site === "haberler") {
                    newsObj = await getHaberlerNewsContent(pages[site], link, site)
                }

                const newsUrlCheck = await prismaClient.news.findUnique({
                    where: { url: newsObj.url },
                })
                if (newsUrlCheck) {
                    console.log(
                        `index: ${linkIndex} already exists in the database: ${newsObj.url}`
                    )
                    continue
                }

                const findCategory = dbSourceCategories.find(a => a.name === newsObj.category)
                if (!findCategory) {
                    logger.error(`category not found name: ${newsObj.category}`)
                    continue
                }
                newsObj.categoryId = findCategory.id

                const findSourceSite = dbSourceSites.find(a => a.name === newsObj.sourceSite)
                if (!findSourceSite) {
                    logger.error(`source site not found name: ${newsObj.sourceSite}`)
                    continue
                }
                newsObj.sourceSiteId = findSourceSite.id

                delete newsObj.category
                delete newsObj.addedDate
                if (!newsObj.team) {
                    delete newsObj.team
                }

                const createData = await prismaClient.news.create({ data: newsObj })
                if (createData) {
                    console.log(`index: ${linkIndex} created data: ${newsObj.url}`)
                }
            }
        }
    } catch (error) {
        console.log(error)
        logger.error(`[startNewsSearch] >> ${JSON.stringify(error)}`)
    }
}

async function getHaberlerNewsContent(page, url, siteName): Promise<NewsData> {
    return new Promise(async (resolve, reject) => {
        try {
            const news = new NewsData()

            // console.log("page.goto url:", url)
            await page.goto(url, goToConfig)
            await timeout(250)

            const icerikAlaniEl = await page.$("#icerikAlani")
            const hbbcLeftEl = await icerikAlaniEl.$(".hbbcLeft")
            const hbbcTextEls = await hbbcLeftEl.$$(".hbbcText")
            const categoryText = await hbbcTextEls[1].evaluate(a => a.children[0].innerText)
            const categoryValue = newsCategory[siteName][categoryText]
            news.category = categoryValue
            // console.log("news.category", news.category)

            const titleEl = await icerikAlaniEl.$("h1[class='title']")
            const titleText = await titleEl.evaluate(a => a.innerText)
            news.title = titleText
            // console.log("news.title", news.title)

            const videoDivEl = await icerikAlaniEl.$("#video_div")
            if (videoDivEl) {
                await page.waitForFunction(
                    'document.getElementById("contentElement").getAttribute("src") != null'
                )
                const contentElement = await videoDivEl.$("#contentElement")
                const videoHref = await contentElement.evaluate(a => a.getAttribute("src"))
                news.video = videoHref
                // console.log("news.video", news.video)
            }

            const detayVerisiAEl = await icerikAlaniEl.$("div[class='detay-verisi-a']")
            const timeEl = await detayVerisiAEl.$("time")
            const addedDate = await timeEl.evaluate(a => a.getAttribute("datetime"))
            news.addedDate = addedDate
            // console.log("news.addedDate", news.addedDate)

            const h2DescriptionEl = await icerikAlaniEl.$("h2[class='description']")
            const spotText = await h2DescriptionEl.evaluate(a => a.innerText)
            news.spot = spotText
            // console.log("news.spot", news.spot)

            const haberMetniEl = await icerikAlaniEl.$("main[class*='haber_metni']")
            const paragraphs = await haberMetniEl.evaluate(a => {
                const contents = []
                for (const child of a.children) {
                    if ((child.tagName === "P" || child.tagName === "H3") && child.innerText) {
                        if (
                            // child.getAttribute("id") !== "inpage_reklam" &&
                            child.children.length == 0
                        ) {
                            contents.push(child.innerText)
                        }
                    }
                }

                return contents
            })
            news.paragraphs = paragraphs
            // console.log("news.paragraphs", news.paragraphs)

            const contentImageEls = await haberMetniEl.$$("img[class*='hbptMainImage']")
            const imageHrefs = []

            for (const imageEl of contentImageEls) {
                await imageEl.scrollIntoView()
                await timeout(150)
                const imageHref = await imageEl.evaluate(a => a.getAttribute("src"))
                if (!imageHref.includes("base64")) {
                    imageHrefs.push(imageHref)
                }
            }
            news.images = imageHrefs
            // console.log("news.images", news.images)

            const nwsKeywordsEl = await icerikAlaniEl.$("#nwsKeywords")
            const nwsKeywordText = await nwsKeywordsEl.evaluate(a => {
                const texts = []
                for (const child of a.children) {
                    const keywordText = child.getAttribute("title")
                    // const categoryValue = newsCategory[siteName][keywordText]
                    // if (categoryValue)
                    texts.push(keywordText)
                }
                return texts.join(",")
            })
            news.keywords = nwsKeywordText
            // console.log("news.keywords", news.keywords)

            const sourceUrl = await page.url()
            news.sourceUrl = sourceUrl
            news.sourceSite = siteName
            news.url = stringToUrlConvert(titleText)

            // console.log("news.sourceUrl", news.sourceUrl)
            // console.log("news.sourceSite", news.sourceSite)
            // console.log("news.url", news.url)

            return resolve(news)
        } catch (error) {
            logger.error(`error getHaberlerNewsContent: ${error}`)
            reject()
        }
    })
}

function stringToUrlConvert(data: string) {
    const result = urlSlug.convert(data, {
        separator: "-",
        transformer: urlSlug.LOWERCASE_TRANSFORMER,
        dictionary: {
            Ç: "c",
            ç: "c",
            Ğ: "g",
            ğ: "g",
            Ö: "o",
            ö: "o",
            Ü: "u",
            ü: "u",
            Ş: "s",
            ş: "s",
            ı: "i",
            İ: "ı",
        },
    })
    return result
}

async function getHaber7NewsContent(page, url): Promise<NewsData> {
    return new Promise(async (resolve, reject) => {
        try {
            const news = new NewsData()

            console.log("getHaber7NewsContent url:", url)
            const response = await page.goto(url, goToConfig)
            await page.setContent((await response.buffer()).toString("utf8"))
            await timeout(250)

            let categoryText = ""
            if (url.includes("video.haber7.com")) {
                const breadcrumbsItem = await page.$("div[class='breadcrumbs']")
                const breadcrumbs = await breadcrumbsItem.$$("a")
                if (breadcrumbs.length > 1) {
                    categoryText = await breadcrumbs[1].evaluate(a => a.getAttribute("title"))
                }
            } else if (url.includes("yasemin.com")) {
                categoryText = "magazine"
            } else if (url.includes("haber7.com")) {
                const categoryItem = await page.$$("a[class='category']")
                if (categoryItem.length > 1) {
                    categoryText = await categoryItem[1].evaluate(item => item.innerText)
                }
            }
            news.category = categoryText
            console.log("news.category", news.category)

            let itemAddedDate = null
            if (url.includes("video.haber7.com")) {
                const detailItem = await page.$("div[class='detail-info']")
                const dateItem = await detailItem.$("div[class='date']")
                news.addedDate = await dateItem.evaluate(a => a.innerText)
            } else if (url.includes("yasemin.com")) {
                const dateItem = await page.$("span[class='date']")
                const timeItem = await page.$("span[class='time']")

                const dateText = await dateItem.evaluate(a => a.innerText.trim())
                const timeText = await timeItem.evaluate(a => a.innerText.trim())

                news.addedDate = `${dateText} ${timeText}`
            } else if (url.includes("haber7.com")) {
                const itemAddedEl = await page.$("span[class='date-item added']")
                itemAddedDate = await itemAddedEl.evaluate(item =>
                    item.innerText.replace("GİRİŞ", "").trim()
                )
                news.addedDate = itemAddedDate
            }
            console.log("news.addedDate", news.addedDate)

            if (url.includes("video.haber7.com")) {
                const titleItem = await page.$("h1[class='program-title']")
                news.title = await titleItem.evaluate(item => item.innerText)
            } else if (url.includes("haber7.com")) {
                const titleItem = await page.$("h1[class='title']")
                news.title = await titleItem.evaluate(item => item.innerText)
            } else if (url.includes("yasemin.com")) {
                const h1Item = await page.$("h1")
                news.title = await h1Item.evaluate(a => a.innerText)
            }
            console.log("news.title", news.title)

            if (url.includes("haber7.com")) {
                const spotItem = await page.$("h2[class='spot']")
                const spotText = await spotItem.evaluate(item => item.innerText)
                news.spot = spotText
            }
            console.log("news.spot", news.spot)

            if (url.includes("video.haber7.com")) {
                const detailVideoItem = await page.$("div[class='detail-video']")
                const videoItem = await detailVideoItem.$("video")
                news.video = await videoItem.evaluate(a => a.getAttribute("src"))
            } else if (url.includes("haber7.com")) {
                const newsImageItems =
                    (await (await page.$("figure[class='news-image']")).$$("img")) || []
                news.images = []
                newsImageItems.forEach(async i => {
                    const text = await i.evaluate(item => item.getAttribute("src"))
                    if (text) {
                        news.images.push(text)
                    }
                })
            } else if (url.includes("yasemin.com")) {
                const imageItems = []
                const galleryItemFigures = await page.$$("figure[class='gallery-item-figure']")
                for (const figure of galleryItemFigures) {
                    const imageItem = await figure.$("img")
                    const imageSrc = await imageItem.evaluate(a => a.getAttribute("src"))
                    if (imageSrc) {
                        news.images.push(imageSrc)
                    }
                }
            }

            if (url.includes("haber7.com") && !url.includes("video.haber7.com")) {
                const newsContentItem = await page.$("div[class='news-content']")
                const newsContentInImages = await newsContentItem.$$("img")
                newsContentInImages.forEach(async a => {
                    const text = await a.evaluate(b => {
                        const src = b.getAttribute("src")
                        if (src && src.includes("haber7")) {
                            return src
                        }
                    })
                    if (text) {
                        news.images.push(text)
                    }
                })
            }
            console.log("news.images", news.images)

            if (url.includes("video.haber7.com")) {
                const detailContentItem = await page.$("div[class='detail-content']")
                const newsContentItems = await detailContentItem.$$("p")
                newsContentItems.forEach(async a => {
                    news.paragraphs.push(await a.evaluate(b => b.innerText))
                })
            } else if (url.includes("haber7.com") && !url.includes("video.haber7.com")) {
                const newsContentItems = await (await page.$("div[class='news-content']")).$$("p")
                news.paragraphs = []
                newsContentItems.forEach(async i => {
                    news.paragraphs.push(await i.evaluate(item => item.innerText))
                })
            } else if (url.includes("yasemin.com")) {
                const galleryItems = await page.$$("div[class='gallery-item']")
                for (const galleryItem of galleryItems) {
                    const galleryContent = await galleryItem.$("span[class='description'] > p")
                    const contentText = await galleryContent.evaluate(a => a.innerText)
                    if (contentText) {
                        news.paragraphs.push(contentText)
                    }
                }
            }
            console.log("news.paragraphs", news.paragraphs)

            await timeout(200)

            return resolve(news)
        } catch (error) {
            logger.error(`error getNewsContent: ${error}`)
            reject()
        }
    })
}

async function siteScanHaberler7Links(siteName: string, page: any) {
    return new Promise<string[]>(async (resolve, reject) => {
        try {
            console.log("siteScanHaberler7Links: siteName", siteName.toUpperCase())
            const siteUrl = process.env[`PAGE_URL_${siteName.toUpperCase()}`]
            console.log("siteScanHaberler7Links: siteUrl", siteUrl)
            const totalLinks = []

            await page.goto(siteUrl, goToConfig)
            await page.waitForSelector("body", { timeout: 15000 })

            const bulletsEl = await page.$(".bullets")
            const bulletHrefEls = bulletsEl.$$("a")
            for (let index = 0; index < bulletHrefEls.length; index++) {
                const hrefEl = bulletHrefEls[index]
                const href = await hrefEl.evaluate(a => a.getAttribute("href"))
                totalLinks.push(href)
            }

            const hbNewsBoxEl = await page.$(".hbNewsBox")
            const hbNewsHrefEls = await hbNewsBoxEl.$$("a[href*='haberi/']")
            for (let index = 0; index < hbNewsHrefEls.length; index++) {
                const hrefEl = hbNewsHrefEls[index]
                const href = await hrefEl.evaluate(a => a.getAttribute("href"))
                totalLinks.push(href)
            }

            resolve(totalLinks.map(a => `${siteUrl}${a}`))
        } catch (err) {
            logger.error(`error siteScanHaber7Links: ${err}`)
            console.error(err)
            reject()
        }
    })
}

async function siteScanHaber7Links(siteName: string, page: any) {
    return new Promise<string[]>(async (resolve, reject) => {
        try {
            logger.info(`siteScanHaber7Links siteName: ${siteName}`)
            const siteUrl = process.env[`PAGE_URL_${siteName.toUpperCase()}`]
            logger.info(`siteScanHaber7Links siteUrl: ${siteUrl}`)
            await page.goto(siteUrl, goToConfig)
            await page.waitForSelector("body", { timeout: 15000 })
            const links = await page.$$("a[href*='/haber/']")
            const writerLinks = await page.$$("a[href*='/yazarlar/']")
            const paperLinks = await page.$$("a[href*='/gazete-mansetleri/']")
            const todayNewsSection = await page.$("div[class='today-news-section']")
            const todayLinks = await todayNewsSection.$$("a[href*='haber7.com']")

            const totalLinksEl = [...links, ...writerLinks, ...paperLinks, ...todayLinks]
            const totalLinks = []
            for (let index = 0; index < totalLinksEl.length; index++) {
                const totalLiksEl = totalLinksEl[index]
                const link = await totalLiksEl.evaluate(a => a.getAttribute("href"))
                totalLinks.push(link)
            }
            resolve(totalLinks)
        } catch (err) {
            logger.error(`error siteScanHaber7Links: ${err}`)
            console.error(err)
            reject()
        }
    })
}

function createBackup() {
    if (process.env.NODE_ENV == "development") return
    try {
        const d = new Date()
        const dir = process.cwd()
        const fileName = `news_db_${d.getDay()}_backup.tar`
        const writePath = `${dir}/${
            process.env.NODE_ENV == "production" ? "dist/" : "src/"
        }backup/${fileName}`

        execute(`pg_dump -U postgres -h localhost -p 5432 -f ${writePath} -F t -d news-db`)
            .then(async () => {
                logger.info(`Backup created successfully`)
                serviceGoogleStorage.uploadFile(writePath, fileName)
            })
            .catch((error: any) => {
                logger.error(`[createBackup] >> Failed CI/CD! ${JSON.stringify(error)}`)
                console.error("Failed CI/CD!", error)
            })
    } catch (error) {
        logger.error(`error createBackup: ${JSON.stringify(error)}`)
        console.error(error)
    }
}

export default function startBackupJob() {
    cron.schedule("0 */30 8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23 * * *", async () => {
        startNewsSearch()
    })
    // console.log("valid", cron.validate("0 */5 * * * *"))
    startNewsSearch()

    if (process.env.NODE_ENV === "production") {
        cron.schedule("0 0 23 * * *", async () => {
            createBackup()
        })
        createBackup()
    }
}
