const csv = require('csv-parser')
const fs = require('fs')
const setValue = require('set-value')

let stopData = []

// TODO: Handle Terminals

// Load all stop data on module import
fs.createReadStream('./static_data/stops.csv')
  .pipe(csv())
  .on('data', (data) => stopData.push(data))
  .on('end', () => {
    stopData = stopData
      .filter((stop) => stop.parent_station !== '')
      .reduce((accum, curr, idx, arr) => {
        const station = curr.parent_station
        if (accum[station] === undefined) {
          accum[station] = {}
          if (idx > 2) {
            accum[station].before = arr[idx - 2].parent_station
          }
          if (idx < arr.length - 2) {
            accum[station].after = arr[idx + 2].parent_station
          }
          accum[station].ids = [curr.stop_id]
        } else {
          accum[station].ids.push(curr.stop_id)
        }
        return accum
      }, {})
    console.log('Stop Data Loaded!')
  })

const groupFromStopId = (stopId) => (
  stopData[stopId.substring(0, stopId.length - 1)]
)

const stopIdFromParent = (parent, direction) => (
  stopData[parent].ids
    .filter((id) => (
      id.substring(id.length - 1) === direction
    ))[0]
)

module.exports.prevStop = (stopId) => {
  const group = groupFromStopId(stopId)
  const direction = stopId.substring(stopId.length - 1)
  const nextParent = direction == 'N' ? group.after : group.before
  return stopIdFromParent(nextParent, direction)
}

module.exports.nextStop = (stopId) => {
  const group = groupFromStopId(stopId)
  const direction = stopId.substring(stopId.length - 1)
  const nextParent = direction == 'N' ? group.before : group.after
  return stopIdFromParent(nextParent, direction)
}
