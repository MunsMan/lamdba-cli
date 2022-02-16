import YAML from "yaml"
import fs from "fs"
import { Fn, FnConfig, Project } from "../@types"

export const existsFunction = (name: string, project: Project): boolean => {
    if (project.functions) {
        return project.functions.find((value) => value.name === name) ? true : false
    }
    return false
}

export const loadFunctionConfig = async (fn: Fn): Promise<FnConfig> => (
    new Promise((resolve, reject) => {
        fs.readFile(`${process.cwd()}/${fn.rootDir}/${fn.settingsName}`, (err, data) => {
            if (err) {
                console.error(err)
                reject(err)
            }
            resolve(YAML.parse(data.toString()))
        })
    })
)

export const saveFunctionConfig = (fn: Fn): Promise<void> => (
    new Promise<void>((resolve) =>
        fs.writeFile(`${process.cwd()}/${fn.rootDir}/${fn.settingsName}`, YAML.stringify(fn.config), () => (resolve())))
)