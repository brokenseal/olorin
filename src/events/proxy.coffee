"use strict"

_ = require('underscore')
assert = require('assert')
session = require('../session')
handlers = require('./handlers')


class ProxyEventManager
  # Prepares event and event data to be proxied to the myo instance
  # It's also responsible to create sessions and update them, on myo instances
  # By inheriting from this class, it is possible to extend the list of events
  # a myo can recognize
  constructor: (@debounceTriggerBy=1000) ->

  handle: (myo, eventData) ->
    @initSession(myo, eventData)
    myo.session.messagesQueue.push(eventData)
    handler = @getHandler(eventData.type)
    console.log(handler)
    assert(handler instanceof handlers.MyoEventHandler, 'Expected instance of MyoEventHandler, found ' + typeof handler)
    handler.invoke(myo, eventData.type, eventData)

  initSession: (myo, eventData) ->
    if not myo.session
      myo.session = new session.Session()
      return false
    return true

  getHandler: (eventType) ->
    return @[eventType] or @.default

  trigger: (myo, eventData) ->
    myo.trigger(eventData)

  # handlers
  paired: new handlers.SimpleProxyEventHandler()
  orientation: new handlers.SimpleProxyEventHandler()
  rssi: new handlers.DifferentNameEventHandler('bluetooth_strength')
  pose: new handlers.AddBehaviorEventHandler((myo, eventData)->
    myo.session.pose = eventData.pose
  )
  arm_recognized: new handlers.AddBehaviorEventHandler((myo, eventData)->
    myo.session.onArmRecognized(eventData.arm, eventData.x_direction, eventData.timestamp)
  )
  arm_lost: new handlers.AddBehaviorEventHandler((myo, eventData)->
    session.Session.removeSession(myo)
  )
  connected: new handlers.AddBehaviorEventHandler((myo, eventData)->
    myo.session.onConnected(eventData.version, eventData.timestamp)
  )
  disconnected: new handlers.AddBehaviorEventHandler((myo, eventData)->
    # destroy myo instance?
    Session.removeSession(myo)
  )
  default: new handlers.AddBehaviorEventHandler((myo, eventData)->
    console.log('Unhandled event:', eventData)
  )


class ExtendedProxyEventManager extends ProxyEventManager
  orientation: (myo, eventData) ->
    # completely overrides parent's orientation method
    # add an offset to the orientation data?
    state = myo.session.extra
    orientationData = {
      x: eventData.orientation.x - state.zeroOrientationOffset.x
      y: eventData.orientation.y - state.zeroOrientationOffset.y
      z: eventData.orientation.z - state.zeroOrientationOffset.z
      w: eventData.orientation.w - state.zeroOrientationOffset.w
    }
    gyroscopeData = {
      x: eventData.gyroscope[0]
      y: eventData.gyroscope[1]
      z: eventData.gyroscope[2]
    }
    accelerometerData = {
      x: eventData.accelerometer[0]
      y: eventData.accelerometer[1]
      z: eventData.accelerometer[2]
    }
    imuData = {
      gyroscope: gyroscopeData
      accelerometer: accelerometerData
      orientation: orientationData
    }
    state.lastOrientationData = orientationData

    super(myo, orientationData)
    @gyroscope(myo, gyroscopeData)
    @accelerometer(myo, accelerometerData)
    @imu(myo, imuData)

  gyroscope: (myo, eventData) ->
    @trigger(myo, 'gyroscope', eventData)

  accelerometer: (myo, eventData) ->
    @trigger(myo, 'accelerometer', eventData)

  imu: (myo, eventData) ->
    @trigger(myo, 'imu', eventData)


class ExperimentalProxyEventManager extends ExtendedProxyEventManager
  initSession: (myo) ->
    hadSession = super

    if not hadSession
      _.extend(myo.session.extra, {
        wasRight: false
        sensitivity: 20
        lastIMU: null
        doubleTap: {
          threshold: 0.9
          time: [80, 300]
        }
        zeroOrientationOffset: {x: 0, y: 0, z: 0, w: 0}
      })

  accelerometer: (myo, eventData) ->
    # add double_tap event
    # all rights for this event go to stolksdorf ( https://github.com/stolksdorf/myo.js.git )
    super

    state = myo.session.extra

    if not state.lastIMU
      return

    doubleTapOptions = state.doubleTap
    last = state.lastIMU.accelerometer

    y = Math.abs(eventData.y)
    z = Math.abs(eventData.z)
    delta = Math.abs(Math.abs(last.y) - y) + Math.abs(Math.abs(last.z) - z)

    if delta > doubleTapOptions.threshold
      if state.last_tap
        diff = new Date().getTime() - state.last_tap

        if diff > doubleTapOptions.time[0] and diff < doubleTapOptions.time[1]
          # trigger double tap event
          @double_tap(myo, eventData)

      state.last_tap = new Date().getTime()

  imu: (myo, eventData) ->
    # add slap_left event
    myo.session.extra.lastIMU = eventData
    super
    eventData = eventData.orientation

    state = myo.session.extra
    sensRight = (20 + state.sensitivity) * -1

    if eventData.x < sensRight and not state.wasRight
      state.wasRight = true
      return

    sensLeft = 80 + (state.sensitivity * 2)

    if eventData.x > sensLeft and state.wasRight
      # trigger slap left event
      @slap_left(myo, eventData)
      state.wasRight = false

  slap_left: (myo, eventData) ->
    @trigger(myo, 'slap_left', eventData)

  double_tap: (myo, eventData) ->
    @trigger(myo, 'double_tap', eventData)

    # also reset myo's orientation ?
    myo.zeroOrientation()


_.extend(exports, {
  ProxyEventManager: ProxyEventManager
  ExtendedProxyEventManager: ExtendedProxyEventManager
  ExperimentalProxyEventManager: ExperimentalProxyEventManager
})
