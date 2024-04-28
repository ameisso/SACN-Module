var { Sender } = nativeRequire('sacn');
module.exports = { init, oscInFilter, oscOutFilter, unload };

const ip = "192.168.2.177";
const dmxUniverses = [1, 2];
const sACNSenders = [];
const lastDmxFrames = [];


function init() {
    reload();
}

function oscInFilter(data) {
    var { address, args, host, port } = data

    return { address, args, host, port }
}

function oscOutFilter(data) {
    var { address, args, host, port, clientId } = data
    var universeChanged = false;
    if (address == "/sacn") { //only for universe 1
        let universe = 1;
        let dmxAddress = " " + Math.floor(args[0].value)
        let dmxValue = Math.floor(args[1].value)
        updateUniverseChannel(universe, dmxAddress, dmxValue)
        universeChanged = universe;
    }
    else if (address == "/sacn/reload") {
        reload();
    }
    else if (address.startsWith("/sacn/")) {
        const elts = address.split('/');
        let universe = isNaN(elts.at(-2)) ? 0 : elts.at(-2);
        let dmxAddress = isNaN(elts.at(-1)) ? 0 : elts.at(-1);
        let dmxValue = Math.floor(args[0].value)
        updateUniverseChannel(universe, dmxAddress, dmxValue)
        universeChanged = universe;
    }
    else {
        return { address, args, host, port }
    }

    if (universeChanged) {
        sACNSenders[universeChanged - 1].send({
            payload: lastDmxFrames[universeChanged - 1],
        }).catch(e => console.log("error sending SACN " + e))
    }
}

function unload() {
    console.log("unloading artnet module")
    for (let i = 0; i < dmxUniverses.length; i++) {
        sACNSenders[i].close();
    }
    reload();
}

function reload() {
    for (let i = 0; i < dmxUniverses.length; i++) {
        sACNSenders[i] = new Sender({
            universe: dmxUniverses[i],
            //iface: ip,
            reuseAddr: true,
            useRawDmxValues: true, //todo : doesnt work
            defaultPacketOptions: {
                sourceName: "O-S-C SACN U" + dmxUniverses[i],
                priority: 100,
            }
        });
        lastDmxFrames[i] = new Uint8Array(512);
    }
    setTimeout(function () {
        console.log("\n\n--------------------")
        console.log("loading sACN module")
        console.log("dmx universe " + dmxUniverses)
        console.log("--------------------")
    }, 1000);
}

function updateUniverseChannel(universe, channel, value) {
    console.log("universe " + universe + " channel " + channel + " value " + value)
    let frame = lastDmxFrames[universe - 1]
    frame[channel] = value;
    lastDmxFrames[universe - 1] = frame;
}

function getUniverse(universeIndex) {
    for (let i = 0; i < dmxUniverses.length; i++) {
        if (dmxUniverses[i] == universeIndex) {
            return i;
        }
        return sACNSenders[universe];
    }
}