"use strict"

_ = require('underscore')


class MessageQueue
  constructor: (@limit=1000)->
    @queue = []

  purge: ->
    if @queue.length > @limit
      @queue.splice(@limit, @queue.length - @limit)

  push: (object) ->
    @purge()
    return @queue.push(object)

  getLastItems: (length=100) ->
    return @queue.slice(0, length)


class Session
  # Session constructor
  # @param {String} arm {left|right}
  # @param {String} direction # not sure about this one
  constructor: (@messageQueueLimit) ->
    @pose = null
    @messagesQueue = new MessageQueue(@messageQueueLimit)
    @arm = @direction = @version = @connectedTimestamp = @armRecognizedTimestamp = null

    # this object can be used by custom events to store additional data
    @extra = {}

  initialize: ->
    # here I want to add an initialization of the user session on the armband,
    # registering common actions just to know the user better and adapt to his
    # habits every person has a different strength when performing different
    # actions, registering commong actions will make it easier to adapt
    # actions based on user's sensitivity

  onConnected: (version, @connectedTimestamp) ->
    @version = version.join('.')

  onArmRecognized: (@arm, @direction, @armRecognizedTimestamp) ->

  close: ->
    # do something? empty the message queue?


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
    myo.session.messagesQueue.push(eventData)
    handler = @getHandler(eventData.type)
    handler.call(@, myo, eventData)

  initSession: (myo, eventData) ->
    if not myo.session
      myo.session = new Session()
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
    myo.session.onArmRecognized(eventData.arm, eventData.x_direction, eventData.timestamp)
    myo.trigger('arm_recognized', eventData)

  arm_lost: (myo, eventData) ->
    @removeSession(myo)
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
    myo.session.onConnected(eventData.version, eventData.timestamp)
    myo.trigger('connected', eventData)

  disconnected: (myo, eventData) ->
    # destroy myo instance?
    @removeSession(myo)
    myo.trigger('disconnected', eventData)

  default: (myo, eventData) ->
    console.log('Unhandled event:', eventData)


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
    myo.trigger('gyroscope', eventData)

  accelerometer: (myo, eventData) ->
    myo.trigger('accelerometer', eventData)

  imu: (myo, eventData) ->
    myo.trigger('imu', eventData)


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

  double_tap: (myo, eventData) ->
    myo.trigger('double_tap', eventData)

    # also reset myo's orientation ?
    myo.zeroOrientation()

  slap_left: (myo, eventData) ->
    myo.trigger('slap_left', eventData)


_.extend(exports, {
  Events: Events
  Subscription: Subscription
  ProxyEventManager: ProxyEventManager
  ExtendedProxyEventManager: ExtendedProxyEventManager
  ExperimentalProxyEventManager: ExperimentalProxyEventManager
})
