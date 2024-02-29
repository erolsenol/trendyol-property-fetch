//News Interface

export class NewsData {
    category: string
    team?: string
    addedDate: string
    title: string
    spot?: string
    video?: string
    keywords?: string
    images?: string[]
    paragraphs: string[]
    url: string
    sourceUrl: string
    sourceSite: string
    categoryId: number
    sourceSiteId: number

    constructor() {
        this.category = ""
        this.team = ""
        this.addedDate = ""
        this.title = ""
        this.spot = ""
        this.video = ""
        this.keywords = ""
        this.images = []
        this.paragraphs = []
        this.url = ""
        this.sourceUrl = ""
        this.sourceSite = ""
    }
}

export const newsCategory = {
    hurriyet: {
        Kelebek: "butterfly",
        Magazin: "magazine",
        Haberler: "news",
        Gündem: "agenda",
        Dünya: "world",
        Spor: "sport",
        Futbol: "football",
        Yazarlar: "writer",
        Ekonomi: "economy",
        Televizyon: "television",
        "Resmi İlanlar": "official-announcement",
        Yaşam: "life",
        Voleybol: "volleyball",
        Tenis: "tenis",
        Basketbol: "basketball",
        "Spor Haberleri": "sport",
        "Son Dakika Güncel Haberler": "current",
        "Son Dakika Dünya Haberleri": "world",
    },
    haber7: {
        GÜNCEL: "current",
        Magazin: "magazine",
        Haberler: "news",
        Gündem: "agenda",
        Dünya: "world",
        Spor: "sport",
        Futbol: "football",
        Yazarlar: "writer",
        Ekonomi: "economy",
        Televizyon: "television",
        "Resmi İlanlar": "official-announcement",
        Yaşam: "life",
        Voleybol: "volleyball",
        Tenis: "tenis",
        Basketbol: "basketball",
    },
    haberler: {
        Haberler: "news",
        Yaşam: "life",
        Magazin: "magazine",
        Dünya: "world",
        Güncel: "current",
        "3sayfa": "page3",
        "3.Sayfa": "page3",
        Politika: "policy",
        yerel: "local",
        Gündem: "agenda",
        Spor: "sport",
        Ekonomi: "economy",
        "Kültür Sanat": "art_culture",
        Sağlık: "health",
        Hukuk: "law",
        Güvenlik: "security",
        İstanbul: "istanbul",
    },
}
