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
      console.log('Request Error\n', error)
      return
    }

    if (response.statusCode !== 200) {
      console.log(`Bad Response Code ${response.statusCode}\n`)
      return
    }

    const currMessage = JSON.parse(JSON.stringify(
      FeedMessage.decode(body)
    ))

    if (prevMessage === undefined) {
      console.log('First Message Received.')
      prevMessage = currMessage
    }

    if (JSON.stringify(prevMessage) !== JSON.stringify(currMessage)) {
      console.log('New Message Received.')
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
