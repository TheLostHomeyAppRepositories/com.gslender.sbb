'use strict';

const { Driver } = require('homey');
const Bond = require('../../lib/bond');

class FanDriver extends Driver {

  async onInit() {
    this.log(`FanDriver init...`);
    this.enableRespDebug = true;
  }

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

}

module.exports = FanDriver;
