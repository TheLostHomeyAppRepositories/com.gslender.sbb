'use strict';

const { Driver } = require('homey');

class FanDriver extends Driver {

  /**
   * onPairListDevices is called when a user is adding a device
   * and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();

    const devices = Object.values(discoveryResults).map(discoveryResult => {
      this.log('discoveryResult.txt.name=',JSON.stringify(discoveryResult, null, 2));
      return {
        name: discoveryResult.name,
        data: {
          id: discoveryResult.host,
        },
      };
    });

    return devices;
  }

}

module.exports = FanDriver;
