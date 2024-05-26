import puppeteer, { PuppeteerLaunchOptions } from "puppeteer"
// import puppeteer from "puppeteer-extra"

// import StealthPlugin from "puppeteer-extra-plugin-stealth"
// import puppeteerExtraPluginAnonymizeUa from "puppeteer-extra-plugin-anonymize-ua"

// puppeteer.use(
//     puppeteerExtraPluginAnonymizeUa({
//         // customFn: (ua) => 'MyCoolAgent/' + ua.replace('Chrome', 'Beer')})
//     })
// )
// puppeteer.use(StealthPlugin())

const NODE_ENV = process.env.NODE_ENV

const headless = NODE_ENV === "development" ? false : "new"
const browserConfig: PuppeteerLaunchOptions = {
    // headless: "new",
    headless: false,
    dumpio: true,
    defaultViewport: null,
    devtools: false,
    timeout: 0,
    args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-extensions",
        "--enable-chrome-browser-cloud-management",
        // "--single-process",
        // "--devtools-flags=disable",
        // "--disable-web-security",
        // "--disable-dev-profile",
    ],
    ignoreHTTPSErrors: true,
    // ignoreDefaultArgs: ["--disable-extensions"],
    // executablePath: puppeteer.executablePath(),
}

export const goToConfig = {
    // waitUntil: "networkidle2",
    waitUntil: "domcontentloaded",
    timeout: 60000,
}

const customUA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

class ServicePuppeteer {
    browser: any = null
    pages: object = {}
    // constructor() {
    //   puppeteer.launch(browserConfig).then((browser) => (this.browser = browser));
    // }
    async newPage(name: string) {
        let browser = this.browser
        if (!browser) {
            browser = await puppeteer.launch(browserConfig)
            this.browser = browser
        }

        if (name in this.pages) {
            return this.pages[name]
        }

        const page = await this.browser.newPage()
        await page.setUserAgent(customUA)
        this.pages[name] = page
        return page
    }
    async closePage(name: string) {
        await this.pages[name].close()
        delete this.pages[name]
    }
    async closeAllPages() {
        const keys = Object.keys(this.pages)
        keys.forEach(a => this.pages[a].close())
        this.pages = {}
    }
    async newBrowser() {
        if (this.browser) {
            return this.browser
        }
        const browser = await puppeteer.launch(browserConfig)
        this.browser = browser
        return browser
    }
    async closeBrowser() {
        await this.browser.close()
        this.browser = null
    }
    async checkBrowser() {
        return new Promise<void>((resolve, reject) => {
            if (!this.browser) {
                return reject()
            }
            return resolve()
        })
    }
}

export const servicePuppeteer = new ServicePuppeteer()
