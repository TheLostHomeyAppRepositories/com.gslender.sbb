'use strict';

const { Driver } = require('homey');
const Bond = require('../../lib/bond');

class FanDriver extends Driver {

  async onInit() {
    this.log(`FanDriver init...`);
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
    session.setHandler("check_details", async (data) =>  {
      this.log('check_details data=', data);
      // now call the app to check that it is valid
      const response = await this.checkSettings(data.ipAddress, data.token);
      if (response.status === Bond.VALID_TOKEN) {
        return response.data;
      } else {
        throw new Error(response.status);
      }
    });

    await session.showView("device_ip_n_token");
  }

  async checkSettings(ipAddress, token) {
    const bond = new Bond(ipAddress,token,this.log,true);
    const fmw = await bond.getBondFirmware();
    if (fmw.status != Bond.OKAY) return fmw;
    const devices = await bond.getBondDevices();
    this.log(`devices = ${JSON.stringify(devices)}`);
    if (Array.isArray(devices.data) && devices.data.length > 0 && devices.data[0]) {
      const device = await bond.getBondDevice(devices.data[0]);
      this.log(`device = ${JSON.stringify(device)}`);
      return device;
    }
    return devices;
  }

/*
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
  
  async getBondDeviceProperties(ipAddress, token, deviceID,) {
      if (!isValidIPAddress(ipAddress) || isEmptyOrUndefined(token)) return {};
      const uri = `http://${ipAddress}/v2/devices/${deviceID}/properties`;
      if (this.enableRespDebug) this.log(`getDeviceProperties() ${uri}`);
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
          respData.status = OKAY_STRING;
          respData.data = await response.json();
          if (this.enableRespDebug) this.log(`fetch.response=${JSON.stringify(respData)}`);
        }
  
        if (response.status == 401) {
          respData.status = INVALID_TOKEN_STRING;
          this.homey.clearInterval(this.pollTimer);
          this.log(`Incorrect Token !?`);
        }
      } catch (e) {
        if (this.enableRespDebug) this.log(`getDeviceProperties() ERROR: ${e}`);
      }
      return respData;
  }

  async getBondDeviceState(ipAddress, token, deviceID,) {
    if (!isValidIPAddress(ipAddress) || isEmptyOrUndefined(token)) return {};
    const uri = `http://${ipAddress}/v2/devices/${deviceID}/state`;
    if (this.enableRespDebug) this.log(`getBondDeviceState() ${uri}`);
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
        respData.status = OKAY_STRING;
        respData.data = await response.json();
        if (this.enableRespDebug) this.log(`fetch.response=${JSON.stringify(respData)}`);
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
    */

}

module.exports = FanDriver;
