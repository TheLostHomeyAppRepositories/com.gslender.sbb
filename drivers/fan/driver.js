'use strict';

const { Driver } = require('homey');
const { fetch } = require('undici');

const VALID_TOKEN_STRING = 'Valid Token :-)';
const OKAY_STRING = 'ok';
const FAILED_STRING = 'Device could not be contacted !?';
const INVALID_TOKEN_STRING = 'Token Invalid !!';
const INVALID_IPADDRESS_STRING = 'IP Address Invalid !?';

function isEmptyOrUndefined(value) {
  return value === undefined || value === null || value === '';
}

function isValidIPAddress(ipaddress) {
  // Check if ipaddress is undefined or null
  if (ipaddress === undefined || ipaddress === null) {
    return false; // Not a valid IP address
  }

  // Regular expression for IPv4 validation
  const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // Validate IP address pattern
  return ipPattern.test(ipaddress);
}

class FanDriver extends Driver {

  async onInit() {
    this.log(`${this.id} init...`);
    this.enableRespDebug = true;
  }
  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    return [];
  }

  async onPair(session) {
    const self = this;

    session.setHandler("check_details", async function (data) {
      self.log('check_details data=', data);
      // now call the app to check that it is valid
      const fmw = await self.getBondFirmware(data.ipAddress);
      if (fmw.status != OKAY_STRING) throw new Error(FAILED_STRING);
      const response = await self.getBondDevices(data.ipAddress, data.token);
      self.log('getBondDevices.response=', response);
      if (response.status === VALID_TOKEN_STRING) {
        return response.data;
      } else {
        throw new Error(response.status);
      }
    });

    await session.showView("device_ip_n_token");
  }


  async getBondDevices(ipAddress, token) {
    if (!isValidIPAddress(ipAddress)) return { status: INVALID_IPADDRESS_STRING };
    const uri = `http://${ipAddress}/v2/devices`;
    if (this.enableRespDebug) this.log(`getBondDevices() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'BOND-Token': token
        }
      });
      if (response.status == 200) {
        const responseData = await response.json();
        if (this.enableRespDebug) this.log(`fetch.response=${JSON.stringify(responseData)}`);
        if (responseData.hasOwnProperty("_")) {
          respData.data = [];
          for (const key in responseData) {
            if (key !== "_" && key !== "__") {
              respData.data.push(key);
            }
          }
          if (Array.isArray(respData.data) && respData.data.length > 0 && respData.data[0]) {
            respData = await this.getBondDevice(ipAddress, token, respData.data[0]);
          }
        }
      }

      if (response.status == 401) {
        respData.status = INVALID_TOKEN_STRING;
        this.log(`Incorrect Token !?`);
      }
    } catch (e) {
      if (this.enableRespDebug) this.log(`getBondDevices() ERROR: ${e}`);
    }
    return respData;
  }

  async getBondDevice(ipAddress, token, deviceID) {
    const uri = `http://${ipAddress}/v2/devices/${deviceID}`;
    if (this.enableRespDebug) this.log(`getBondDevice() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'BOND-Token': token
        }
      });
      respData.data = {};
      if (response.status == 200) {
        respData.status = VALID_TOKEN_STRING;
        respData.data = await response.json();
        if (this.enableRespDebug) this.log(`fetch.response=${JSON.stringify(respData)}`);
        respData.data.id = deviceID;
      }

      if (response.status == 401) {
        respData.status = INVALID_TOKEN_STRING;
        this.homey.clearInterval(this.pollTimer);
        this.log(`Incorrect Token !?`);
      }
    } catch (e) {
      if (this.enableRespDebug) this.log(`getBondDevice() ERROR: ${e}`);
    }
    return respData;
  }

  async getBondFirmware(ipAddress) {
    if (!isValidIPAddress(ipAddress)) return {};
    const uri = `http://${ipAddress}/v2/sys/version`;
    if (this.enableRespDebug) this.log(`getBondFirmware() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const responseData = await response.json();
      if (this.enableRespDebug) this.log(`fetch.response=${JSON.stringify(responseData)}`);

      respData = responseData;
      if (respData.hasOwnProperty("fw_ver")) respData.status = OKAY_STRING;
    } catch (e) {
      if (this.enableRespDebug) this.log(`getBondFirmware() ERROR: ${e}`);
      respData.status = FAILED_STRING + e;
    }
    return respData;
  }

  async sendBondAction(ipAddress, token, deviceID, action, args) {
    if (!isValidIPAddress(ipAddress) || isEmptyOrUndefined(token)) return {};
    const uri = `http://${ipAddress}/v2/devices/${deviceID}/actions/${action}`;
    if (this.enableRespDebug) this.log(`sendBondAction() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
      const response = await fetch(uri, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'BOND-Token': token
        },
        body: JSON.stringify(args)
      });
      respData.data = {};
      if (response.status == 200) {
        respData.status = OKAY_STRING;
        respData.data = await response.json();
      }

      if (response.status == 401) {
        respData.status = INVALID_TOKEN_STRING;
        this.homey.clearInterval(this.pollTimer);
        this.log(`Incorrect Token !?`);
      }
    } catch (e) {
      if (this.enableRespDebug) this.log(`sendBondAction() ERROR: ${e}`);
    }
    return respData;
  }

  ///////////////////////////////



  async getBondDeviceState(deviceID) {
    if (!isValidIPAddress(this.ipaddress) || isEmptyOrUndefined(this.token)) return {};
    const uri = `http://${this.ipaddress}/v2/devices/${deviceID}/state`;
    if (this.enableRespDebug) this.log(`getBondDeviceState() ${uri}`);
    let respData = {};

    try {
      respData.status = FAILED_STRING;
      const response = await fetch(uri, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'BOND-Token': this.token
        }
      });
      respData.data = {};
      if (response.status == 200) {
        respData.status = OKAY_STRING;
        respData.data = await response.json();
      }

      if (response.status == 401) {
        respData.status = INVALID_TOKEN_STRING;
        this.homey.clearInterval(this.pollTimer);
        this.log(`Incorrect Token !?`);
      }
    } catch (e) {
      if (this.enableRespDebug) this.log(`getBondDeviceState() ERROR: ${e}`);
    }
    return respData;
  }


  async pollState() {
    // update the devices state
    const drivers = this.homey.drivers.getDrivers();
    for (const driver in drivers) {
      const devices = this.homey.drivers.getDriver(driver).getDevices();
      for (const device of devices) {
        const deviceID = device.getData().id;
        const state = await this.getBondDeviceState(deviceID);
        if (state.status === OKAY_STRING) device.updateCapabilities(state);
      }
    }
  }
}

module.exports = FanDriver;
