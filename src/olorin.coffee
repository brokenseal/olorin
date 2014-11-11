"use strict"

_ = require('underscore')
events = require('./events')
connection = require('./connection')


class Myo extends events.Events
  defaultConfiguration = {}
  _id = 0

  # Myo constructor
  # @param {object} configuration
  constructor: (configuration) ->
    super
    @configuration = _.extend({}, Myo.defaultConfiguration, configuration)
    @id = _id++  # not sure about this one
    @session = null

  destroy: () ->
    @trigger('destroy')


class Session
  # Session constructor
  # @param {Myo} myo
  # @param {String} arm {left|right}
  # @param {String} direction # not sure about this one
  constructor: (@myo, @arm, @direction) ->
    @pose = null
    @eventsQueue = []

  initialize: () ->
    # here I want to add an initialization of the user session on the armband,
    # registering common actions just to know the user better and adapt to his
    # habits every person has a different strength when performing different
    # actions, registering commong actions will make it easier to adapt
    # actions based on user's sensitivity


class Hub
  # Hub constructor
  # An hub is responsible to keep track of all the myos created and to deliver
  # messages to the correct myo
  # @param {Connection} connection
  constructor: (@connection) ->
    @myos = {}
    @onMessageSubscription = @connection.on('message', @onMessage)

  onMessage: (eventData) =>
    myo = @myos[eventData.myo]

    if !myo
      throw new Error('Specified Myo not found')

    baseEventHandler = @baseEventHandlers[eventData.type]

    if !baseEventHandler
      throw new Error('Event data type not recognized')

    baseEventHandler(myo, eventData)

  create: (configuration) ->
    newMyo = new Myo(configuration)
    @myos[newMyo.id] = newMyo

    newMyo.on('destroy', =>
      @myos[newMyo.id] = null
    )
    return newMyo

  destroy: () ->
    @onMessageSubscription.dispose()
    @connection.close() # not sure about that

  baseEventHandlers: {
    arm_recognized: (myo, eventData) ->
      if myo.session
        myo.session.close()

      myo.session = new Session(@, eventData.arm, eventData.x_direction)
      myo.trigger(new events.Event('arm_recognized'))

    arm_lost: (myo, eventData) ->
      if myo.session
        myo.session.close()

      myo.session = null
      myo.trigger(new events.Event('arm_lost'))

    pose: (myo, eventData) ->
      if not myo.session
        throw new Error('No session found')

      myo.session.pose = eventData.pose
      myo.trigger(new events.Event('pose', eventData.pose))

    orientation: (myo, eventData) ->
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
      myo.trigger(new events.Event('orientation', orientationData))
      myo.trigger(new events.Event('gyroscope', gyroscopeData))
      myo.trigger(new events.Event('accelerometer', accelerometerData))
      myo.trigger(new events.Event('imu', imuData))

    rssi: (myo, eventData) ->
      myo.trigger(new events.Event('bluetooth_strength', eventData.rssi))

    connected: (myo, eventData) ->
#      myo.connect_version = data.version.join('.')
      myo.trigger(new events.Event('connected'))

    disconnected: (myo, eventData) ->
      # destry myo instance?
      myo.trigger(new events.Event('disconnected'))
  }

_.extend(exports, {
  Hub: Hub
  Myo: Myo
})
