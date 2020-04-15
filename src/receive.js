// DOM elements
const magnetoDiv = document.getElementById('magnetoDiv')
const acceleroDiv = document.getElementById('acceleroDiv')
const sampleRateSelect = document.getElementById('sampleRateSelect')
const sampleRateSpan = document.getElementById('sampleRateSpan')
const acceleroSampleRateSpan = document.getElementById('acceleroSampleRateSpan')
const frameRateSpan = document.getElementById('frameRateSpan')

const battLevelSpan = document.getElementById('battLevelSpan')
const battGraphDiv = document.getElementById('battGraphDiv')

/// BLE things, mainly for debug
var device, server, service, magnetoCharacteristic, accelCharacteristic, battService, battCharacteristic
/// to display the actual sample rate
var sampleCnt = 0, acceleroSampleCnt = 0, frameCnt = 0
/// x, y, z coordinates sent to Plotly at
var xq = [], yq = [], zq = []
var axq = [], ayq = [], azq = []

/// push the data to the temp arrays
function gotMagnetoData(evt) {
    var raw = evt.target.value
    // console.log('evt:', evt, raw)
    var magData = new Int32Array(raw.buffer)
    sampleCnt++
    xq.push(magData[0])
    yq.push(magData[1])
    zq.push(magData[2])
}

function gotAcceleroData(evt) {
    var raw = evt.target.value
    // console.log('gotAcceleroData:', evt, raw)
    var accelData = new Float32Array(raw.buffer)
    acceleroSampleCnt++
    axq.push(accelData[0])
    ayq.push(accelData[1])
    azq.push(accelData[2])
}

function showBattLevel(battLevel) {
    battLevelSpan.innerText = battLevel + "%"
    Plotly.extendTraces(battGraphDiv, {
        y: [[battLevel]],
        x: [[new Date()]]
    }, [0])
}

function battChanged(evt) {
    var raw = evt.target.value
    var battLevel = new Uint8Array(raw.buffer)[0]
    showBattLevel(battLevel)
}

/// the function executing at requestAnimationFrame.
/// otherwise 80Hz update rate would lock up my browser (I guess depends on screen refresh rate)
function step() {
    frameCnt++
    if (xq.length) {
        Plotly.extendTraces(
            magnetoDiv,
            {
                y: [xq, yq, zq],
            },
            [0, 1, 2]
        );
        xq.length = 0;
        yq.length = 0;
        zq.length = 0;
    }
    if (axq.length) {
        Plotly.extendTraces(
            acceleroDiv,
            {
                y: [axq, ayq, azq],
            },
            [0, 1, 2]
        );
        axq.length = 0;
        ayq.length = 0;
        azq.length = 0;
    }
    window.requestAnimationFrame(step)
}

function setSampleRate(rateInHz) {
    magnetoCharacteristic && magnetoCharacteristic.writeValue && magnetoCharacteristic.writeValue(new Int8Array([rateInHz]))
}

function disconnect() {
    server = server && server.disconnect()
    device = undefined
    server = undefined
    service = undefined
    magnetoCharacteristic = undefined
    accelCharacteristic = undefined
    battService = undefined
    battCharacteristic = undefined
}

/// Connect to the Puck
function doIt() {
    disconnect();

    navigator.bluetooth.requestDevice({ optionalServices: ['f8b23a4d-89ad-4220-8c9f-d81756009f0c', 0x2A19], acceptAllDevices: true })
        .then(d => {
            device = d;
            console.debug('device:', device)
            return device.gatt.connect()
        })
        .then(s => {
            server = s
            console.debug('server:', server)

            // get battery service & characteristic:
            s.getPrimaryService(0x2A19)
                .then(battSrv => {
                    console.debug('got battService:', battSrv)
                    battService = battSrv
                    return battSrv.getCharacteristic(0x2A19)
                })
                .then(battCh => {
                    console.debug('got battCharacteristic:', battCh)
                    battCharacteristic = battCh
                    // add event listener to battery characteristic
                    battCh.addEventListener('characteristicvaluechanged', battChanged)
                    battCh.startNotifications()

                    // get the current battery level
                    battCh.readValue()
                        .then(w => {
                            var battLevel = new Uint8Array(w.buffer)[0];
                            showBattLevel(battLevel)
                        })
                })


            // get magnetometer service & characteristic:
            s.getPrimaryService('f8b23a4d-89ad-4220-8c9f-d81756009f0c')
                .then(srv => {
                    service = srv
                    console.debug('service:', service)
                    return service.getCharacteristics()
                })
                .then(chs => {
                    console.log('characteristics:', chs)
                    for (let ix = 0; ix < chs.length; ix++) {
                        const ch = chs[ix];
                        if (ch.uuid == 'f8b23a4d-89ad-4220-8c9f-d81756009f0c') {
                            // Puck or Bangle magnetometer
                            magnetoCharacteristic = ch
                            ch.addEventListener('characteristicvaluechanged', gotMagnetoData)
                            ch.startNotifications()
                            setSampleRate(sampleRateSelect.value)
                        }
                        if (ch.uuid == 'f8b23a4d-89ad-4220-8c9f-d81756009f0d') {
                            // Bangle's accelerometer
                            accelCharacteristic = ch
                            ch.addEventListener('characteristicvaluechanged', gotAcceleroData)
                            ch.startNotifications()
                        }
                    }
                })
        })
}

/// Create the initial graph & clear it
function clearIt() {
    Plotly.newPlot(magnetoDiv, [{
        y: [],
        type: 'scattergl',
        mode: 'lines',
        line: { color: '#f00' },
        name: 'x'
    }, {
        y: [],
        type: 'scattergl',
        mode: 'lines',
        line: { color: '#0f0' },
        name: 'y'
    }, {
        y: [],
        type: 'scattergl',
        mode: 'lines',
        line: { color: '#00f' },
        name: 'z'
    }], { title: 'Magnetometer/compass' });

    Plotly.newPlot(acceleroDiv, [{
        y: [],
        type: 'scattergl',
        mode: 'lines',
        line: { color: '#f00' },
        name: 'x'
    }, {
        y: [],
        type: 'scattergl',
        mode: 'lines',
        line: { color: '#0f0' },
        name: 'y'
    }, {
        y: [],
        type: 'scattergl',
        mode: 'lines',
        line: { color: '#00f' },
        name: 'z'
    }], { title: 'Accelerometer' });
}

// the actual initialization
sampleRateSelect.onchange = evt => { setSampleRate(evt.target.value) }
setInterval(() => {
    sampleRateSpan.innerText = sampleCnt; sampleCnt = 0
    acceleroSampleRateSpan.innerText = acceleroSampleCnt; acceleroSampleCnt = 0
    frameRateSpan.innerText = frameCnt; frameCnt = 0
}, 1000)
window.requestAnimationFrame(step)

// first: initialize the main plot
clearIt()
// second plot for battery level
Plotly.plot(battGraphDiv, [{ x: [], y: [], mode: "lines+markers" }], { title: 'Battery level [%]' })