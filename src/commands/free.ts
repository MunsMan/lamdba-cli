import { Arguments, CommandBuilder } from "yargs"
import { FnConfig } from "../@types"
import { loadFunctionConfig, saveFunctionConfig } from "../helper/function"
import { missingCredentials } from "../logic/error"
import { deleteAwsLambda } from "../logic/functions/delete"
import { loadProject, saveProject } from "../logic/project"

interface Options { }

export const command: string = "free"
export const desc: string = "Freeing/Removing Resources from the Cloud."

export const builder: CommandBuilder<Options, Options> = (yargs) => (yargs)

export const handler = async (_: Arguments<Options>): Promise<void> => {
    const project = await loadProject()
    if (!project.credentials) {
        return missingCredentials()
    }
    if (project.functions) {
        await Promise.all(project.functions.map(async (value) => {
            if (value.config.ARN) {
                return await Promise.all(Object.values(value.config.ARN).map((arn: string) => deleteAwsLambda(arn, project.credentials!)))
            } return
        }))
        await Promise.all(project.functions.map(async (value) => {
            const config: FnConfig = await loadFunctionConfig(value)
            config.ARN = undefined
            return saveFunctionConfig(value)
        }))
        project.functions.forEach(value => value.config.ARN = undefined)
    }
    await saveProject(project)
}