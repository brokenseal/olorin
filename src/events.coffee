"use strict"

_ = require('underscore')


class Session
  # Session constructor
  # @param {String} arm {left|right}
  # @param {String} direction # not sure about this one
  constructor: (@arm, @direction) ->
    @pose = null
    @messagesQueue = []

  initialize: ->
    # here I want to add an initialization of the user session on the armband,
    # registering common actions just to know the user better and adapt to his
    # habits every person has a different strength when performing different
    # actions, registering commong actions will make it easier to adapt
    # actions based on user's sensitivity

  close: ->
    # do something


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


class ProxyEventManager
  # Prepares event and event data to be proxied to the myo instance
  # It's also responsible to create sessions and update them, on myo instances
  # By inheriting from this class, it is possible to extend the list of events
  # a myo can recognize
  handle: (myo, eventData) ->
    @initSession(myo, eventData)
    handler = @getHandler(eventData.type)
    handler.call(@, myo, eventData)

  initSession: (myo, eventData) ->
    if not myo.session
      myo.session = new Session(eventData.arm, eventData.x_direction)
      return false
    return true

  removeSession: (myo) ->
    if myo.session
      myo.session.close()

    myo.session = null

  getHandler: (eventType) ->
    return @[eventType] or @.default

  # handlers
  arm_recognized: (myo, eventData) ->
    myo.trigger('arm_recognized', eventData)

  arm_lost: (myo, eventData) ->
    @removeSession()
    myo.trigger('arm_lost', eventData)

  paired: (myo, eventData) ->
    myo.trigger('paired', eventData)

  pose: (myo, eventData) ->
    myo.session.pose = eventData.pose
    myo.trigger('pose', eventData.pose)

  orientation: (myo, eventData) ->
    myo.trigger('orientation', eventData)

  rssi: (myo, eventData) ->
    myo.trigger('bluetooth_strength', eventData.rssi)

  connected: (myo, eventData) ->
#      myo.connect_version = data.version.join('.')
    myo.trigger('connected', eventData)

  disconnected: (myo, eventData) ->
    # destroy myo instance?
    @removeSession()
    myo.trigger('disconnected', eventData)

  default: (myo, eventData) ->
    console.log('Unhandled event:', eventData)


class ExtendedProxyEventManager extends ProxyEventManager
  orientation: (myo, eventData) ->
    # completely overrides parent's orientation method
    # add an offset to the orientation data?
    orientationData = {
      x: eventData.orientation.x
      y: eventData.orientation.y
      z: eventData.orientation.z
      w: eventData.orientation.w
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
    myo.trigger('orientation', orientationData)

    @gyroscope(myo, gyroscopeData)
    @accelerometer(myo, accelerometerData)
    @imu(myo, imuData)

  gyroscope: (myo, eventData) ->
    myo.trigger('gyroscope', eventData)

  accelerometer: (myo, eventData) ->
    myo.trigger('accelerometer', eventData)

  imu: (myo, eventData) ->
    myo.trigger('imu', eventData)


class ExperimentalProxyEventManager extends ExtendedProxyEventManager
  initSession: (myo, eventData) ->
    hadSession = super

    if not hadSession
      myo.session.wasRight = false
      myo.session.sensitivity = 20
      myo.session.lastIMU = null
      myo.session.doubleTap = {
        threshold: 0.9
        time: [80, 300]
      }

  imu: (myo, eventData) ->
    myo.session.lastIMU = eventData
    super

  accelerometer: (myo, eventData) ->
    # add double_tap event
    # all rights for this event go to stolksdorf ( https://github.com/stolksdorf/myo.js.git )
    super

    if not myo.session.lastIMU
      return

    doubleTapOptions = myo.session.doubleTap
    last = myo.session.lastIMU.accelerometer

    y = Math.abs(eventData.y)
    z = Math.abs(eventData.z)
    delta = Math.abs(Math.abs(last.y) - y) + Math.abs(Math.abs(last.z) - z)

    if delta > doubleTapOptions.threshold
      if myo.session.last_tap
        diff = new Date().getTime() - myo.session.last_tap

        if diff > doubleTapOptions.time[0] and diff < doubleTapOptions.time[1]
          @double_tap(myo, eventData)

      myo.session.last_tap = new Date().getTime()

  gyroscope: (myo, eventData) ->
    # add slap_left event
    super

    sensRight = (20 + myo.session.sensitivity) * -1

    if eventData.x < sensRight and not myo.session.wasRight
      myo.session.wasRight = true
      return

    sensLeft = 80 + (myo.session.sensitivity * 2)

    if eventData.x > sensLeft and myo.session.wasRight
      @slap_left(myo, eventData)
      myo.session.wasRight = false

  double_tap: (myo, eventData) ->
    myo.trigger('double_tap', eventData)

  slap_left: (myo, eventData) ->
    myo.trigger('slap_left', eventData)


_.extend(exports, {
  Events: Events
  Subscription: Subscription
  ProxyEventManager: ProxyEventManager
  ExtendedProxyEventManager: ExtendedProxyEventManager
  ExperimentalProxyEventManager: ExperimentalProxyEventManager
})
