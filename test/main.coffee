assert = require("assert")
olorin = require("../lib/olorin")

describe('Hub', ->
    describe('#create', ->
        it('should return a new Myo instance', ->
            newHub = new olorin.Hub()
            myo = newHub.create()

            assert(myo instanceof olorin.Myo)
        )
    )
)
