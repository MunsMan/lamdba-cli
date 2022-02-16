#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

yargs(hideBin(process.argv)).commandDir('commands', {recurse: true}).demandCommand().strict().alias({h: 'help'}).argv;