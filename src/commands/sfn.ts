import { Arguments, CommandBuilder } from "yargs"
import { loadProject } from "../logic/project"

type Options = {}

export const command: string = 'stepfunctions'
export const desc: string = 'Stepfunction Module'

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs.commandDir('sfn')
)

export const handler = async (_: Arguments<Options>) => {
    const project = await loadProject()
    if(project.stepfunctions){
        console.log("You got these Stepfunctions in you Poject:")
        console.log(project.stepfunctions.map((sfn) => sfn.name).join("\n"))
    } else {
        console.log("You have no Stepfunctions in this Project.")
        console.log("Use: 'lambda stepfunctions add <name>' to add functions.")
    }
}