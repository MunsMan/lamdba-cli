import fs from 'fs'
import { Arguments, CommandBuilder } from "yargs"
import { missingRunnable } from "../logic/error"
import { getCredentials, loadProject, saveProject } from "../logic/project"
import { executeRunnable, getRunnable } from "../logic/runnable"

type Options = {
    task: string | undefined,
    all: boolean
}

export const command: string = 'run'
export const desc: string = 'run a task'

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs.options({
        task: { type: 'string' },
        all: { type: 'boolean', default: false }
    })
)

export const handler = async (argv: Arguments<Options>) => {
    const { task, all } = argv
    const project = await loadProject()
    const credentials = getCredentials(project)
    if (task) {
        const runnable = await getRunnable(task)
        await executeRunnable(runnable, credentials)
        return
    }
    if (all) {
        if (!project.settings.execution?.length) { return missingRunnable("all") }
        const tasks = fs.readdirSync(`${process.cwd()}/runnable`).map((task) => (task.split(".")[0]))
        await Promise.all(tasks.map(async (task) => {
            await executeRunnable((await getRunnable(task)), credentials)
        }))
        return
    }
    await saveProject(project)
    return
}