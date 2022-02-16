import { parse } from '@aws-sdk/util-arn-parser';
import { ExecutionLog, FormatedLogEvents, LogEvent, Region, RuntimeLog, TaskScheduledEvent, TaskSuccededEvent } from '../../@types';
import { logNotFound } from '../error';


const createRuntimeLog = (taskSucceeded: TaskSuccededEvent, getById: (id: string) => LogEvent): RuntimeLog => {
    const taskStarted = getById(taskSucceeded.previous_event_id)
    const taskScheduled = getById(taskStarted.previous_event_id) as TaskScheduledEvent
    return {
        functionName: parse(JSON.parse(taskScheduled.details.parameters).FunctionName).resource.split("-").reverse()[0],
        startUpTime: parseInt(taskStarted.event_timestamp) - parseInt(taskScheduled.event_timestamp),
        executionTime: parseInt(taskSucceeded.event_timestamp) - parseInt(taskStarted.event_timestamp)
    }
}

const getById = (logs: LogEvent[], id: string) => {
    const nId: number = parseInt(id!)
    const log = logs[nId - 1]
    if (log.id === id) return log
    const findLog = logs.find((log) => log.id === id)
    if (!findLog) return logNotFound(nId)
    return findLog
}

const getSuccededEvents = (logs: LogEvent[]): TaskSuccededEvent[] => (
    logs.filter((event) => {
        return event.type === "TaskSucceeded"
    }) as TaskSuccededEvent[]
)

const getType = (type: string, logs: LogEvent[]): LogEvent => {
    const log: LogEvent = logs[0]
    if (log.type === type) return log
    const searchRes = logs.find((log) => (log.type === type))
    if (!searchRes) return logNotFound(-1, type)
    return searchRes
}

const getExecutionTime = (logs: LogEvent[]): number => {
    const start = getType("ExecutionStarted", logs)
    const end = getType("ExecutionSucceeded", logs.reverse())
    return parseInt(end.event_timestamp) - parseInt(start.event_timestamp)
}

const getRegion = (log: LogEvent): Region => (
    parse(log.execution_arn).region as Region
)

const formatRuntimeLog = (logs: RuntimeLog[]) => {
    const reduced: FormatedLogEvents = logs.reduce<FormatedLogEvents>((res, log) => {
        if (!res[log.functionName]) {
            res[log.functionName] = {
                startUpTime: {
                    min: 0,
                    max: 0,
                    average: 0,
                    times: [log.startUpTime],
                    executions: 0
                },
                executionTime: {
                    min: 0,
                    max: 0,
                    average: 0,
                    times: [log.executionTime],
                    executions: 0
                }
            }
        } else {
            res[log.functionName].executionTime.times.push(log.executionTime)
            res[log.functionName].startUpTime.times.push(log.startUpTime)
        }
        return res
    }, {})
    Object.keys(reduced).forEach((key: string) => {
        const executionTimes = reduced[key].executionTime.times
        reduced[key].executionTime.max = Math.max(...executionTimes)
        reduced[key].executionTime.min = Math.min(...executionTimes)
        reduced[key].executionTime.average = Math.ceil(executionTimes.reduce((res, x) => (res + x), 0) / executionTimes.length)
        reduced[key].executionTime.executions = executionTimes.length
        const startTimes = reduced[key].startUpTime.times
        reduced[key].startUpTime.max = Math.max(...startTimes)
        reduced[key].startUpTime.min = Math.min(...startTimes)
        reduced[key].startUpTime.average = Math.ceil(startTimes.reduce((res, x) => (res + x), 0) / startTimes.length)
        reduced[key].startUpTime.executions = startTimes.length

    })
    return reduced
}

export const createReport = (logs: LogEvent[]): ExecutionLog => {
    const getter = (id: string) => getById(logs, id)
    const res = getSuccededEvents(logs).map((succededEvent) => createRuntimeLog(succededEvent, getter))
    const workflow = { executionTime: getExecutionTime(logs), region: getRegion(logs[0]) }
    return { workflow, functions: formatRuntimeLog(res) }
}