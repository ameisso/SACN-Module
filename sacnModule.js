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
var lastDmxFrame = new Uint8Array(512);

module.exports = {

    init: function () {
        console.log("loading artnet module")
        for (let i = 0; i < lastDmxFrame.length; i++) {
            lastDmxFrame[i] = 0;
        }
    },

    oscInFilter: function (data) {
        var { address, args, host, port } = data
        if (address.startsWith("/sacn/")) {
            const elts = address.split('/');
            let channel = isNaN(elts.at(-1)) ? 0 : elts.at(-1);
            let dmxValue = Math.floor(args[0].value)
            lastDmxFrame[channel] = dmxValue;
            sACNServer.send({
                payload: lastDmxFrame,
                useRawDmxValues: true
            }).catch(e => console.log("error sending SACN " + e))
        }
        return { address, args, host, port }
    },

    oscOutFilter: function (data) {
        var { address, args, host, port, clientId } = data
        var universeChanged = false;
        if (address == "/sacn") {
            let dmxAddress = " " + Math.floor(args[0].value)
            let dmxValue = Math.floor(args[1].value)
            lastDmxFrame[dmxAddress] = dmxValue;
            universeChanged = true;

        }
        else if (address.startsWith("/sacn/")) {
            const elts = address.split('/');
            let channel = isNaN(elts.at(-1)) ? 0 : elts.at(-1);
            let dmxValue = Math.floor(args[0].value)
            lastDmxFrame[channel] = dmxValue;
            universeChanged = true;
        }
        else {
            return { address, args, host, port }
        }
        if (universeChanged) {
            sACNServer.send({
                payload: lastDmxFrame,
                useRawDmxValues: true
            }).catch(e => console.log("error sending SACN " + e))
        }
    },

    unload: function () {
        console.log("unloading artnet module")
        sACNServer.close();
    },

}