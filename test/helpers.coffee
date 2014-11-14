_ = require('underscore')
connection = require("../src/connection")
events = require("../src/events/main")
proxy = require("../src/events/proxy")


class FakeWebSocket
  constructor: (@url) ->
    @onmessage = null

  message: (args...) ->
    @onmessage(args...)

  send: ->
  close: ->


class FakeConnection extends connection.Connection
  SocketClass: FakeWebSocket


class FakeProxyEventManager extends proxy.ProxyEventManager

_.extend(exports, {
  FakeConnection: FakeConnection
  FakeProxyEventManager: FakeProxyEventManager
})
