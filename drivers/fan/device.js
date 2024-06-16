'use strict';

const { Device } = require('homey');
const { VALID_TOKEN_STRING, OKAY_STRING, FAILED_STRING, INVALID_TOKEN_STRING, INVALID_IPADDRESS_STRING, isEmptyOrUndefined, isValidIPAddress, hasProperties } = require('./const.js');

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
        await self.driver.sendBondAction(ipAddress, token, self.getData().id, "TurnOn", {});
      } else {
        await self.driver.sendBondAction(ipAddress, token, self.getData().id, "TurnOff", {});
      }
    });

    this.registerCapabilityListener("fan_mode", async (value) => {
      const ipAddress = self.getSetting('ipAddress');
      const token = self.getSetting('token');
      if (value === 'off') {
        self.setCapabilityValue('onoff', false);
        await self.driver.sendBondAction(ipAddress, token, self.getData().id, "TurnOff", {});
      }
      if (value === 'low') {
        self.setCapabilityValue('onoff', true);
        await self.driver.sendBondAction(ipAddress, token, self.getData().id, "SetSpeed", { "argument": 1 });
      }

      if (value === 'medium') {
        self.setCapabilityValue('onoff', true);
        await self.driver.sendBondAction(ipAddress, token, self.getData().id, "SetSpeed", { "argument": 50 });
      }

      if (value === 'high') {
        self.setCapabilityValue('onoff', true);
        await self.driver.sendBondAction(ipAddress, token, self.getData().id, "SetSpeed", { "argument": 100 });
      }
    });

    /// get device details and update persistent settings
    const details = await getDeviceDetails();
    this.log(JSON.stringify(details));
    this.setSettings({ details: details });

    /// get device state
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

      if (!isValidIPAddress(newSettings.ipAddress)) throw new Error(INVALID_IPADDRESS_STRING);
      if (isEmptyOrUndefined(newSettings.token)) throw new Error(INVALID_TOKEN_STRING);
      const response = await this.driver.checkSettings(newSettings.ipAddress, newSettings.token);
      if (response.status != VALID_TOKEN_STRING) {
        throw new Error(response.status);
      } else {
        return super.onSettings({ oldSettings, newSettings, changedKeys });
      }
    }
  }

  async getDeviceDetails() {
    const ipAddress = this.getSetting('ipAddress');
    const token = this.getSetting('token');
    const deviceID = this.getData().id;
    return await this.driver.getBondDevice(ipAddress, token, deviceID);
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
