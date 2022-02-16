import { configureFunctionArn } from ".";
import { Credentials, Fn, RegionObj, Stepfunction } from "../../@types";
import { uploadAwsStepfunctions } from "../aws"
import { missingRoles } from "../error"

interface Props {
    region: RegionObj;
    credentials: Credentials;
    stepfunctions?: Stepfunction[];
    functions?: Fn[]
    globalRole?: string;
}

export const deployStepfuntion = async (props: Props) => {
    const { region, stepfunctions, globalRole, credentials, functions } = props
    if (!stepfunctions) return
    if (globalRole) {
        stepfunctions.forEach((sfn) => sfn.config.roleArn = sfn.config.roleArn ? sfn.config.roleArn : globalRole)
    }
    if (stepfunctions.find((sfn) => (!sfn.config.roleArn)) !== undefined) {
        return missingRoles()
    }
    if (functions) {
        await Promise.all(stepfunctions.map(async stepfunction => await configureFunctionArn(region.region, stepfunction, functions)))
    }
    await Promise.all(stepfunctions.map(async (sfn) => await uploadAwsStepfunctions(sfn, region.region, credentials)))
    return
}