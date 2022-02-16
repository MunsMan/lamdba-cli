import fs from "fs";
import { ChildProcess, exec, execSync } from 'child_process'
import path from "path";
import { mkdir } from "../../helper/setup";
import { event, index, tsconfig } from '../../assets/functions'
import { writeFile } from "fs/promises";
import YAML from 'yaml'
import archiver from 'archiver'
import { saveFunctionConfig } from "../../helper/function";
import { buildFailed } from "../error";
import { Fn, Project } from "../../@types";

export const syncFunctionsToProject = async (project: Project): Promise<Project> => {
    if (project.functions) {
        // const fns = await Promise.all(project.functions.map( async (fn: Fn) => {
        //     fn.config = await loadFunctionConfig(fn)
        //     return fn
        // }))
        // project.functions = fns;
    }
    return project
}

export const syncProjectToFunctions = (project: Project) => {
    if (project.functions) {
        return Promise.all(project.functions.map((fn: Fn) => (saveFunctionConfig(fn))))
    }
    return
}

export const getFunctionNames = (project: Project): String[] => {
    return project.functions ? project.functions.map((value) => (value.name)) : []
}

export const createFunctionWorkspace = async (fn: Fn): Promise<Fn> => {
    switch (fn.runtime) {
        case ("TypeScript"): {
            return await createTypeScriptWorkspace(fn);
        }
    }
}

const createTypeScriptWorkspace = async (fn: Fn): Promise<Fn> => {
    const { name } = fn;
    fn.build = "build"
    fn.src = "src"
    createFunctionFolder();
    setupProject(name);
    await installDep(name)
    await Promise.all([updateYarnPackage(name), setupTSC(name), setupDefaultTypeScript(name), addFunctionConfig(fn)])
    return fn
}

const createFunctionFolder = () => {
    const name = "functions"
    mkdir(name)
}

const setupTSC = (name: string): Promise<void> => {
    const promise: Promise<void> = new Promise((resolve) => (
        fs.writeFile(`${process.cwd()}/functions/${name}/tsconfig.json`, tsconfig, () => { resolve() })
    ))
    return promise;
}

const setupProject = (name: string): void => {
    mkdir(`functions/${name}`)
}

const installDep = async (name: string): Promise<ChildProcess[]> => {
    const cwdFn = path.normalize(`${process.cwd()}/functions/${name}`)
    execSync('yarn init -y', { cwd: cwdFn, stdio: Array(0) })
    return Promise.all([
        exec('yarn add -D typescript', { cwd: cwdFn }),
        exec('yarn add -D @types/node', { cwd: cwdFn }),
        exec('yarn add -D mocha', { cwd: cwdFn }),
        exec('yarn add -D chai', { cwd: cwdFn }),
        exec('yarn add -D ts-node', { cwd: cwdFn }),
        exec('yarn add -D  @types/chai', { cwd: cwdFn }),
        exec('yarn add -D  @types/mocha', { cwd: cwdFn })
    ])
}

const setupDefaultTypeScript = (name: string): Promise<void[]> => {
    mkdir(`functions/${name}/src`)
    const copyIndex: Promise<void> = new Promise((resolve) => {
        fs.writeFile(`${process.cwd()}/functions/${name}/src/index.ts`, index, () => { resolve() })
    })
    const copyEvent: Promise<void> = new Promise((resolve) => {
        fs.writeFile(`${process.cwd()}/functions/${name}/src/event.json`, event, () => { resolve() })
    })
    return Promise.all([copyEvent, copyIndex])
}

const updateYarnPackage = (name: string): Promise<void> => {
    const yarnPackage = JSON.parse(fs.readFileSync(`${process.cwd()}/functions/${name}/package.json`).toString())
    yarnPackage.name = name;
    yarnPackage.main = "index.ts"
    yarnPackage.scripts = {
        build: `npx tsc`,
        test: 'mocha -r ts-node/register tests/'
    }
    return new Promise((resolve) => {
        const data = JSON.stringify(yarnPackage)
        fs.writeFile(`${process.cwd()}/functions/${name}/package.json`, data, () => (resolve()))
    })
}

export const deleteFunction = (name: string) => {
    fs.rmSync(path.normalize(`functions/${name}`), { recursive: true })
}

export const buildFn = async (fn: Fn) => {
    switch (fn.runtime) {
        case "TypeScript":
            return buildTypeScript(fn)
    }

}

const buildTypeScript = async (fn: Fn) => {
    try {
        execSync('yarn run build', { cwd: path.normalize(`${process.cwd()}/${fn.rootDir}`) }).toString()
    } catch (e) {
        return buildFailed(e as string)
    }
    return await zipProjectNode(fn);
}

const addFunctionConfig = async (fn: Fn) => {
    await writeFile(`${process.cwd()}/${fn.rootDir}/function.yaml`, YAML.stringify(fn.config))
}

const zipProjectNode = async (fn: Fn): Promise<void> => {
    return new Promise((resolve, reject) => {
        mkdir(`${process.cwd()}/${fn.rootDir}/${fn.dest}`)
        const output = fs.createWriteStream(`${process.cwd()}/${fn.rootDir}/${fn.dest}/${fn.name}.zip`)
        const archive = archiver('zip')
        output.on('close', () => {
            console.log(`${fn.name} zipped -> ${archive.pointer()} total bytes`);
            resolve()
        });
        archive.on('error', function (err) {
            reject(err)
        });
        archive.pipe(output)
        archive.directory(`${process.cwd()}/${fn.rootDir}/${fn.build}/`, false)
        archive.directory(`${process.cwd()}/${fn.rootDir}/node_modules/`, 'node_modules')
        archive.finalize()
    })
}