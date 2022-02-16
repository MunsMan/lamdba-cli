import { exit } from "process"
import { Arguments, CommandBuilder } from "yargs"
import { deployTasks, uploadRegions } from "../logic/deploy"
import { missingCredentials } from "../logic/error"
import { loadProject, saveProject } from "../logic/project"
import { saveRunnables } from "../logic/workflow"

interface Options {
    task: boolean
}

export const command: string = "deploy"
export const desc: string = "Deploys Project to the Cloud"

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs.options({
        task: {
            type: 'boolean',
            default: false
        }
    })
)

export const handler = async (argv: Arguments<Options>): Promise<void> => {
    const { task } = argv;
    const project = await loadProject()
    if (!project.credentials) {
        return missingCredentials();
    }
    if (task) {
        const runnables = await deployTasks(project)
        await saveRunnables(runnables)
    } else {
        await uploadRegions(project)
    }
    await saveProject(project)
    console.log("Deployment finished");
    exit(0)
}