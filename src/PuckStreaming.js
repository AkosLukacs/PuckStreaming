// upload this to the Puck

var magRate = 5, batteryInterval;

function onMag(d) {
  // print('mag:', d)
  NRF.updateServices({
    'f8b23a4d-89ad-4220-8c9f-d81756009f0c': {
      'f8b23a4d-89ad-4220-8c9f-d81756009f0c': {
        value: new Int32Array([d.x, d.y, d.z]).buffer,
        notify: true
      }
    }
  })
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
  NRF.on('connect', function() {Puck.magOn(magRate); digitalPulse(LED2, 1, 100)})
  NRF.on('disconnect', function() {Puck.magOff(); digitalPulse(LED1, 1, 100)})

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
    // Magnetometer service
    'f8b23a4d-89ad-4220-8c9f-d81756009f0c': {
      'f8b23a4d-89ad-4220-8c9f-d81756009f0c': {
        description: 'Puck magnetometer',
        notify: true,
        readable: true,
        value: new Int32Array([0, 0, 0]).buffer,
        writable: true,
        onWrite: function(evt) {
          // pulse the blue LED if we got a new sample rate
          digitalPulse(LED3, 1, 100)
          var d = evt.data && evt.data[0]
          if (d === 0) {Puck.magOff()}
          // lazy mode on: only integer sample rates work

          // Valid sample rates:
          // 80 Hz - 900uA
          // 40 Hz - 550uA
          // 20 Hz - 275uA
          // 10 Hz - 137uA
          // 5 Hz - 69uA
          // 2.5 Hz - 34uA
          // 1.25 Hz - 17uA
          // 0.63 Hz - 8uA
          // 0.31 Hz - 8uA
          // 0.16 Hz - 8uA
          // 0.08 Hz - 8uA
          if ([80, 40, 20, 10, 5].indexOf(d) >= 0) {Puck.magOn(d); magRate = d}
        }
      }
    }
  })

  /// don't turn on the magnetometer yet
  //Puck.magOn(5)

  // The button toggles the red LED.
  // Just an easy way to "change" the battery level, since a LED continuously turned on causes a measurable voltage drop on a CR2032.
  setWatch(function() {LED1.toggle()}, BTN, {repeat: true})
  batteryInterval = setInterval(updateBattery, 10000)

  Puck.on('mag', onMag)
}
