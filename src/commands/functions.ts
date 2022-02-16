import { exit } from "process"
import { Arguments, CommandBuilder } from "yargs"
import { getFunctionNames } from "../logic/functions"
import { loadProject } from "../logic/project"

type Options = {}

export const command: string = 'functions'
export const desc: string = 'Function Module'

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs.options({}).commandDir('functions')
)

export const handler = async (_: Arguments<Options>): Promise<void> => {
    const project = await loadProject()
    const functionNames = getFunctionNames(project)
    if(!functionNames.length){
        console.log("You have no functions in your Project.\nTo add a functions, run: 'lambda functions add'")
    } else {
        console.log(functionNames.join(" "))
    }
    exit(0)
}