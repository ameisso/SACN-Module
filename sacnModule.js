var { Sender, Receiver } = nativeRequire('sacn');
module.exports = { init, oscInFilter, oscOutFilter, unload };

const targetIp = "192.168.1.177";
const dmxSendUniverses = [1, 2, 10];
const sACNSenders = [];
const dmxReceiveUniverse = [1, 42];
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
    // for (var channel in frame.payload) {
    //     console.log("channel " + channel + " value " + frame.payload[channel]);
    // }


    //CUSTOM CODE STARTS HERE 
    let targetChannel = -1
    for (var channel in frame.payload) {
        //   console.log("channel " + channel + " value " + frame.payload[channel]);
        if (frame.payload[channel] > 0) {
            targetChannel = channel
        }
    }

    if (targetChannel == -1) {
        console.log("no channel found")
        return
    }
    else {
        console.log("target channel " + targetChannel)
    }

    var beyondIp = '192.168.1.240';
    var beyondPort = 8000;
    var beyondAddress = '/beyond/general/FocusCellIndex' 
    console.log("sending beyond address " + beyondAddress)
    send(beyondIp, beyondPort, beyondAddress, {
        type: 'i',
        value: targetChannel
    })
    send(beyondIp, beyondPort, '/beyond/general/StartCell')

    var madIp = '127.0.0.1';
    var madPort = 8010;
    var columnIndex = targetChannel
    var madAddress = '/cues/selected/scenes/by_cell/col_' + columnIndex

    send(madIp, madPort, madAddress, {
        type: 'i',
        value: 1
    })
    //CUSTOM CODE ENDS HERE


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
            //iface: ip,
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
    // console.log("sending sACN frame for universe " + universeIndex)
    let arrayIndex = getUniverseArrayIndex(universeIndex)
    sACNSenders[arrayIndex].send({
        payload: lastDmxFrames[universeIndex - 1],
    }).catch(e => console.log("error sending SACN " + e))
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