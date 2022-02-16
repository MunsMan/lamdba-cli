import { createSpinner } from "nanospinner";
import { Credentials, Fn, RegionObj } from "../../@types";
import { uploadLambdaAWS, uploadFunctionS3 } from "../deploy";
import { missingRoles } from "../error";

interface Props {
    region: RegionObj,
    credentials: Credentials
    functions?: Fn[],
    globalRole?: string,
}

export const deployFunctions = async (props: Props): Promise<void> => {
    const { region, functions, globalRole, credentials } = props
    if (!functions) return
    if (globalRole) {
        functions.forEach((fn: Fn) => (fn.config.Properties.Role = fn.config.Properties.Role ? fn.config.Properties.Role : globalRole))
    }
    if (functions.find((fn) => (!fn.config.Properties.Role)) !== undefined) {
        return missingRoles()
    }
    await Promise.all(functions.map(async (value) => {
        const spinner = createSpinner()
        spinner.start({ text: `Uploading Package 📡 - ${value.name} to S3 📁` })
        await uploadFunctionS3(value, region, credentials)
        spinner.success({ text: `Upload finished 💽`, mark: "✔" })
    }))
    await Promise.all(functions.map(async (fn: Fn) => {
        const arn = await uploadLambdaAWS(fn, region, credentials)
        if (!fn.config.ARN) {
            fn.config.ARN = {}
        }
        fn.config.ARN[region.region] = arn;
    }))

    return

} 