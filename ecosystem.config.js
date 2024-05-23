/**
 * @description pm2 configuration file.
 * @example
 *  production mode :: pm2 start ecosystem.config.js --only prod
 *  development mode :: pm2 start ecosystem.config.js --only dev
 */

module.exports = {
    apps: [
        {
            name: "trendyol-api-prod-3000", // pm2 start App name
            script: "./dist/server.js",
            // script: "nodemon dist/server.js cross-env NODE_ENV=production",
            exec_mode: "cluster", // 'cluster' or 'fork'
            instance_var: "trendyol-prod", // instance variable
            instances: 1, // pm2 instance count
            autorestart: true, // auto restart if process crash
            watch: false, // files change automatic restart
            ignore_watch: ["node_modules", "logs"], // ignore files change
            max_memory_restart: "1G", // restart if process use more than 1G memory
            merge_logs: true, // if true, stdout and stderr will be merged and sent to pm2 log
            output: "./logs/access.log", // pm2 log file
            error: "./logs/error.log", // pm2 error log file
            env: {
                // environment variable
                PORT: 3000,
                NODE_ENV: "production",
                DATABASE_URL: "postgresql://postgres:password@localhost:5432/trendyol-db",
                ACCESS_TOKEN_KEY: "yL1ND39xqd9Y",
                REFRESH_TOKEN_KEY: "xQuYsMF62197",
                ACCESS_TOKEN_EXPIRESIN: "300m",
                REFRESH_TOKEN_EXPIRESIN: "1d",
                SESSION_KEY: "6429uXhMmw8A",
                API_TAG: "api/",
                API_VERSION: "v1/",
                LOG_FORMAT: "combined",
                LOG_DIR: "../logs",
                ORIGIN: "*",
                CREDENTIALS: "true",
                PAGE_URL_HABER7: "https://www.haber7.com",
                PAGE_URL_HABERLER: "https://www.haberler.com",
                FOLDER_PREFIX: "trendyol/",
            },
        },
        {
            name: "trendyol-api-dev-3001", // pm2 start App name
            script: "ts-node", // ts-node
            args: "-r tsconfig-paths/register --transpile-only src/server.ts", // ts-node args
            exec_mode: "cluster", // 'cluster' or 'fork'
            instance_var: "news-dev", // instance variable
            instances: 1, // pm2 instance count
            autorestart: true, // auto restart if process crash
            watch: false, // files change automatic restart
            ignore_watch: ["node_modules", "logs"], // ignore files change
            max_memory_restart: "1G", // restart if process use more than 1G memory
            merge_logs: true, // if true, stdout and stderr will be merged and sent to pm2 log
            output: "./logs/access.log", // pm2 log file
            error: "./logs/error.log", // pm2 error log file
            env: {
                // environment variable
                PORT: 3001,
                NODE_ENV: "development",
                DATABASE_URL: "postgresql://postgres:password@localhost:5432/news-db",
                ACCESS_TOKEN_KEY: "access1secret",
                REFRESH_TOKEN_KEY: "refresh1secret",
                ACCESS_TOKEN_EXPIRESIN: "300m",
                REFRESH_TOKEN_EXPIRESIN: "1d",
                SESSION_KEY: "session1secret",
                API_TAG: "api/",
                API_VERSION: "v1/",
                LOG_FORMAT: "dev",
                LOG_DIR: "../logs",
                ORIGIN: "*",
                CREDENTIALS: "true",
                AWS_S3_TEST_IMAGE_URL:
                    "https://news-bucket-111.s3.eu-central-1.amazonaws.com/images/rosierin_yeni_adresi_prensipte_anlasti_1703403400_118.jpg",
            },
        },
    ],
    deploy: {
        production: {
            user: "erol-senol",
            host: "0.0.0.0",
            ref: "origin/main",
            repo: "git@github.com:node-express-prisma-news-api.git",
            path: "dist/server.js",
            "post-deploy":
                "npm install && npm run build && pm2 reload ecosystem.config.js --only prod",
        },
    },
}
