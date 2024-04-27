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
        else if (address == "/yeux/pan") {
            lastDmxFrame[228] = args[0].value;
            lastDmxFrame[253] = 66-args[0].value;
            var universeChanged = true;
        }
        else if (address == "/yeux/tilt") {
            lastDmxFrame[230] = args[0].value;
            lastDmxFrame[255] = args[0].value;
            var universeChanged = true;
        }
        else if (address == "/yeux/zoom") {
            lastDmxFrame[234] = args[0].value;
            lastDmxFrame[259 ] = args[0].value;
            var universeChanged = true;
        }
        else if (address == "/yeux/dimmer") {
            lastDmxFrame[226] = args[0].value;
            lastDmxFrame[251] = args[0].value;
            var universeChanged = true;
        }
        else if (address == "/train/pan") {
            lastDmxFrame[283] = args[0].value;
            lastDmxFrame[313] = 66-args[0].value;
            var universeChanged = true;
        }
        else if (address == "/train/tilt") {
            lastDmxFrame[285] = args[0].value;
            lastDmxFrame[315] = args[0].value;
            var universeChanged = true;
        }
        else if (address == "/train/zoom") {
            lastDmxFrame[289] = args[0].value;
            lastDmxFrame[319] = args[0].value;
            var universeChanged = true;
        }
        else if (address == "/train/dimmer") {
            lastDmxFrame[281    ] = args[0].value;
            lastDmxFrame[311] = args[0].value;
            var universeChanged = true;
        }
        else
        {
        console.log("unhandled "+address)
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