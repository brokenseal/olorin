assert = require("assert")
events = require("../../src/events")
handlers = require("../../src/events/handlers")
proxy = require("../../src/events/proxy")
olorin = require("../../src/olorin")
connection = require("../../src/connection")
sinon = require("sinon")
helpers = require("./../helpers")

hub = null

before(->
  hub = new olorin.Hub({
    connection: new helpers.FakeConnection()
    proxyEventManager: new helpers.FakeProxyEventManager()
  })
)
after(->
  hub.destroy()
)

describe('Hub', ->
  describe('connection', ->
    it('needs to be an instance of the base connection class', ->
      # yup, we check the other way around since classical inheritance doesn't
      # really work in js/cs
      assert(connection.Connection.prototype.isPrototypeOf(hub.connection))
    )
    it("should proxy all messages from the connection to its own onMessage
        handler", (done) ->
      # add a fake event handler
      myo = hub.create()
      eventName = 'fake'
      eventData = {type: eventName, myo: myo.id, test: 'yup'}
      message = {
        data: JSON.stringify([hub.connection.messageTypes.event, eventData])
      }

      hub.proxyEventManager[eventName] = new handlers.AddBehaviorEventHandler((myo, data) ->
        assert(data.type is eventData.type, 'Data type not equal: ' + data.type + ' != ' + eventData.type)
#        assert(data.test is eventData.test)
        done()
      )

      # trigger the event from the socket
      hub.connection.socket.message(message)
    )
  )

  describe('#create', ->
    it('should return a new Myo instance and register it inside the list of myos of the hub', ->
      myo = hub.create()
      assert(myo instanceof olorin.Myo)
      assert(hub.myos[myo.id] is myo)
    )
  )
)

describe('Myo', ->
  describe('a new instance', ->
    it('should trigger a `destroy` event on destroy', (done)->
      myo = hub.create()
      myo.on('destroy', ->
        done()
      )
      myo.destroy()
    )

    it('should remove itself from the list of myos on the hub on destroy', ->
      myo = hub.create()
      myo.destroy()
      assert(not hub.myos[myo.id])
    )
  )
)
