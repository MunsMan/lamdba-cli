import { LoggingConfiguration } from "@aws-sdk/client-sfn";
import { configureStepFunctionTask, filterZipUpload } from "."
import { Credentials, FnWorkflow, Region, Regions, Resource, Stepfunction } from "../../@types";
import { uploadAwsStepfunction } from "../aws";
import { uploadLambdaAWS, uploadFunctionS3 } from "../deploy"
import { getRegionObject } from "../project";

export const deployCode = async (
    workflows: FnWorkflow[][],
    regions: Regions,
    credentials: Credentials
) => {
    const zipUploads: FnWorkflow[] = filterZipUpload(workflows.flat());
    await Promise.all(
        zipUploads.map(async (fnr) =>
            console.log(await uploadFunctionS3(fnr, getRegionObject(fnr.region, regions), credentials))
        )
    );
}

export const deployWorkflowsFunctions = (
    wfns: FnWorkflow[],
    regions: Regions,
    credentials: Credentials
): Promise<Resource[]> => (
    Promise.all(wfns.map(async (wfn) => {
        const region = getRegionObject(wfn.region, regions)
        wfn = renameFunctions(wfn)
        return {
            name: wfn.name,
            arn: await uploadLambdaAWS(wfn, region, credentials)
        }
    }))
)

export const configureWorkflowFunctions = (
    wfns: FnWorkflow[]
): FnWorkflow[] => (
    wfns.map((wfn) => (renameFunctions(wfn)))
)

const renameFunctions = (wfn: FnWorkflow): FnWorkflow => {
    wfn.config.Properties.FunctionName = `${wfn.task}-${wfn.region}-${wfn.name}`
    return wfn
}

interface DeployStepfunctionWorkflowInput {
    workflow: {
        name: string;
        region: Region;
        role: string;
    };
    stepfunction: Stepfunction;
    resources: Resource[];
    credentials: Credentials;
    logConfig: LoggingConfiguration;
}

export const deployStepfuntionWorkflow = async ({
    workflow: {
        name, region, role
    },
    stepfunction,
    resources,
    credentials,
    logConfig
}: DeployStepfunctionWorkflowInput): Promise<Resource> => {
    const definition = await configureStepFunctionTask(stepfunction, resources, name)
    stepfunction.config
    const arn = await uploadAwsStepfunction({
        region, credentials, sfn: {
            name,
            role,
            definition
        },
        logConfig
    })
    return {
        arn, name
    }
}