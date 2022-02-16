import fs from 'fs';
import YAML from 'yaml'
import { Project, Region, RegionObj, Regions, Settings } from '../../@types';
import { createBucketName } from '../../helper/setup';
import { missingCredentials, missingRegion, missingSettings } from '../error';
import { syncFunctionsToProject, syncProjectToFunctions } from '../functions';
import { readFile, writeFile } from '../utils';

export const loadProject = async (): Promise<Project> => {
    const [project, settings] = await Promise.all([getProject(), loadSettings()])
    const projectRegions = Object.values(project.regions).map((region) => region.region)
    for (let region of settings.regions) {
        if (!projectRegions.includes(region)) {
            project.regions[region] = {
                region,
                bucket: createBucketName(project.name, region)
            }
        }
    }
    project.settings = settings
    return await syncFunctionsToProject(project)
}

const projectPath = `${process.cwd()}/.lambda.yaml`

const getProject = async (): Promise<Project> => {
    if (!fs.existsSync(projectPath)) {
        missingSettings()
    }
    return YAML.parse(await readFile(projectPath))
}

export const parseProject = (data: string): Project => {
    const project: Project = YAML.parse(data)
    return project;
}

export const saveProject = async (project: Project) => {
    await syncProjectToFunctions(project);
    fs.writeFileSync(`${project.projectPath}/.lambda.yaml`, YAML.stringify(project))
}

const configPath = `${process.cwd()}/settings.yaml`

export const loadSettings = async (): Promise<Settings> => {
    if (!fs.existsSync(configPath)) {
        missingSettings()
    }
    return YAML.parse(await readFile(configPath))
}

export const saveSettings = async (settings: Settings): Promise<void> => {
    const data = YAML.stringify(settings)
    return writeFile(configPath, data)
}

export const getCredentials = (project: Project) => {
    if (!project.credentials) return missingCredentials()
    return project.credentials
}


export const getRegionObject = (region: Region, regions: Regions): RegionObj => {
    const regionObj = regions[region]
    if (!regionObj) return missingRegion(`${region} is missing in ${regions}`)
    return regionObj
}