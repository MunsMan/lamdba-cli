import { S3 } from '@aws-sdk/client-s3'
import fs, { ReadStream } from 'fs';
import { CreateFunctionCommandInput, CreateFunctionCommandOutput, Lambda, UpdateFunctionCodeCommandInput } from '@aws-sdk/client-lambda';
import { basename } from 'path';
import { DescribeExecutionCommandOutput, LoggingConfiguration, SFN, StateMachineListItem } from '@aws-sdk/client-sfn'
import { readFile } from '../utils'
import { missingRoles } from '../error';
import { parse } from '@aws-sdk/util-arn-parser'
import { AWSLambdaProperties, AwsS3Upload, Credentials, Region, RegionObj, Stepfunction } from '../../@types';

interface uploadStreamS3Input {
    Bucket: string;
    Key: string;
    credentials: Credentials,
    region: string
}

export const uploadFileS3 = (path: string, s3Config: AwsS3Upload, region: string, credentials: Credentials): Promise<string> => {
    const { S3Bucket: Bucket, S3Key: Key } = s3Config;
    const uploader = uploadStream({ Bucket, Key, credentials, region })
    const readStream = fs.createReadStream(path)
    const response = uploader(readStream)
    return new Promise((resolve, reject) => {
        response.then(() => resolve(`${region}: ${basename(path)} -> ${Bucket}/${Key} - finished`)).catch((error: Error) => reject(`Upload Failed: ${error}`))
        readStream.on('error', (err) => {
            reject(`Upload failed: ${err}`)
        })
    })
}

const uploadStream = ({ Bucket, Key, credentials, region }: uploadStreamS3Input) => {
    const s3 = new S3({ ...credentials, region });
    return (stream: ReadStream) =>
        s3.putObject({
            Bucket, Key, Body: stream
        })
}

interface CreateLambdaProps {
    regionObj: RegionObj;
    s3name: string;
    credentials: Credentials;
    properties: AWSLambdaProperties
}

export const createAwsLambda = ({ regionObj: { region, bucket }, s3name, credentials, properties }: CreateLambdaProps): Promise<CreateFunctionCommandOutput> => {
    const lambda = new Lambda({ region, ...credentials })
    const key = `${region}-${s3name}.zip`
    const createLambdaInput: CreateFunctionCommandInput = {
        ...properties,
        FunctionName: properties.FunctionName,
        Role: properties.Role,
        Code: {
            S3Bucket: bucket,
            S3Key: key
        },
    }
    return lambda.createFunction(createLambdaInput)
}

// ToDo: Add update for Function Settings
export const updateAwsLambda = ({ regionObj: { region, bucket }, s3name, credentials, properties }: CreateLambdaProps): Promise<CreateFunctionCommandOutput> => {
    const lambda = new Lambda({ region, ...credentials })
    const key = `${region}-${s3name}.zip`
    const createLambdaInput: UpdateFunctionCodeCommandInput = {
        S3Bucket: bucket,
        S3Key: key,
        FunctionName: properties.FunctionName,
        Architectures: properties.Architectures
    }
    return lambda.updateFunctionCode(createLambdaInput)
}

export const existsBucket = async (regionObj: RegionObj, credentials: Credentials): Promise<boolean> => {
    const { region, bucket } = regionObj;
    const s3 = new S3({ ...credentials, region })
    const response = await s3.listBuckets({})
    return response.Buckets?.find((value) => value.Name === bucket) !== undefined
}

export const createBucket = async (regionObj: RegionObj, credentials: Credentials): Promise<void> => {
    const { region, bucket } = regionObj;
    const s3 = new S3({ ...credentials, region })
    await s3.createBucket({ Bucket: bucket })
}

export const existsAwsLambda = async (name: string, credentials: Credentials, region: string): Promise<string> => {
    const lambda = new Lambda({ region, ...credentials })
    const list = await lambda.listFunctions({})
    if (!list.Functions) {
        return ""
    }
    const match = list.Functions.find((value) => value.FunctionName === name)
    return match ? (match.FunctionArn ? match.FunctionArn : "") : ""
}

export const uploadAwsStepfunctions = async (sfn: Stepfunction, region: Region, credentials: Credentials) => {
    const definition = await readFile(`${process.cwd()}/${sfn.rootDir}/${sfn.dest}/${region}-${sfn.name}${sfn.fileext}`)
    if (!sfn.config.roleArn) {
        return missingRoles(`Stepfunction: ${sfn.name} in ${sfn.settingsName}`);
    }
    const response = await uploadAwsStepfunction({
        region, credentials, sfn: {
            name: sfn.name,
            role: sfn.config.roleArn,
            definition
        }
    })
    if (!sfn.config.ARN) {
        sfn.config.ARN = {}
    }
    sfn.config.ARN[region] = response
    return
}

interface UploadAWSStepfunctionInput {
    region: Region,
    credentials: Credentials,
    sfn: {
        name: string;
        role: string;
        definition: string
    },
    logConfig?: LoggingConfiguration
}

export const uploadAwsStepfunction = async ({ region, credentials, sfn, logConfig }: UploadAWSStepfunctionInput): Promise<string> => {
    const sfnClient = new SFN({ region, ...credentials })
    const { stateMachines: list } = await sfnClient.listStateMachines({})
    const cloudInstance = list?.find((value: StateMachineListItem) => ((region === parse(value.stateMachineArn!).region) && (value.name === sfn.name)))
    if (cloudInstance) {
        await sfnClient.updateStateMachine({
            stateMachineArn: cloudInstance.stateMachineArn,
            definition: sfn.definition,
            roleArn: sfn.role,
            loggingConfiguration: logConfig
        })
        return cloudInstance.stateMachineArn!
    }
    return (await sfnClient.createStateMachine({
        name: sfn.name,
        roleArn: sfn.role,
        definition: sfn.definition,
        loggingConfiguration: logConfig
    })).stateMachineArn!
}

interface ExecutionStepfunctionInput {
    arn: string,
    credentials: Credentials,
    payload: string,
}

export const executeAwsStepfunction = async ({ arn, credentials, payload }: ExecutionStepfunctionInput) => {
    const { region } = parse(arn)
    const sfnClient = new SFN({ region, ...credentials })
    const response = await sfnClient.startExecution({
        input: payload,
        stateMachineArn: arn
    })
    return response
}

interface DescribeExecutionInput {
    executionArn: string;
    credentials: Credentials
    nextToken?: string
}

export const decribeExecutionAWS = async ({ executionArn, credentials }: DescribeExecutionInput): Promise<DescribeExecutionCommandOutput> => {
    const { region } = parse(executionArn)
    const sfnClient = new SFN({ region, ...credentials })
    return sfnClient.describeExecution({ executionArn: executionArn })
}

export const getExecutionHistory = async ({ executionArn, credentials, nextToken }: DescribeExecutionInput) => {
    const { region } = parse(executionArn)
    const sfnClient = new SFN({ region, ...credentials })
    return sfnClient.getExecutionHistory({ executionArn, nextToken })
}