var { Sender } = nativeRequire('sacn');
module.exports = { init, oscInFilter, oscOutFilter, unload };

const ip = "192.168.2.177";
const dmxUniverses = [1, 2, 10];
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
    if (address == "/sacn/reload") {
        console.log("reloading sACN universes")
        reload();
    }
    else if (address == "/sacn") { //only for universe 1
        let universe = 1;
        let dmxAddress = " " + Math.floor(args[0].value)
        let dmxValue = Math.floor(args[1].value)
        if (updateUniverseChannel(universe, dmxAddress, dmxValue)) {
            universeChanged = universe;
        }
    }
    else if (address.startsWith("/sacn/")) {
        const elts = address.split('/');
        let universe = isNaN(elts.at(-2)) ? 0 : elts.at(-2);
        let dmxAddress = isNaN(elts.at(-1)) ? 0 : elts.at(-1);
        let dmxValue = Math.floor(args[0].value)
        if (updateUniverseChannel(universe, dmxAddress, dmxValue)) {
            universeChanged = universe;
        }

    }
    else {
        return { address, args, host, port }
    }

    if (universeChanged) {
        let arrayIndex = getUniverseArrayIndex(universeChanged)
        sACNSenders[arrayIndex].send({
            payload: lastDmxFrames[universeChanged - 1],
        }).catch(e => console.log("error sending SACN " + e))
    }
}

function unload() {
    console.log("unloading artnet module")
    for (let i = 0; i < dmxUniverses.length; i++) {
        let sender = sACNSenders[i];
        if (sender != undefined) {
            sACNSenders[i].close();
        }
    }
}

function reload() {
    for (let i = 0; i < dmxUniverses.length; i++) {
        sACNSenders[i] = new Sender({
            universe: dmxUniverses[i],
            //iface: ip,
            reuseAddr: true,
            defaultPacketOptions: {
                sourceName: "O-S-C SACN U" + dmxUniverses[i],
                priority: 100,
                useRawDmxValues: true
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
    let frameIndex = getUniverseArrayIndex(universe)
    let frame = lastDmxFrames[frameIndex]
    if (frame == undefined) {
        console.log("frame undefined")
        return false;
    }
    frame[channel] = value;
    lastDmxFrames[frameIndex] = frame;
    return true;
}

function getUniverseArrayIndex(universeIndex) {
    for (let i = 0; i < dmxUniverses.length; i++) {
        if (dmxUniverses[i] == universeIndex) {
            {
                return i;
            }
        }
    }
    console.log("no universe found for index " + universeIndex)
}
