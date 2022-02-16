import Str from '@supercharge/strings';
import fs from 'fs'
import path from 'path'

export const mkdir = (dir: string) => {
    dir = path.normalize(dir)
    if(!fs.existsSync(dir)){
        fs.mkdirSync(dir)
    }
}

export const createBucketName = (projectName: string, region: string) => (
    `${projectName}-${region}-${Str.random(20).replace("_", "u").toLocaleLowerCase()}`
)