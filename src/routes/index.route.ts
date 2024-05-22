import { Router } from "express"
import IndexController from "@controllers/index.controller"
import { Routes } from "@interfaces/routes.interface"

class IndexRoute implements Routes {
    public path = "/api/v1"
    public router = Router()
    public indexController = new IndexController()

    constructor() {
        this.initializeRoutes()
    }

    private initializeRoutes() {
        this.router.get("/", this.indexController.index)
        this.router.post("/trendyol/get-property", this.indexController.getProperty)
        this.router.post("/trendyol/get-price", this.indexController.getPrice)

        // this.router.get("/favicon.ico", this.indexController.favicon)
    }
}

export default IndexRoute
