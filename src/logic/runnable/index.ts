import fs from "fs"
import { executionFailed, missingRunnable, noLogsFound } from "../error"
import { readFile, sleep, writeFile } from "../utils"
import YAML from 'yaml'
import { decribeExecutionAWS as describeExecutionAWS, executeAwsStepfunction, getExecutionHistory } from "../aws"
import { DescribeExecutionCommandOutput, HistoryEvent, TaskStartedEventDetails } from "@aws-sdk/client-sfn"
import { Credentials, LogEvent, Runnable, ExecutionLog } from "../../@types"
import { getLogs, getLogStream } from "../log"
import { CloudWatchLogs, LogStream, OutputLogEvent } from "@aws-sdk/client-cloudwatch-logs"
import { createReport } from "../report"
import { createSpinner } from "nanospinner"

export const getRunnable = async (name: string): Promise<Runnable> => {
    const filepath = `${process.cwd()}/runnable/${name}.yaml`
    if (!fs.existsSync(filepath)) return missingRunnable(name)
    return YAML.parse(await readFile(filepath))
}

export const executeRunnable = async (runnable: Runnable, credentials: Credentials) => {
    const logStreams: {
        startTime: Date,
        logStream: LogStream
    }[] = []
    const region = runnable.region;
    const cloudWatchClient = new CloudWatchLogs({ region, ...credentials })
    console.log(`Start Execution 🏁 `)
    for (let i = 0; i < runnable.repetitions; i++) {
        const executionResult = await executeAwsStepfunction({
            arn: runnable.workflow.arn,
            payload: runnable.payload,
            credentials
        })
        const executionArn = executionResult.executionArn!
        const { startTime } = await awaitExecution(executionArn, credentials, runnable.name, i)
        logStreams.push({
            startTime,
            logStream: await getLogStream(
                runnable.logger.logGroupName!,
                cloudWatchClient,
                logStreams.map(x => x.logStream))
        })
    }
    console.log("Creating Output 📋✍ ")
    const logs = await Promise.all(logStreams.reverse().map(async (stream) => (
        await getLogs(stream.startTime, runnable.logger, stream.logStream, runnable.region, credentials)
    )))
    await saveData(runnable.output, await Promise.all(logs))
    console.log(`Check out your data📝 ➡ ${runnable.output}`)
}

const saveData = (output: string, eventsList: OutputLogEvent[][]) => {
    const logs = eventsList.reduce<{
        [execution: string]: ExecutionLog
    }>((result, events, index) => {
        if (!events) return noLogsFound();
        const log = createReport(events.map((event) => (JSON.parse(event.message!) as LogEvent)))
        result[`run${index}`] = log
        return result
    }, {})
    return writeFile(output, JSON.stringify(logs, null, '\t'))
}

interface ExecutionOutput {
    startTime: Date,
    endTime: Date,
    duration: number
}

const awaitExecution = async (executionArn: string, credentials: Credentials, taskName: string, repetition: number = 1): Promise<ExecutionOutput> => {
    let response: DescribeExecutionCommandOutput = await describeExecutionAWS({ executionArn, credentials })
    const startDate = response.startDate!
    let status = response.status
    const spinner = createSpinner(`Task: ${taskName}:${repetition} - Running 🏃 `, {})
    while (status === 'RUNNING') {
        spinner.start()
        response = (await describeExecutionAWS({ executionArn, credentials }))
        status = response.status
        sleep(1500)
    }
    if (status === "SUCCEEDED") {
        const execTimeMs = response.stopDate!.getTime() - startDate.getTime()
        spinner.success({
            text: `${taskName}:${repetition} Succeeded 🙋 👍 😄 - finished in ${Math.floor(execTimeMs / 1000)}s ${execTimeMs % 1000}ms`, mark: "✅"
        })
        return {
            startTime: startDate,
            endTime: response.stopDate!,
            duration: execTimeMs
        }
    } else {
        spinner.error({ text: 'Something went wrong', mark: "❌ " })
        return executionFailed(executionArn)
    }
}

interface Event {
    timestamp: Date,
    type: {
        name: "TaskStart",
        data: TaskStartedEventDetails
    } | {
        name: "TaskSucceeded",
        data: {
            output: {

            },

        }
    } | {

    }
}

const filterHistoryEvent = (historyEvent: HistoryEvent): Event | undefined => {
    if (historyEvent.taskStartedEventDetails) {
        return {
            timestamp: historyEvent.timestamp!, type: {
                name: "TaskStart", data: historyEvent.taskStartedEventDetails
            }
        }
    }
    if (historyEvent.taskSucceededEventDetails) {
        return {
            timestamp: historyEvent.timestamp!, type: {
                name: "TaskSucceeded", data: historyEvent.taskSucceededEventDetails
            }
        }
    }
    return
}

export const getEvents = async (executionArn: string, credentials: Credentials): Promise<Event[]> => {
    let { events: historyEvents, nextToken } = await getExecutionHistory({
        executionArn, credentials
    })
    if (!historyEvents) return []
    while (nextToken) {
        const response = await getExecutionHistory({ executionArn, credentials, nextToken })
        const nextHistoryEvent = response.events ? response.events : []
        historyEvents.push(...nextHistoryEvent)
        nextToken = response.nextToken
    }
    const events: Event[] = historyEvents.reduce<Event[]>((result, current) => {
        const event = filterHistoryEvent(current)
        if (event) {
            result.push(event)
        }
        return result
    }, [])
    return events
}