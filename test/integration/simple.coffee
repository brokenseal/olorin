olorin = require('../../src/olorin')
connection = require('../../src/connection')
events = require('../../src/events')

hub = new olorin.Hub(
  new connection.Connection(),
  new events.ExperimentalProxyEventManager()
)
myo = hub.create()

myo.on('pose', (event) ->
  console.log('pose', event)
)
myo.on('slap_left', (event, eventData) ->
  console.log('SLAP!!', event, eventData)
  myo.vibrate()
)
myo.on('double_tap', (event, eventData) ->
  console.log('double tap', event, eventData)
  myo.vibrate('short')
)
exports.myo = myo
