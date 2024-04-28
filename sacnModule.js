var { Sender } = nativeRequire('sacn');

const ip = "192.168.2.177";
const dmxUniverse = 1;
const sACNServer = new Sender({
    universe: dmxUniverse,
    //iface: ip,
    reuseAddr: true,
    useRawDmxValues: true,
    defaultPacketOptions: {
        sourceName: "O-S-C SACN U1",
        priority: 100,
    }
});
var lastDmxFrame = new Uint8Array(512);

module.exports = {

    init: function () {
        setTimeout(function () {
            console.log("\n\n--------------------")
            console.log("loading sACN module")
            console.log("dmx universe " + dmxUniverse)
            console.log("--------------------")
        }, 1000);

        for (let i = 0; i < lastDmxFrame.length; i++) {
            lastDmxFrame[i] = 0;
        }
    },

    oscInFilter: function (data) {

        var { address, args, host, port } = data
       // console.log("in"+address)
        var universeChanged = false;
        if (address.startsWith("/sacn/")) {
            const elts = address.split('/');
            let channel = isNaN(elts.at(-1)) ? 0 : elts.at(-1);
            let dmxValue = Math.floor(args[0].value);
            lastDmxFrame[channel] = dmxValue;
            var universeChanged = true;
        }
       

        if (universeChanged) {
            sACNServer.send({
                payload: lastDmxFrame
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
                payload: lastDmxFrame
            }).catch(e => console.log("error sending SACN " + e))
        }
    },

    unload: function () {
        console.log("unloading artnet module")
        sACNServer.close();
        this.reload();
    },

    reload: function () {
        console.log("reloading artnet module")
    }



}