import fs from 'fs'
import os from 'os'
import { exit } from 'process'
import { Credentials } from '../@types'



export const loadProfile = (name: string, filepath?: string): Credentials => {
    filepath = filepath ? filepath : `${os.homedir()}/.aws/credentials`
    if (!fs.existsSync(filepath)) {
        console.error(`Unable to find AWS Credentials.\nLooked here: ${name}`)
        exit(1)
    }
    const file = fs.readFileSync(filepath).toString()
    const lines = file.split("\n")
    const index = lines.indexOf(`[${name}]`)
    if (index === -1) {
        console.error("Profile not Found.")
        exit(1)
    }
    const credentials: Credentials = {
        accessKeyId: lines[index + 1].split("=")[1].trim(),
        secretAccessKey: lines[index + 2].split("=")[1].trim(),
    }
    if (index + 3 < lines.length) {
        if (lines[index + 3].search("aws_session_token") !== -1) {
            credentials.sessionToken = lines[index + 3].split("=")[1].trim()
        }
    }
    return credentials
}