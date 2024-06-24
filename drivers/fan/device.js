'use strict';

const { Device } = require('homey');
const Bond = require('../../lib/bond');

function hasProperties(obj, props) {
  if (!obj) return false;
  return props.every(prop => obj.hasOwnProperty(prop));
}

class FanDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.bond = new Bond(
      this.getSetting('ipAddress'),
      this.getSetting('token'),
      this.log
    );
    if (!this.bond.isIpAddressValid()) throw new Error("INVALID IP ADDRESS");
    if (!this.bond.isTokenValid()) throw new Error("INVALID TOKEN");
   
    await this.initialize();

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

  async getDeviceState() {
    const state = await this.bond.getBondDeviceState(this.getData().id);
    if (state.status === Bond.OKAY) this.updateCapabilityValues(state);
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes("ipAddress") || changedKeys.includes("token")) { 
      if (!this.bond.checkValidIpAddress(newSettings.ipAddress)) throw new Error("INVALID IP ADDRESS");
      if (this.bond.isEmptyOrUndefined(newSettings.token)) throw new Error("INVALID TOKEN");
      const response = await this.driver.checkSettings(newSettings.ipAddress, newSettings.token);
      if (response.status != Bond.VALID_TOKEN) {
        throw new Error(response.status);
      } else {
        return super.onSettings({ oldSettings, newSettings, changedKeys });
      }
    }
  }

  async initialize() {
    this.props = await this.bond.getBondDeviceProperties(this.getData().id);
    this.log(`FanDevice has been initialized props=${JSON.stringify(this.props)}`);

    if (hasProperties(this.props.data, ["feature_light"]) && this.props.data.feature_light) {
      // fan with light   
      this.registerCapabilityListener("onoff", async (value) => {
        if (value) {
          await this.bond.sendBondAction(this.getData().id, "TurnLightOn", {});
        } else {
          await this.bond.sendBondAction(this.getData().id, "TurnLightOff", {});
        }
      });

      if (hasProperties(this.props.data, ["feature_brightness"]) && this.props.data.feature_brightness) {
        // fan with light that dims
        this.addCapability("dim");
        this.registerCapabilityListener("dim", async (value) => {
          await this.bond.sendBondAction(this.getData().id, "SetBrightness", { "argument": value * 100 });
        });
      } else {
        this.removeCapability("dim");
      }
    } else {
      // basic fan (no light)
      this.removeCapability("dim");
      this.registerCapabilityListener("onoff", async (value) => {
        if (value) {
          await this.bond.sendBondAction(this.getData().id, "TurnOn", {});
        } else {
          await this.bond.sendBondAction(this.getData().id, "TurnOff", {});
        }
      });
    }

    if (hasProperties(this.props.data, ["max_speed"])) {
      // fan with max_speed 
      this.addCapability("fan_speed");
      this.setCapabilityOptions("fan_speed", {
        min: 0,
        max: this.props.data.max_speed
      });
      this.registerCapabilityListener("fan_speed", async (value) => {
        if (value == 0) { 
          await this.bond.sendBondAction(this.getData().id, "TurnOff", {});
        } else {
          await this.bond.sendBondAction(this.getData().id, "TurnOn", {});
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": value });
        }
      });
      this.removeCapability("fan_mode");
    } else {
      // fan without any max_speed (so assuming 3 speed mode)
      this.addCapability("fan_mode");
      this.removeCapability("fan_speed");
      this.registerCapabilityListener("fan_mode", async (value) => {
        if (value === 'off') {
          this.setCapabilityValue('onoff', false);
          await this.bond.sendBondAction(this.getData().id, "TurnOff", {});
        }
        if (value === 'low') {
          this.setCapabilityValue('onoff', true);
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": 1 });
        }

        if (value === 'medium') {
          this.setCapabilityValue('onoff', true);
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": 50 });
        }

        if (value === 'high') {
          this.setCapabilityValue('onoff', true);
          await this.bond.sendBondAction(this.getData().id, "SetSpeed", { "argument": 100 });
        }
      });
    }

    this.addCapability("fan_direction");    
    this.registerCapabilityListener("fan_direction", async (value) => {  
      await this.bond.sendBondAction(this.getData().id, "SetDirection", { "argument": Number(value) });      
    });
  }
  
  async updateCapabilityValues(state) {
    if (hasProperties(this.props.data, ["feature_light"]) && this.props.data.feature_light) {
      // fan with light   
      if (hasProperties(state.data, ["light"])) {
        this.setCapabilityValue('onoff', state.data.light === 1);
      }
      if (hasProperties(this.props.data, ["feature_brightness"]) && this.props.data.feature_brightness) {

        if (hasProperties(state.data, ["brightness"])) {
          this.setCapabilityValue('dim', state.data.brightness/100);
        }
      }
    } else {
      // basic fan (no light)
      if (hasProperties(state.data, ["power"])) {
        this.setCapabilityValue('onoff', state.data.power === 1);
      }
    }

    if (hasProperties(state.data, ["direction"])) {
      this.setCapabilityValue('fan_direction', state.data.direction);
    }

    if (hasProperties(state.data, ["speed"])) {
      if (hasProperties(this.props.data, ["max_speed"])) {
        // fan with max_speed   
        this.setCapabilityValue('fan_speed', state.data.speed);
      } else {  
        // fan without any max_speed (so assuming 3 speed mode)
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
  /*
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
    const details = await this.getDeviceDetails();
    this.log(JSON.stringify(details));
    this.setSettings({ details: details });

    /// get device state
    await this.getDeviceState();

    /// now poll every 10 sec for current state
    this.pollingId = this.homey.setInterval(async () => {
      await this.getDeviceState();
      await this.getDeviceProperties();
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

  async getDeviceProperties() {
    const ipAddress = this.getSetting('ipAddress');
    const token = this.getSetting('token');
    return await this.driver.getBondDeviceProperties(ipAddress, token, this.getData().id);
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
*/
}

module.exports = FanDevice;
