import App from "@/app"
import validateEnv from "@utils/validateEnv"
import IndexRoute from "@routes/index.route"

validateEnv()

const app = new App([new IndexRoute()])

app.listen()
