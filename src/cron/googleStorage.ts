import { Storage } from "@google-cloud/storage"
import { logger } from "@/utils/logger"

const bucketName = process.env.BUCKET_NAME || ""
const folderPrefix = process.env.FOLDER_PREFIX

export default class ServiceGoogleStorage {
    async uploadFile(file: string, fileName: string) {
        try {
            const projectId = process.env.PROJECT_ID
            const keyFilename = process.env.KEYFILENAME
            const storage = new Storage({ projectId, keyFilename })

            const bucket = storage.bucket(bucketName)
            const res = await bucket.upload(file, { destination: `${folderPrefix}${fileName}` })

            logger.info(`[uploadFile] >> Success >> ${fileName}`)
            return res
        } catch (error) {
            logger.error(`[uploadFile] >> ${JSON.stringify(error)}`)
        }
    }
}
