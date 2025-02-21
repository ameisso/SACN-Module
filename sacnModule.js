var { Sender, Receiver } = nativeRequire('sacn');
module.exports = { init, oscInFilter, oscOutFilter, unload };

let dmxSendUniverses = [1];
let targetIp = "192.168.2.254";
const sACNSenders = [];
let dmxReceiveUniverse = [1];
const sACNReceiver = new Receiver({
    universes: dmxReceiveUniverse
})
const lastDmxFrames = [];


function init() {
    reload();
    sACNReceiver.on('packet', (packet) => {
        handleReceivedFrame(packet);
    });
}

function handleReceivedFrame(frame) {
    console.log("------------------\nframe received from " + frame.sourceName + ':' + frame.sourceAddress)
    for (var channel in frame.payload) {
        console.log("channel " + channel + " value " + frame.payload[channel]);
    }
}

function oscInFilter(data) {
    var { address, args, host, port } = data
    var universeChanged = false;
    if (address == "/sacn") { //only for universe 1
        let universe = 1;
        let dmxAddress = " " + Math.floor(args[0].value)
        let dmxValue = Math.floor(args[1].value)
        if (updateUniverseChannel(universe, dmxAddress, dmxValue)) {
            universeChanged = universe;
        }
    }
    else if (address.startsWith("/sacn/")) {
        universeChanged = splitArgsandUpdateFrame(address, args)
    }

    if (universeChanged) {
        sendsACNFrame(universeChanged)
    }
    return { address, args, host, port }
}

function oscOutFilter(data) {
    var { address, args, host, port, clientId } = data
    var universeChanged = false;
    if (address == "/sacn/reload") {
        console.log("reloading sACN universes")
        if (args.length > 0) {
            targetIp = args[0].value;
            console.log("new target IP :", targetIp);
        }

        reload();
    }
    else if (address == "/sacn/sendUniverses") {
        for (var i = 0; i < args.length; i++) {
            dmxSendUniverses.push(args[i].value);
            let newUniverses = Array.from(new Set(dmxSendUniverses));
            dmxSendUniverses = newUniverses;
        }
        reload();
    }
    else if (address == "/sacn/receiveUniverses") {
        for (var i = 0; i < args.length; i++) {
            dmxReceiveUniverse.push(args[i].value);
            let newUniverses = Array.from(new Set(dmxReceiveUniverse));
            dmxReceiveUniverse = newUniverses;
        }
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
        universeChanged = splitArgsandUpdateFrame(address, args)
    }
    else {
        return { address, args, host, port }
    }

    if (universeChanged) {
        sendsACNFrame(universeChanged)
    }
}

function unload() {
    console.log("unloading sACN module")
    for (let i = 0; i < dmxSendUniverses.length; i++) {
        let sender = sACNSenders[i];
        if (sender != undefined) {
            sACNSenders[i].close();
        }
    }
}

function reload() {
    for (let i = 0; i < dmxSendUniverses.length; i++) {
        sACNSenders[i] = new Sender({
            universe: dmxSendUniverses[i],
            iface: targetIp,
            reuseAddr: true,
            defaultPacketOptions: {
                sourceName: "O-S-C SACN U" + dmxSendUniverses[i],
                priority: 100,
                useRawDmxValues: true
            }
        });
        lastDmxFrames[i] = new Uint8Array(512);
    }

    setTimeout(function () {
        console.log("\n\n--------------------")
        console.log("loading sACN module")
        console.log("dmx sending universe " + dmxSendUniverses)
        console.log("dmx receiving universe " + dmxReceiveUniverse)
        console.log("--------------------")
    }, 1000);
}

function updateUniverseChannel(universe, channel, value) {
    let frameIndex = getUniverseArrayIndex(universe)
    let frame = lastDmxFrames[frameIndex]
    if (frame == undefined) {
        console.log("sACN is not connected to universe " + universe)
        return false;
    }
    frame[channel] = value;
    lastDmxFrames[frameIndex] = frame;
    return true;
}

function getUniverseArrayIndex(universeIndex) {
    for (let i = 0; i < dmxSendUniverses.length; i++) {
        if (dmxSendUniverses[i] == universeIndex) {
            {
                return i;
            }
        }
    }
    console.log("no universe found for index " + universeIndex)
}

function sendsACNFrame(universeIndex) {
    console.log("sending sACN frame for universe " + universeIndex)
    let arrayIndex = getUniverseArrayIndex(universeIndex)
    sACNSenders[arrayIndex].send({
        payload: lastDmxFrames[universeIndex - 1],
    }).catch(e => console.log("error sending SACN " + e))
    //console.log("frame ",lastDmxFrames[universeIndex - 1])
}

function splitArgsandUpdateFrame(address, args) {
    const elts = address.split('/');
    let universe = -1;
    if (elts.length == 3) {
        universe = 1;
    }
    else {
        universe = isNaN(elts.at(2)) ? 0 : elts.at(2);
    }
    let dmxAddress = isNaN(elts.at(-1)) ? 0 : elts.at(-1);
    let dmxValue = Math.floor(args[0].value)
    if (updateUniverseChannel(universe, dmxAddress, dmxValue)) {
        universeChanged = universe;
        return universeChanged;
    }
    else {
        return false
    }
}