_ = require('underscore')
connection = require("../src/connection")
events = require("../src/events")


class FakeWebSocket
  constructor: (@url) ->
    @onmessage = null

  message: (args...) ->
    @onmessage(args...)

  send: ->
  close: ->


class FakeConnection extends connection.Connection
  SocketClass: FakeWebSocket


class FakeProxyEventManager extends events.ProxyEventManager

_.extend(exports, {
  FakeConnection: FakeConnection
  FakeProxyEventManager: FakeProxyEventManager
})
