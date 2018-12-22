'use strict'

const request = require('request')
const protobuf = require('protobufjs')

const { parse, evaluate } = require('./data')

// load protobuf message complier
let FeedMessage
protobuf.load('nyct-subway.proto').then((protoRoot) => {
  FeedMessage = protoRoot.lookupType('transit_realtime.FeedMessage')
})

// Get MTA Data
const options = {
  uri: `http://datamine.mta.info/mta_esi.php?key=${process.env.MTA_KEY}&feed_id=1`,
  encoding: null,
}
let prevMessage
const fetchFeed = () => {
  request(options, (error, response, body) => {
    if (error) {
      console.log(error)
      return
    }

    const currMessage = FeedMessage.decode(body)

    if (
      prevMessage !== undefined &&
      JSON.stringify(prevMessage) !== JSON.stringify(currMessage)
    ) {
      subwayDelay(prevMessage, currMessage)
      prevMessage = currMessage
    }
  })
}

// Main Function - Message Handler
const subwayDelay = (prevMessage, currMessage) => {
  // loop over trips in current message & evaluate their relation to the previous message
  const prevVehicles = parse(prevMessage)
  const currVehicles = parse(currMessage)
  Object.keys(currVehicles).forEach((tripId) => {
    const prev = prevVehicles[tripId]
    if (prev !== undefined) {
      const curr = currVehicles[tripId]
      evaluate(prev, curr)
    }
  })
}

// Scheduler & Clock
const scheduler = () => {
  fetchFeed()
}
// 10 Seconds
setInterval(scheduler, 10000)
