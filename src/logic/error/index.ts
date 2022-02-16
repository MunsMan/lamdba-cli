import { exit } from "process"


export const missingCredentials = () => {
    console.error("AWS Credentials are missing.")
    exit(1)
}

export const missingSettings = () => {
    console.error("Can't find the settings.yaml file.\nMake sure you are in the Project Root directory.")
    exit(1)
}

export const missingProject = () => {
    console.error("Can't find the .lambda.yaml file.\nMake sure you are in the Project Root directory.")
    exit(1)
}

export const missingRoles = (where?: string) => {
    console.error("You are missing some Roles.")
    console.error(where)
    exit(1)
}

export const missingRegion = (context?: string) => {
    console.error("Missing Region Object!")
    console.error(context)
    exit(1)
}

export const missingBuild = () => {
    console.error("Please Build your Project before deploying!\nJust run: lambda functions build")
    exit(1)
}

export const buildFailed = (error: string) => {
    console.error(error)
    console.error("The Build Process failed.\nMake sure every Lamdba builds Correctly.")
    exit(1)
}

export const noTasksFound = () => {
    console.error("No Tasks found!")
    exit(1)
}

export const missingStepfunctions = () => {
    console.error("Can't find Stepfunctions")
    exit(1)
}

export const missingFunctions = () => {
    console.error("Can't find Functions")
    exit(1)
}

export const workflowNotFound = (workflow: string) => {
    console.error("Unable to find Workflow: " + workflow)
    exit(1)
}

export const functionNotFound = (fn: string) => {
    console.error("Unable to find Function: " + fn)
    exit(1)
}

export const missingRunnable = (name: string) => {
    console.error(`Unable to find Runnable: ${name}`)
    console.error('Looking in <projectRoot>/runnable')
    console.error('Make sure to deploy tasks first, by running lambda deploy --task')
    exit(1)
}

export const unableToCreateCloudWatchGroup = () => {
    console.error("Unable to create CloudWatchGroup")
    exit(1)
}

export const noLogsFound = (logGroup?: string, stream?: boolean) => {
    console.error("No Logs found!")
    if (logGroup) {
        console.log(`Looking for: ${logGroup}`)
    }
    if (stream && logGroup) {
        console.log(`Stream not found in ${logGroup}`)
    }
    exit(1)
}

export const executionFailed = (task: string) => {
    console.error("Execution Failed ❌ ")
    console.error(`Failed on Task: ${task} 😔`)
    exit(1)
}

export const logNotFound = (id: number, log?: string) => {
    console.error(`Unable to find Log Event with ID: ${id}\n${log}`)
    exit(1)
}