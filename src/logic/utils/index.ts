import fs from "fs"
import path from "path"

export const readFile = (path: string): Promise<string> => (
    new Promise((resolve, reject) => {
        fs.readFile(path, (err, data: Buffer) => {
            if (err) {
                reject(err)
            } resolve(data.toString())
        })
    })
)

export const writeFile = (filepath: string, data: string): Promise<void> => (
    new Promise((resolve) => {
        fs.writeFile(path.normalize(filepath), data, () => {
            resolve()
        })
    })
)

export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
}