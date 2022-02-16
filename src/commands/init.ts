import path from 'path';
import { Arguments, CommandBuilder } from 'yargs';
import { loadProfile } from '../helper/profile';
import { saveProject, saveSettings } from '../logic/project';
import { createBucketName } from '../helper/setup';
import { Project, Region, Settings } from '../@types';
import { createSpinner } from 'nanospinner';

type Options = {
    region: string
    name: string | undefined
    profile: string | undefined
}


export const command: string = 'init'
export const desc: string = 'Init function for a lambda Project'

export const builder: CommandBuilder<Options, Options> = (yargs) => (
    yargs.options({
        name: { type: 'string' },
        profile: { type: 'string' },
        region: { type: 'string', hoices: ["us-east-1", "us-west-2"], default: "us-east-1" }
    })
)

export const handler = async (argv: Arguments<Options>): Promise<void> => {
    let { name, profile, region } = argv
    if (!name) {
        const s = process.cwd().split(path.sep)
        name = s[s.length - 1]
    }
    const settings: Settings = {
        regions: [region as Region]
    }
    const regions = {
        [region]: {
            region: region,
            bucket: createBucketName(name, region)
        }
    };
    const project: Project = {
        name: name,
        projectPath: process.cwd(),
        regions,
        settings
    }
    if (profile) {
        project.credentials = loadProfile(profile)
    }
    const spinner = createSpinner()
    spinner.start({ text: `initializing Project` })
    await saveSettings(settings)
    await saveProject(project)
    spinner.success({ text: "Project initialized 😄", mark: "✔" })
    if (profile) {
        console.log(`User connected: ${profile} 🧍`)
    }
    process.exit(0)
}