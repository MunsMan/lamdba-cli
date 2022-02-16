import { LoggingConfiguration } from "@aws-sdk/client-sfn";
import fs from "fs";
import { AwsS3Upload, Credentials, Fn, FnWorkflow, Project, RegionObj, Resource, Runnable, Stepfunction, Task, TaskBuild } from "../../@types";
import { createAwsLambda, createBucket, existsAwsLambda, existsBucket, updateAwsLambda, uploadFileS3 } from "../aws";
import { missingBuild, missingCredentials, missingFunctions, missingRoles, missingStepfunctions, noTasksFound } from "../error";
import { deployFunctions } from "../functions/deploy";
import { getLogGroup } from "../log";
import { getCredentials } from "../project";
import { getStepfunction } from "../sfn";
import { deployStepfuntion } from "../sfn/deploy";
import { getWorkflowFunction } from "../workflow";
import { deployStepfuntionWorkflow, deployWorkflowsFunctions } from "../workflow/deploy";

export const uploadFunctionS3 = async (fn: Fn, region: RegionObj, credentials: Credentials): Promise<string> => {
    const zipPath = `${process.cwd()}/${fn.rootDir}/${fn.dest}/${fn.name}.zip`
    if (!fs.existsSync(zipPath)) return missingBuild()
    const s3Config: AwsS3Upload = { S3Bucket: region.bucket, S3Key: `${region.region}-${fn.name}.zip` }
    return await uploadFileS3(zipPath, s3Config, region.region, credentials)
}

export const uploadRegions = (project: Project): Promise<void[]> => {
    if (!project.credentials) {
        return missingCredentials()
    }
    const credentials: Credentials = project.credentials!
    return Promise.all(Object.values(project.regions).map(async (region: RegionObj) => {
        if (!(await existsBucket(region, credentials))) {
            await createBucket(region, credentials)
        }
        await deployFunctions({
            region,
            credentials: credentials!,
            functions: project.functions,
            globalRole: project.settings.role
        });
        await deployStepfuntion(
            {
                region,
                credentials: credentials!,
                stepfunctions: project.stepfunctions,
                globalRole: project.settings.role,
                functions: project.functions
            }
        )
        return
    }))
}

export const deployTasks = async (project: Project): Promise<Runnable[]> => {
    const tasks = project.settings.execution
    if (!tasks) {
        return noTasksFound()
    }
    if (!project.functions) return missingFunctions()
    if (!project.stepfunctions) return missingStepfunctions()
    const workflows: TaskBuild[] = await Promise.all(
        tasks.map(
            async (task: Task) => ({
                name: task.name,
                region: task.region,
                payload: task.payload,
                output: task.output,
                workflow: task.workflow,
                repetitions: task.repetitions ? task.repetitions : 1,
                multiplyMemorySize: task.multiplyMemorySize ? task.multiplyMemorySize : 1,
                workflowFunctions: await getWorkflowFunction(task, project.stepfunctions!, project.functions!)
            }
            )))
    // await deployCode(workflows.map((v) => v.workflowFunctions), project.regions, project.credentials!)
    return await Promise.all(workflows.map(async (build: TaskBuild) => (
        await createRunnable({
            build,
            credentials: getCredentials(project),
            sfn: Object.assign(getStepfunction(build.workflow, project)),
            functions: build.workflowFunctions,
            deployFunctions: (wfns: FnWorkflow[]) => deployWorkflowsFunctions(wfns, project.regions, getCredentials(project))
        })
    )))
}

interface CreateRunnableInput {
    build: TaskBuild,
    credentials: Credentials,
    sfn: Stepfunction,
    functions: FnWorkflow[],
    deployFunctions: (wfns: FnWorkflow[]) => Promise<Resource[]>
}

const createRunnable = async (
    {
        build,
        credentials,
        sfn,
        functions,
        deployFunctions }: CreateRunnableInput
): Promise<Runnable> => {
    if (!sfn.config.roleArn) {
        missingRoles(`Stepfunction: ${sfn.name}`)
    }
    const resources = await deployFunctions(functions)
    const logGroup = await getLogGroup(build.region, `${build.name}-${build.region}-logGroup`, credentials)
    const logConfig: LoggingConfiguration = {
        destinations: [
            {
                cloudWatchLogsLogGroup: {
                    logGroupArn: logGroup.arn
                }
            }
        ],
        level: 'ALL',
        includeExecutionData: true
    }
    const workflow: Resource = await deployStepfuntionWorkflow({
        workflow: {
            name: build.name,
            region: build.region,
            role: sfn.config.roleArn!
        },
        stepfunction: sfn,
        resources,
        credentials,
        logConfig
    })
    const runnable: Runnable = {
        name: build.name,
        region: build.region,
        workflow,
        resources,
        payload: JSON.stringify(build.payload ? build.payload : {}),
        output: build.output,
        logger: logGroup,
        repetitions: build.repetitions
    }

    return runnable
}

export const uploadLambdaAWS = async (
    fn: Fn,
    regionObj: RegionObj,
    credentials: Credentials
): Promise<string> => {
    const arn = await existsAwsLambda(fn.config.Properties.FunctionName, credentials, regionObj.region);
    if (arn === "") {
        const lambda = await createAwsLambda({
            regionObj,
            s3name: fn.name,
            properties: fn.config.Properties,
            credentials
        })
        return lambda.FunctionArn ? lambda.FunctionArn : ""
    } else {
        const lambda = await updateAwsLambda({ regionObj, s3name: fn.name, properties: fn.config.Properties, credentials })
        return lambda.FunctionArn ? lambda.FunctionArn : ""
    }
}