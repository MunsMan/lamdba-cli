import { createSpinner } from "nanospinner"
import { Arguments, CommandBuilder } from "yargs"
import { buildFn } from "../../logic/functions"
import { loadProject, saveProject } from "../../logic/project"

type Options = {}

export const command: string = 'build'
export const desc: string = "Build Project"

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs
)

export const handler = async (_: Arguments<Options>) => {
    const project = await loadProject()
    project.functions = project.functions ? project.functions : []
    const spinner = createSpinner()
    spinner.start({ text: 'Building Project 🔨' })
    await Promise.all(project.functions?.map((value) => buildFn(value)))
    spinner.success({ text: 'Project Build', mark: "🛠" })
    await saveProject(project)
}