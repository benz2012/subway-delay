const fs = require('fs')
const setValue = require('set-value')

const times = require('./times')
const { prevStop, nextStop } = require('./stops')

const DELTA_DATA_FILE = './deltas.json'
const timeData = {}

module.exports.parse = (message) => (
  message.entity
    .filter(entity => entity.hasOwnProperty('vehicle'))
    .map((entity) => {
      const { trip, currentStatus, stopId, timestamp } = entity.vehicle
      const { routeId, tripId } = trip
      return ({
        routeId,
        stopId,
        status: currentStatus,
        tripId,
        timestamp,
      })
    })
    .reduce((accum, curr) => {
      accum[curr.tripId] = curr
      delete accum[curr.tripId].tripId
      return accum
    }, {})
)

module.exports.evaluate = (prev, curr) => {
  if (prev.stopId === curr.stopId) {
    if (prev.status !== 'STOPPED_AT' && curr.status === 'STOPPED_AT') {
      // Train was approaching a station and has now stopped at that station
      // End the current station-trip timer and start the next one
      stopCurrentStartNext(curr)
    }
  } else if (prev.stopId === prevStop(curr.stopId)) {
    if (prev.status !== 'STOPPED_AT') {
      // current station-trip timer was never ended and we are now approaching
      // the next station. interpolate when the train was at that station
    }
    if (curr.status === 'STOPPED_AT') {
      // the `next` station-trip timer is already finished as well
      stopCurrentStartNext(curr)
    }
  } else {
    console.log(`
    ANOMMALY
    STOP IDS: ${prev.stopId} -> ${curr.stopId}
    STATUSES: ${prev.status} -> ${curr.status}`)
  }
  return
}

const stopCurrentStartNext = (vehicle) => {
  const { stopId, tripId, timestamp } = vehicle
  stopTimer(prevStop(stopId), stopId, tripId, timestamp)
  startTimer(stopId, nextStop(stopId), tripId, timestamp)
}

const startTimer = (from, to, tripId, timestamp) => {
  setValue(timeData, `${from}.${to}.${tripId}.start`, timestamp)
  return
}

const stopTimer = (from, to, tripId, timestamp) => {
  let start
  const end = timestamp

  try {
    // Only save the data if the timer was started
    start = timeData[from][to][tripId].start
    save(from, to, start, end)
  } catch (exception) {
    if (exception.constructor.name !== 'TypeError') {
      // If start is missing, exception should only be a TypeError
      throw exception
    }
  }
}

const save = (from, to, start, end) => {
  const delta = parseInt(end) - parseInt(start)

  fs.readFile(DELTA_DATA_FILE, 'utf8', (err, data) => {
    if (err) {
      console.log(err)
    } else {
      obj = JSON.parse(data)
      setValue(obj, `${from}.${to}.${start}`, delta)

      json = JSON.stringify(obj)
      fs.writeFile(DELTA_DATA_FILE, json, 'utf8')
    }
  })
}
