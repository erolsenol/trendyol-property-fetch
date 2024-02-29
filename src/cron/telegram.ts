import axios from "axios"
const TELEGRAM_URL = process.env.TELEGRAM_URL

export const telegram = {
    updates: null,
    async getUpdates() {
        const response = await axios.get(TELEGRAM_URL + "getUpdates")
        if (response.status === 200) {
            this.updates = response.data.result
        }
    },
    async sendMessage(chat_id: string, text: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                const response = await axios.get(
                    `${TELEGRAM_URL}sendMessage?chat_id=${chat_id}&text=${text}`
                )
                if (response.status === 200) {
                    resolve(true)
                }
                resolve(false)
            } catch (error) {
                reject(false)
            }
        })
    },
}