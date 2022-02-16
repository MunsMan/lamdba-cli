import { Arguments, CommandBuilder } from "yargs"
import { loadProfile } from "../helper/profile"
import { loadProject, saveProject } from "../logic/project"

interface Options {
    name: string
}

export const command: string = 'profile <name>'
export const desc: string = "Adding AWS Profile to the Project"

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs.positional('name', { type: "string", demandOption: true })
)

export const handler = async (argv: Arguments<Options>) => {
    const { name } = argv
    const profile = loadProfile(name)
    const project = await loadProject()
    project.credentials = profile
    await saveProject(project)
    console.log(`Profile: ${name} added to the Project 🗝`)
}