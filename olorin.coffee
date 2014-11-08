"use strict"

underscore = _ = require('underscore')
Socket = require('ws');


class Myo
    defaultConfiguration = {}
    _id = 0

    constructor: (configuration?) ->
        @configuration = _.extend({}, @defaultConfiguration, configuration)
        @id = @_id++ # not sure about this one

    on: (eventName) ->
        # do something

    off: (eventName) ->
        # do something

    trigger: (eventName) ->
        # do something

    destroy: () ->
        # one day I'll add something here


class Hub
    defaultConfiguration = {}

    constructor: (configuration?) ->
        @configuration = _.extend({}, @defaultConfiguration, configuration)
        @connection = new Connection(@)
        @myos = {}

    create: (configuration) ->
        newMyo = new Myo(configuration)
        @myos[newMyo.id] = newMyo
        return newMyo

    destroy: () ->
        @connection.close() # not sure about that


class Connection
    # a very simple wrapper class around the web socket connection
    defaultConfiguration: {
        socketUrl: ''
        apiVersion: 1
    }
    eventTable = {} # TODO
    messageTypes: {
        event: 'event'
    }

    constructor: (hub, configuration) ->
        @hub = hub
        @configuration = _.extend({}, @defaultConfiguration, configuration)
        @socket = new Socket(@configuration.socketUrl)
        @socket.onmessage = @onMessage

    onMessage: (message) =>
        data = JSON.parse(message.data)
        messageType = data[0]
        eventData = data[1]
        target = @hub.myos[eventData.myo]
        event = @eventTable[eventData.type]

        if(messageType == @messageTypes.event && target && event)
            onEvent(eventData)
        else
            throw new Error('Unknown message received: ' + message.toString())

    onEvent: (data) ->


    close: () ->
        @socket.close() # not sure about that
