import { Lambda } from "@aws-sdk/client-lambda"
import { parse } from "@aws-sdk/util-arn-parser"
import { Credentials } from "../../@types"
import { existsAwsLambda } from "../aws"

export const deleteAwsLambda = async (arn: string, credentials: Credentials): Promise<string> => {
    const region = parse(arn).region
    const lambda = new Lambda({ region })
    const name = await existsAwsLambda(arn, credentials, region)
    if (name !== "") {
        await lambda.deleteFunction({ FunctionName: arn })
        return "deleted"
    }
    return "error"

}