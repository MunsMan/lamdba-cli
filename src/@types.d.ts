import { LogGroup } from "@aws-sdk/client-cloudwatch-logs";
import { LoggingConfiguration } from "@aws-sdk/client-sfn";

type Region = "us-east-1" | "us-west-2"
interface Project {
    name: string;
    projectPath: string;
    credentials?: Credentials;
    functions?: Fn[];
    stepfunctions?: Stepfunction[]
    settings: Settings;
    regions: Regions
}

interface Regions {
    "us-east-1"?: RegionObj,
    "us-west-2"?: RegionObj
}

interface RegionObj {
    region: Region;
    bucket: string;
}

type Runtime = "TypeScript"

type FnRuntime = "nodejs14.x" | "nodejs12.x"


interface Fn extends Structur {
    runtime: Runtime;
    config: FnConfig;
}

interface Stepfunction extends Structur {
    config: SFNSettings;
    fileext: string;
}

interface Structur {
    name: string;
    settingsName: string;
    src: string;
    build: string;
    rootDir: string;
    dest: string;
}

interface Credentials {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    sessionToken?: string;
}

interface FnConfig {
    Type: "AWS::Lambda::Function",
    ARN?: { [RegionObj: string]: string }
    Properties: AWSLambdaProperties
}

interface AWSLambdaProperties {
    Architectures: AwsArchitectures[],
    Code?: AwsCode,
    CodeSigningConfigArn?: string,
    DeadLetterConfig?: { TargetArn: string },
    Description?: string,
    Environment?: AwsEnvironment,
    FileSystemConfigs?: AwsFileSystemConfig[],
    FunctionName: string,
    Handler: string,
    ImageConfig?: AwsImageConfig,
    KmsKeyArn?: string,
    Layers?: string[],
    MemorySize: number,
    PackageType: "Image" | "Zip",
    ReservedConcurrentExecutions?: number,
    Role?: string,
    Runtime: string,
    Tags?: { [key: string]: string },
    Timeout: Integer,
    TracingConfig?: { Mode: "Active" | "PassThrough" },
    VpcConfig: VpcConfig
}

interface SFNSettings {
    name: string;
    roleArn?: string;
    type: "EXPRESS" | "STANDARD";
    ARN?: {
        [RegionObj: string]: string
    }
}

type AwsArchitectures = "x86_64" | "arm64"

type AwsCode = AwsS3Upload //| { ZipFile: Uint8Array }

interface AwsS3Upload {
    S3Bucket: string
    S3Key: string
    S3ObjectVersion?: string
}

interface AwsEnvironment {
    Variables: { [key: string]: string }
}

interface AwsFileSystemConfig {
    Arn: string,
    LocalMountPath: string
}

interface AwsImageConfig {
    Command: string[];
    EntryPoint: string[];
    WorkingDirectory: string
}

type AwsRuntime = "dotnetcore1.0"
    | "dotnetcore2.0"
    | "dotnetcore2.1"
    | "dotnetcore3.1"
    | "go1.x"
    | "java11"
    | "java8"
    | "java8.al2"
    | "nodejs"
    | "nodejs10.x"
    | "nodejs12.x"
    | "nodejs14.x"
    | "nodejs4.3"
    | "nodejs4.3-edge"
    | "nodejs6.10"
    | "nodejs8.10"
    | "provided"
    | "provided.al2"
    | "python2.7"
    | "python3.6"
    | "python3.7"
    | "python3.8"
    | "python3.9"
    | "ruby2.5"
    | "ruby2.7"


interface AwsVpcConfig {
    SecurityGroupIds: string[];
    SubnetIds: string[]
}

interface Settings {
    regions: Region[];
    role?: string;
    jobs?: [];
    execution?: Task[]
}

interface Task {
    name: string;
    workflow: string;
    region: Region;
    output: string;
    repetitions?: number;
    multiplyMemorySize?: number;
    payload?: string
}

interface FnWorkflow extends Fn {
    region: Region;
    task: string;
    ARN?: string
}

interface TaskRunner {
    name: string;
    runnable: Runnable[]
}

interface TaskBuild {
    name: string
    region: Region,
    payload?: string,
    output: string,
    workflow: string,
    workflowFunctions: FnWorkflow[],
    multiplyMemorySize: number;
    repetitions: number;
}

interface Runnable {
    name: string
    region: Region;
    workflow: Resource
    resources: Resource[];
    payload: string;
    output: string;
    logger: LogGroup;
    repetitions: number;
}

interface Resource {
    name: string;
    arn: string
}

interface TaskSuccededEvent extends LogEvent {
    type: "TaskSucceeded";
    execution_arn: string
}

interface TaskScheduledEvent extends LogEvent {
    type: "TaskScheduled",
    details: {
        parameters: string,
        region: string,
    }
}

interface LogEvent {
    id: string;
    type: string;
    details: {
        roleArn?: string;
        name?: string;
        parameters?: string;
        region?: string;
        resource?: string;
        resourceType?: string;
        length?: string;
        index?: string;
    };
    execution_arn: string;
    previous_event_id: string;
    event_timestamp: string;
}

interface RuntimeLog {
    functionName: string;
    startUpTime: number;
    executionTime: number;
}


interface FormatedLogEvents {
    [functionName: string]: {
        startUpTime: TimeFormat;
        executionTime: TimeFormat;
    }
}

interface ExecutionLog {
    workflow: {
        executionTime: number;
        region: Region;
    };
    functions: FormatedLogEvents
}

interface TimeFormat {
    min: number;
    max: number;
    average: number;
    times: number[];
    executions: number;
}
