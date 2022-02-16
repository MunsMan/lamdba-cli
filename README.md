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

### `lambda init`

Initalizing the project.

Options:
- name : *optinal* otherwise the directory name will be used as the name
- profile: *optional* can be configured later
- region: **default: us-east-1** AWS region
