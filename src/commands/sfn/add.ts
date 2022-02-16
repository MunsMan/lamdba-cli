import { exit } from "process"
import { Arguments, CommandBuilder } from "yargs"
import { Stepfunction } from "../../@types"
import { newSfnSettings } from "../../assets/stepfunctions"
import { mkdir } from "../../helper/setup"
import { loadProject, saveProject } from "../../logic/project"
import { createStepfunction } from "../../logic/sfn"

interface Options {
    name: string
}


export const command: string = "add <name>"
export const desc: string = "Adding a Stepfunction to the Project"

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs.positional("name", { type: 'string', demandOption: true })
)

export const handler = async (argv: Arguments<Options>) => {
    const { name } = argv;
    const project = await loadProject()
    const config: Stepfunction = {
        name,
        src: 'src',
        build: 'build',
        rootDir: `stepfunctions/${name}`,
        dest: 'build',
        settingsName: 'stepfunction.yaml',
        config: newSfnSettings(name),
        fileext: '.asl.json'
    }
    if (!project.stepfunctions) {
        project.stepfunctions = []
    }
    mkdir(`${process.cwd()}/stepfunctions`)
    if (project.stepfunctions.find((sfn) => sfn.name === name)) {
        console.log(`Stepfunction ${name} is already defined!`)
        exit(1)
    }
    project.stepfunctions.push(config)
    console.log(await createStepfunction(config))
    await saveProject(project)
    console.log(`Added a new Stepfuntion to the Project:\n${name}`)
}