# lamdba-cli

A CLI Tool for building Lambda Functions in TypeScript and deploying workflows.

## How to install

Still in Version 0.8, so only build drom source is supported.

### Build from source

1. install dependencys\
  `yarn`
2. Compile TypeScript\
  `yarn run build`
3. Run command\
  `yarn run start <command>`

## How to use it

### Initalization

Initalizing the project.

**command:** `lambda init`

Options:

- region: `[string]` **default: us-east-1** - AWS region
- name : `[string]` - otherwise the directory name will be used as the name
- profile: `[string]` - can be configured later

### Adding Profile

Takes a specifyied profile from the `~/.aws` file and connects it with your project.

command: `lambda profile <profile>`

Positionals:

- `<profile>`: `[string]` the profile name

### Functions

A Submodule for managing lambda Functions.

#### Base Function

Just initalizes functions or returns a list of functions.

command: `lambda functions`

#### Add a Function

command: `lambda functions add <name>`

Positionals:

- `<name>`: `[string]` the name of the lambda function

Options:

- runtime: [`string`] **default: TypeScript** - other runtimes are not supported at the moment... If you want, feel free to support the project.

#### Remove a Function

command: `lambda functions remove <name>`

Positionals:

- `<name>`: `[string]` the name of the lambda function

#### Build Functions

Command to build all functions and creates Zip files for deployment.

command: `lambda functions build`
