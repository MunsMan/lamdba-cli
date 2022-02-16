import { exit } from "process";
import { Arguments, CommandBuilder } from "yargs";
import { existsFunction } from "../../helper/function";
import { deleteFunction } from "../../logic/functions";
import { loadProject, saveProject } from "../../logic/project";

type Options = {
    name: string;
    keep: boolean;
}

export const command: string = 'remove <name>'
export const desc: string = "Removes the Lamdba Function from the Project"

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs.options({
        keep: {
            type: "string", default: false, desc: "If true, the file will not be deleted."
        }
    }).positional(
        'name', { type: 'string', demandOption: true }
    )
)

export const handler = async (argv: Arguments<Options>) => {
    const { name, keep } = argv
    const project = await loadProject()
    if (!existsFunction(name, project)) {
        console.log(`Function: ${name} doesn't exist in this Project.`)
        exit(1)
    }
    project.functions?.splice(project.functions.findIndex((value) => value.name === name), 1)
    await saveProject(project)
    if (!keep) {
        deleteFunction(name)
    }
    console.log("Function removed Successfully")
}