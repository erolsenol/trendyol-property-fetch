export function randomNumber(min: number = 1, max: number = 1000) {
    return Math.floor(Math.random() * (max - min)) + min
}
