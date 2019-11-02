const graphDiv = document.getElementById('graphDiv')
const sampleRateSelect = document.getElementById('sampleRateSelect')
const sampleRateSpan = document.getElementById('sampleRateSpan')
const frameRateSpan = document.getElementById('frameRateSpan')

/// BLE things
var device, server, service, characteristic
/// to display the actual sample rate
var sampleCnt = 0, frameCnt = 0
/// x, y, z coordinates sent to Plotly at
var xq = [], yq = [], zq = []

/// push the data to the temp arrays
function gotData(evt) {
    var raw = evt.target.value
    // console.log('evt:', evt, raw)
    var magData = new Int32Array(raw.buffer)
    sampleCnt++
    xq.push(magData[0])
    yq.push(magData[1])
    zq.push(magData[2])
}

/// the function executing at requestAnimationFrame.
/// otherwise 80Hz update rate would lock up my browser (I guess depends on screen refresh rate)
function step() {
    frameCnt++
    if (xq.length) {
        Plotly.extendTraces(
            graphDiv,
            {
                y: [xq, yq, zq],
            },
            [0, 1, 2]
        );
        xq.length = 0;
        yq.length = 0;
        zq.length = 0;
    }
    window.requestAnimationFrame(step)
}

function setSampleRate(rateInHz) {
    characteristic && characteristic.writeValue && characteristic.writeValue(new Int8Array([rateInHz]))
}

/// Connect to the Puck
function doIt() {

    navigator.bluetooth.requestDevice({optionalServices: ['f8b23a4d-89ad-4220-8c9f-d81756009f0c'], acceptAllDevices: true})
        .then(d => {
            device = d;
            console.debug('device:', device)
            return device.gatt.connect()
        })
        .then(s => {
            server = s
            console.debug('server:', server)
            return s.getPrimaryService('f8b23a4d-89ad-4220-8c9f-d81756009f0c')
        })
        .then(srv => {
            service = srv
            console.debug('service:', service)
            return service.getCharacteristic('f8b23a4d-89ad-4220-8c9f-d81756009f0c')
        })
        .then(ch => {
            characteristic = ch
            console.debug('characteristic :', characteristic)
            ch.addEventListener('characteristicvaluechanged', gotData)
            ch.startNotifications()
        })
}

/// Create the initial graph & clear it
function clearIt() {
    Plotly.newPlot(graphDiv, [{
        y: [],
        type: 'scattergl',
        mode: 'lines',
        line: {color: '#f00'},
        name: 'x'
    }, {
        y: [],
        type: 'scattergl',
        mode: 'lines',
        line: {color: '#0f0'},
        name: 'y'
    }, {
        y: [],
        type: 'scattergl',
        mode: 'lines',
        line: {color: '#00f'},
        name: 'z'
    }]);
}

// the actual initialization
sampleRateSelect.onchange = evt => {setSampleRate(evt.target.value)}
setInterval(() => {
    sampleRateSpan.innerText = sampleCnt; sampleCnt = 0
    frameRateSpan.innerText = frameCnt; frameCnt = 0
}, 1000)
window.requestAnimationFrame(step)

clearIt()