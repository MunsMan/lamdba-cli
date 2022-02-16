import { asl } from "../../assets/stepfunctions"
import { readFile, writeFile } from "../utils"
import YAML from 'yaml'
import { mkdir } from "../../helper/setup"
import { missingStepfunctions } from "../error"
import { Fn, Project, Stepfunction } from "../../@types"


export const createStepfunction = async (stepfunction: Stepfunction): Promise<void[]> => {
    mkdir(`${process.cwd()}/${stepfunction.rootDir}`)
    return await createDefaultStepfunction(stepfunction)
}

const createDefaultStepfunction = async (stepfunction: Stepfunction): Promise<void[]> => {
    return Promise.all([
        await writeFile(`${process.cwd()}/${stepfunction.rootDir}/${stepfunction.settingsName}`, YAML.stringify(stepfunction.config)),
        await writeFile(`${process.cwd()}/${stepfunction.rootDir}/${stepfunction.name}${stepfunction.fileext}`, asl)
    ])
}

export const configureFunctionArn = async (region: string, stepfunction: Stepfunction, fns: Fn[]) => {
    const filePath = `${process.cwd()}/${stepfunction.rootDir}/${stepfunction.name}${stepfunction.fileext}`
    let sourceFile = await readFile(filePath)
    for (let fn of fns) {
        sourceFile = sourceFile.replace(`"FunctionName": "${fn.name}"`, `"FunctionName": "${fn.config.ARN![region]}"`)
    }
    mkdir(`${process.cwd()}/${stepfunction.rootDir}/${stepfunction.dest}`)
    writeFile(`${process.cwd()}/${stepfunction.rootDir}/${stepfunction.dest}/${region}-${stepfunction.name}${stepfunction.fileext}`, sourceFile)
}


export const getFunctionFromStepfunction = async (sfn: Stepfunction): Promise<string[]> => {
    const file = await readFile(`${process.cwd()}/${sfn.rootDir}/${sfn.name}${sfn.fileext}`)
    let matches = file.match(/\"FunctionName\": \"\w+\"/g)
    matches = matches ? matches : []
    return matches.map((match) => match.split(":")[1].replace(/"/g, "",).trim())
}

export const getStepfunction = (name: string, project: Project): Stepfunction => {
    const sfn = project.stepfunctions?.find((sfn: Stepfunction) => sfn.name === name)
    if (!sfn) return missingStepfunctions()
    return sfn
}