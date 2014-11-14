olorin = require('../../build/olorin')
connection = require('../../build/connection')
events = require('../../build/events')


hub = new olorin.Hub({
  proxyEventManager: new events.ExperimentalProxyEventManager()
})
myo = hub.create()

myo.on('arm_recognized', (event) ->
  console.log('arm_recognized', event)
)
myo.on('arm_lost', (event) ->
  console.log('arm_lost', event)
)
myo.on('connected', (event) ->
  console.log('connected', event)
)
myo.on('disconnected', (event) ->
  console.log('disconnected', event)
)
myo.on('pose', (event) ->
  console.log('pose', event)
)
myo.on('slap_left', (event, eventData) ->
  console.log('SLAP!!', event, eventData)
  myo.vibrate('short')
)
myo.on('double_tap', (event, eventData) ->
  console.log('double tap', event, eventData)
  myo.vibrate('short')
)
exports.myo = myo
