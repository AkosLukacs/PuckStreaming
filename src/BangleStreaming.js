// upload this to the Bangle

var batteryInterval, connected = false;

function onMag(d) {
  if (connected) {
    NRF.updateServices({
      'f8b23a4d-89ad-4220-8c9f-d81756009f0c': {
        'f8b23a4d-89ad-4220-8c9f-d81756009f0c': {
          value: new Int32Array([d.x, d.y, d.z]).buffer,
          notify: true
        }
      }
    })
  }
}

function onAccel(d) {
  if (connected) {
    NRF.updateServices({
      'f8b23a4d-89ad-4220-8c9f-d81756009f0c': {
        'f8b23a4d-89ad-4220-8c9f-d81756009f0d': {
          value: new Float32Array([d.x, d.y, d.z]).buffer,
          notify: true
        }
      }
    })
  }
}

function updateBattery() {
  NRF.updateServices({
    0x2A19: {
      0x2A19: {
        notify: true,
        readable: true,
        value: [E.getBattery()]
      }
    }
  })
}

function onInit() {
  // on connect / disconnect blink the green / red LED turn on / off the magnetometer
  NRF.on('connect', function () { connected = true; Bangle.setCompassPower(1); })
  NRF.on('disconnect', function () { connected = false; Bangle.setCompassPower(0); })

  // declare the services
  NRF.setServices({
    // Battery level service
    0x2A19: {
      0x2A19: {
        notify: true,
        readable: true,
        value: [E.getBattery()]
      }
    },
    // Magneto&accelerometer service
    'f8b23a4d-89ad-4220-8c9f-d81756009f0c': {
      'f8b23a4d-89ad-4220-8c9f-d81756009f0c': {
        description: 'Bangle magnetometer',
        notify: true,
        readable: true,
        value: new Int32Array([0, 0, 0]).buffer,
        writable: true,
        onWrite: function (evt) {
          var d = evt.data && evt.data[0]
          if ([80, 40, 20, 10, 5].indexOf(d) >= 0) { Bangle.setPollInterval(1000 / d) }
        }
      },
      'f8b23a4d-89ad-4220-8c9f-d81756009f0d': {
        description: 'Bangle accelerometer',
        notify: true,
        readable: true,
        value: new Float32Array([0, 0, 0, 0, 0]).buffer
      }
    }
  })

  batteryInterval = setInterval(updateBattery, 10000)
  Bangle.on('accel', onAccel)
  Bangle.on('mag', onMag)
}
