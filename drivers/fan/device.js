'use strict';

const { Device } = require('homey');

function hasProperties(obj, props) {
  return props.every(prop => obj.hasOwnProperty(prop));
}

class FanDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('FanDevice has been initialized');
    const self = this;

    this.registerCapabilityListener("onoff", async (value) => {
      const ipAddress = self.getSetting('ipAddress');
      const token = self.getSetting('token');
      if (value) {
        await this.driver.sendBondAction(ipAddress,token,this.getData().id, "TurnOn", {});
      } else {
        await this.driver.sendBondAction(ipAddress,token,this.getData().id, "TurnOff", {});
      }
    });


    this.registerCapabilityListener("fan_mode", async (value) => {
      const ipAddress = self.getSetting('ipAddress');
      const token = self.getSetting('token');
      if (value === 'off') {
        this.setCapabilityValue('onoff', false);
        await this.driver.sendBondAction(ipAddress,token,this.getData().id, "TurnOff", {});
      }
      if (value === 'low') {
        this.setCapabilityValue('onoff', true);
        await this.driver.sendBondAction(ipAddress,token,this.getData().id, "SetSpeed", { "argument": 1 });
      }

      if (value === 'medium') {
        this.setCapabilityValue('onoff', true);
        await this.driver.sendBondAction(ipAddress,token,this.getData().id, "SetSpeed", { "argument": 50 });
      }

      if (value === 'high') {
        this.setCapabilityValue('onoff', true);
        await this.driver.sendBondAction(ipAddress,token,this.getData().id, "SetSpeed", { "argument": 100 });
      }
    });
  }

  // async updateCapabilities(state) {    
  //   if (hasProperties(state,["power","speed"])) {
  //     this.setCapabilityValue('onoff', state.data.power === 1);
  //     if (state.data.speed == 100) {
  //       this.setCapabilityValue('fan_mode', 'high');
  //     } else if (state.data.speed == 50) {
  //       this.setCapabilityValue('fan_mode', 'medium');
  //     } else {
  //       this.setCapabilityValue('fan_mode', 'low');
  //     }
  //   }
  // }
}


module.exports = FanDevice;
