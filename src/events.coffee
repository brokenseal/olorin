"use strict"

_ = require('underscore')
assert = require('assert')


class Subscription
  constructor: (@callback, @index, @subscriptionList) ->

  invoke: (args...)->
    @callback(args...)

  dispose: ->
    @subscriptionList.splice(@index, 0)


class Events
  constructor: ->
    @events = {}

  on: (eventName, listener) ->
    if not @events[eventName]
      @events[eventName] = []  # new subscription list for this new event

    subscriptionList = @events[eventName]
    subscription = new Subscription(
      listener,
      subscriptionList.length,
      subscriptionList
    )
    subscriptionList.push(subscription)
    return subscription

  once: (eventName, listener) ->
    subscription = @on(eventName, (args...)->
      subscription.dispose()
      listener(args...)
    )
    return subscription

  trigger: (eventName, args...) ->
    subscriptionList = @events[eventName] or []
    len = subscriptionList.length

    while len--
      subscription = subscriptionList[len]
      subscription.invoke(args...)

  off: (eventName) ->
    # this can be used to remove all subscriptions to a specific event, to
    # dispose single subscription use the dispose method on them
    @events[eventName] = []


class MyoEventHandler
  # this just a simple interface for new event handlers
  invoke: (myo, eventName, eventData) ->
    throw new Error('Not implemented error')


class SimpleProxyEventHandler extends MyoEventHandler
  invoke: (myo, eventName, eventData) ->
    myo.trigger(eventName, eventData)


class DifferentNameEventHandler extends MyoEventHandler
  constructor: (@eventName) ->
  invoke: (myo, eventName, eventData) ->
    myo.trigger(@eventName, eventData)


class AddBehaviorEventHandler extends MyoEventHandler
  constructor: (@additionalBehavior) ->
  invoke: (myo, eventName, eventData) ->
    @additionalBehavior(myo, eventData)
    myo.trigger(@eventName, eventData)


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
    assert(handler instanceof MyoEventHandler)
    handler.invoke(myo, eventData.type, eventData)

  initSession: (myo, eventData) ->
    if not myo.session
      myo.session = new Session()
      return false
    return true

  getHandler: (eventType) ->
    return @[eventType] or @.default

  trigger: (myo, eventData) ->
    myo.trigger(eventData)

  # handlers
  paired: new SimpleProxyEventHandler()
  orientation: new SimpleProxyEventHandler()
  rssi: new DifferentNameEventHandler('bluetooth_strength')
  pose: new AddBehaviorEventHandler((myo, eventData)->
    myo.session.pose = eventData.pose
  )
  arm_recognized: new AddBehaviorEventHandler((myo, eventData)->
    myo.session.onArmRecognized(eventData.arm, eventData.x_direction, eventData.timestamp)
  )
  arm_lost: new AddBehaviorEventHandler((myo, eventData)->
    removeSession(myo)
  )
  connected: new AddBehaviorEventHandler((myo, eventData)->
    myo.session.onConnected(eventData.version, eventData.timestamp)
  )
  disconnected: new AddBehaviorEventHandler((myo, eventData)->
    # destroy myo instance?
    removeSession(myo)
  )
  default: new AddBehaviorEventHandler((myo, eventData)->
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


removeSession = (myo) ->
  if myo.session
    myo.session.close()

  myo.session = null

_.extend(exports, {
  Events: Events
  Subscription: Subscription
  ProxyEventManager: ProxyEventManager
  ExtendedProxyEventManager: ExtendedProxyEventManager
  ExperimentalProxyEventManager: ExperimentalProxyEventManager
  MyoEventHandler: MyoEventHandler
  AddBehaviorEventHandler: AddBehaviorEventHandler
})
