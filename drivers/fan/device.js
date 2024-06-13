'use strict';

const { Device } = require('homey');
const OKAY_STRING = 'ok';

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
        await this.driver.sendBondAction(ipAddress, token, this.getData().id, "TurnOn", {});
      } else {
        await this.driver.sendBondAction(ipAddress, token, this.getData().id, "TurnOff", {});
      }
    });


    this.registerCapabilityListener("fan_mode", async (value) => {
      const ipAddress = self.getSetting('ipAddress');
      const token = self.getSetting('token');
      if (value === 'off') {
        this.setCapabilityValue('onoff', false);
        await this.driver.sendBondAction(ipAddress, token, this.getData().id, "TurnOff", {});
      }
      if (value === 'low') {
        this.setCapabilityValue('onoff', true);
        await this.driver.sendBondAction(ipAddress, token, this.getData().id, "SetSpeed", { "argument": 1 });
      }

      if (value === 'medium') {
        this.setCapabilityValue('onoff', true);
        await this.driver.sendBondAction(ipAddress, token, this.getData().id, "SetSpeed", { "argument": 50 });
      }

      if (value === 'high') {
        this.setCapabilityValue('onoff', true);
        await this.driver.sendBondAction(ipAddress, token, this.getData().id, "SetSpeed", { "argument": 100 });
      }
    });

    await this.getDeviceState();
    /// now poll every 10 sec for current state
    this.pollingId = this.homey.setInterval(async () => {
      await this.getDeviceState();
    }, 10000);
  }

  async onUninit() {
    this.homey.clearInterval(this.pollingId);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes("ipAddress") || changedKeys.includes("token")) {
      const response = await this.driver.checkSettings(newSettings.ipAddress, newSettings.token);
      if (response.status != VALID_TOKEN_STRING) {
        throw new Error(response.status);
      } else {
        return super.onSettings({ oldSettings, newSettings, changedKeys });
      }
    }
  }

  async getDeviceState() {
    const ipAddress = this.getSetting('ipAddress');
    const token = this.getSetting('token');
    const state = await this.driver.getBondDeviceState(ipAddress, token, this.getData().id);
    if (state.status === OKAY_STRING) this.updateCapabilities(state);
  }

  async updateCapabilities(state) {
    if (hasProperties(state, ["power", "speed"])) {
      this.setCapabilityValue('onoff', state.data.power === 1);
      if (state.data.speed == 100) {
        this.setCapabilityValue('fan_mode', 'high');
      } else if (state.data.speed == 50) {
        this.setCapabilityValue('fan_mode', 'medium');
      } else {
        this.setCapabilityValue('fan_mode', 'low');
      }
    }
  }
}


module.exports = FanDevice;
