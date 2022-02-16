import { mkdir } from "../../helper/setup";
import { functionNotFound, workflowNotFound } from "../error";
import { getFunctionFromStepfunction } from "../sfn";
import YAML from 'yaml'
import { readFile, writeFile } from "../utils";
import { Fn, FnWorkflow, Resource, Runnable, Stepfunction, Task } from "../../@types";

export const getWorkflowFunction = async (task: Task, stepfunctions: Stepfunction[], functions: Fn[]) => {
    const stepfunction = stepfunctions.find((sfn) => sfn.name === task.workflow)
    if (!stepfunction) return workflowNotFound(task.workflow)
    const fnNames = await getFunctionFromStepfunction(stepfunction)
    return fnNames.map((fnName) => {
        const fn = functions.find((f) => (f.name === fnName))
        if (!fn) {
            return functionNotFound(fnName)
        }
        const multiplyMemorySize = task.multiplyMemorySize ? task.multiplyMemorySize : 1
        const res: FnWorkflow = {
            region: task.region,
            ...fn,
            task: task.name,
            config: {
                ...fn.config,
                Properties: {
                    ...fn.config.Properties,
                    MemorySize: fn.config.Properties.MemorySize * multiplyMemorySize <= 10240 ? fn.config.Properties.MemorySize * multiplyMemorySize : 10240

                }
            }
        }
        return res
    }
    )
}

export const filterZipUpload = (FnWorkflows: FnWorkflow[]): FnWorkflow[] => (
    FnWorkflows.reduce<FnWorkflow[]>((prev: FnWorkflow[], curr: FnWorkflow) => {
        if (!prev.includes(curr)) {
            prev.push(curr)
        }
        return prev
    }, [])
)

export const configureStepFunctionTask = async (stepfunction: Stepfunction, resources: Resource[], name: string): Promise<string> => {
    const filePath = `${process.cwd()}/${stepfunction.rootDir}/${stepfunction.name}${stepfunction.fileext}`
    let sourceFile = await readFile(filePath)
    for (let resource of resources) {
        sourceFile = sourceFile.replace(`"FunctionName": "${resource.name}"`, `"FunctionName": "${resource.arn}"`)
    }
    mkdir(`${process.cwd()}/${stepfunction.rootDir}/${stepfunction.dest}`)
    writeFile(`${process.cwd()}/${stepfunction.rootDir}/${stepfunction.dest}/${name}${stepfunction.fileext}`, sourceFile)
    return sourceFile
}

export const saveRunnables = (runnables: Runnable[]) => (
    Promise.all(runnables.map(async (runnable) => await saveRunnable(runnable)))
)

const saveRunnable = async (runnable: Runnable) => {
    const dir = `${process.cwd()}/runnable`
    mkdir(dir)
    await writeFile(`${dir}/${runnable.name}.yaml`, YAML.stringify(runnable))
}