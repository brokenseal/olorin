"use strict"

underscore = _ = require('underscore')
WebSocket = require('ws');


class Myo
    defaultConfiguration = {}
    _id = 0

    constructor: (configuration) ->
        @configuration = _.extend({}, Myo.defaultConfiguration, configuration)
        @id = Myo._id++ # not sure about this one
        @session = null

    on: (eventName, listener) ->
        # do something

    off: (eventName) ->
        # do something

    trigger: (event) ->
        if @.session
            # every time an event is fired, keep track of it on the session
            @.session.eventsQueue.push(event)
        # do something

    destroy: () ->
        @trigger('destroy')
        # one day I'll add something here


class Session
    # session will hold user specific data as well
    constructor: (@myo, @arm, @direction) ->
        @pose = null
        @eventsQueue = []

    close: () ->
        # do something


class Hub
    defaultConfiguration = {}

    constructor: (configuration) ->
        @configuration = _.extend({}, @defaultConfiguration, configuration)
        @connection = new Connection(@)
        @myos = {}

    create: (configuration) ->
        newMyo = new Myo(configuration)
        @myos[newMyo.id] = newMyo

        newMyo.on('destroy', =>
            @myos[newMyo.id] = null
        )
        return newMyo

    destroy: () ->
        @connection.close() # not sure about that


class Connection
    # a very simple wrapper class around the web socket connection
    defaultConfiguration: {
        socketUrl: "ws://127.0.0.1:10138/myo/"
        apiVersion: 1
    }
    messageTypes: {
        event: 'event'
    }

    constructor: (hub, configuration) ->
        @hub = hub
        @configuration = _.extend({}, @defaultConfiguration, configuration)
        @socket = new WebSocket(@configuration.socketUrl)
        @socket.onmessage = @onMessage

    onMessage: (message) =>
        data = JSON.parse(message.data)
        messageType = data[0]
        eventData = data[1]
        myo = @hub.myos[eventData.myo]
        baseEventHandler = Event.baseEventHandlers[eventData.type]

        if(messageType == @messageTypes.event && myo && baseEventHandler)
            baseEventHandler(myo, eventData)
        else
            throw new Error('Unknown message received: ' + message.toString())

    close: () ->
        @socket.close() # not sure about that


class Event
    constructor: (@name, @data) ->

    @baseEventHandlers = {
        arm_recognized: (myo, eventData) ->
            if myo.session
                myo.session.close()

            myo.session = new Session(@, eventData.arm, eventData.x_direction)
            myo.trigger(new Event('arm_recognized'))

        arm_lost: (myo, eventData) ->
            if myo.session
                myo.session.close()

            myo.session = null
            myo.trigger(new Event('arm_lost'))

        pose: (myo, eventData) ->
            if not myo.session
                throw new Error('No session found')

            myo.session.pose = eventData.pose
            myo.trigger(new Event('pose', eventData.pose))

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
            myo.trigger(new Event('orientation', orientationData))
            myo.trigger(new Event('gyroscope', gyroscopeData))
            myo.trigger(new Event('accelerometer', accelerometerData))
            myo.trigger(new Event('imu', imuData))

        rssi: (myo, eventData) ->
            myo.trigger(new Event('bluetooth_strength', eventData.rssi))

        connected: (myo, eventData) ->
    #            myo.connect_version = data.version.join('.');
            myo.trigger(new Event('connected'))

        disconnected: (myo, eventData) ->
            # destry myo instance?
            myo.trigger(new Event('disconnected'))
    }

_.extend(exports, {
    Hub: Hub,
    Myo: Myo
});
