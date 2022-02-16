import { CloudWatchLogs, LogGroup, LogStream, OutputLogEvent } from '@aws-sdk/client-cloudwatch-logs'
import { Credentials, Region } from '../../@types'
import { noLogsFound, unableToCreateCloudWatchGroup } from '../error'
import { sleep } from '../utils'

export const getLogGroup = async (
    region: Region,
    name: string,
    credentials: Credentials
): Promise<LogGroup> => {
    const client = new CloudWatchLogs({ region, ...credentials })
    let logGroup = await findLogGroup(name, client)
    if (logGroup) return logGroup
    await client.createLogGroup({ logGroupName: name })
    logGroup = await findLogGroup(name, client)
    if (logGroup) return logGroup
    return unableToCreateCloudWatchGroup()
}


const findLogGroup = async (
    logGroupName: string,
    client: CloudWatchLogs
): Promise<LogGroup | undefined> => {
    const describeResponse = await client.describeLogGroups({
        logGroupNamePrefix: logGroupName
    })
    if (describeResponse.logGroups) {
        if (describeResponse.logGroups.length !== 1) {
            console.error(describeResponse.logGroups.map((lg) => lg.logGroupName).join(" "))
        } else {
            return describeResponse.logGroups[0]
        }
    }
    return
}

export const getLogStream = async (
    logGroupName: string,
    client: CloudWatchLogs,
    prevStreams: LogGroup[]
): Promise<LogStream> => {
    const requestLogStreams = async () => ((await client.describeLogStreams({
        logGroupName,
        orderBy: "LastEventTime",
        descending: true,
    })).logStreams)
    await sleep(300)
    for (let tries = 0; tries < 3; tries++) {
        const logStreams = await requestLogStreams()
        if (!logStreams) continue
        const logStream = logStreams[0]
        if (!prevStreams.includes(logStream)) {
            return logStream
        }
    }
    return noLogsFound(logGroupName, true)
}

export const getLogs = async (startTime: Date, logGroup: LogGroup, logStream: LogStream, region: Region, credentials: Credentials): Promise<OutputLogEvent[]> => {
    const client = new CloudWatchLogs({ region, ...credentials })
    const requester = (token?: string) => client.getLogEvents({ logGroupName: logGroup.logGroupName, logStreamName: logStream.logStreamName, nextToken: token })
    const logs = []
    await sleep(500)
    let { events, nextBackwardToken } = await client.getLogEvents({
        startTime: startTime.getTime(), logGroupName: logGroup.logGroupName, logStreamName: logStream.logStreamName,
    })
    if (events) {
        logs.push(...events)
    }
    while (nextBackwardToken) {
        const response = await requester(nextBackwardToken)
        nextBackwardToken = response.nextBackwardToken
        if (response.events) {
            logs.push(...response.events)
        }
        if (response.nextBackwardToken === nextBackwardToken) {
            break
        }
    }
    return logs
}
