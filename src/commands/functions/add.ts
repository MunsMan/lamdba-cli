import { exit } from "process";
import { Arguments, CommandBuilder } from "yargs";
import { Fn, Runtime } from "../../@types";
import { newFnConfig } from "../../assets/functions";
import { createFunctionWorkspace } from "../../logic/functions";
import { loadProject, saveProject } from "../../logic/project";

type Options = {
    name: string;
    runtime: string;
}

const runtimes: Runtime = "TypeScript"

export const command: string = 'add <name>'
export const desc: string = 'Add Lamdba Function to the Project'

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs.
        options({
            runtime: { type: 'string', choises: runtimes, default: "TypeScript" }
        }).positional(
            'name', { type: 'string', demandOption: true }
        )
)

const isRuntime = (runtime: string): runtime is Runtime => (
    runtimes === runtime
)

export const handler = async (argv: Arguments<Options>): Promise<void> => {
    const { runtime: rt, name } = argv
    const project = await loadProject()
    if (!project.functions) {
        project.functions = []
    }
    if (project.functions.find((value) => value.name === name)) {
        console.log(`Function already exists.\nRun lambda delete ${name} to delete it.`)
        exit(1)
    }
    const runtime: Runtime = isRuntime(rt) ? rt : "TypeScript"
    const fn: Fn = {
        name, runtime,
        src: "src", build: "build", rootDir: `functions/${name}`, dest: "dest",
        settingsName: "function.yaml",
        config: newFnConfig(name, runtime === "TypeScript" ? "nodejs14.x" : runtime)
    }
    project.functions.push(fn)
    await saveProject(project)
    await createFunctionWorkspace(fn)
    console.log(`Function: ${name} created in functions/${name} 🧬`)
}