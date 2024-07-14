import { PrismaClient } from "@prisma/client"
// import { hash } from "bcrypt"

// import moment from "../utils/moment"
// import { categories } from "../constants/index"

const prisma = new PrismaClient()

async function main() {}
main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async e => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
