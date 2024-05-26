/**
 * @description pm2 configuration file.
 * @example
 *  production mode :: pm2 start ecosystem.config.js --only prod
 *  development mode :: pm2 start ecosystem.config.js --only dev
 */

module.exports = {
    apps: [
        {
            name: "trendyol-property-fetch-3000", // pm2 start App name
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
                API_TAG: "api/",
                API_VERSION: "v1/",
                LOG_FORMAT: "combined",
                LOG_DIR: "../logs",
                ORIGIN: "*",
                CREDENTIALS: "true",
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
