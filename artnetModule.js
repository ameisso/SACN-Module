var artnet = nativeRequire('artnet')
var { Sender } = nativeRequire('sacn');

const ip = "192.168.2.177";
const sACNServer = new Sender({
    universe: 1,
    //iface: ip,
    reuseAddr: true,
    defaultPacketOptions: {
        sourceName: "O-S-C SACN U1",
        priority: 100,
    }
});

module.exports = {

    init: function () {
        console.log("loading artnet module")
    },

    oscInFilter: function (data) {
        var { address, args, host, port } = data
        return { address, args, host, port }

    },

    oscOutFilter: function (data) {
        var { address, args, host, port, clientId } = data
        if (address == "/sacn") {
            let dmxAddress =" "+ Math.floor(args[0].value)
            let dmxValue = Math.floor(args[1].value)
            //console.log("DMX " + dmxAddress + " " + dmxValue)
            sACNServer.send({
                payload: {
                    1: dmxValue
                },
                useRawDmxValues:true
            }).catch(e => console.log("error sending SACN "+e))
        }
        else {
            return { address, args, host, port }
        }
    },

    unload: function () {
        console.log("unloading artnet module")
        sACNServer.close();
    },

}