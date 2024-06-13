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

function hasProperties(obj, props) {
  return props.every(prop => obj.hasOwnProperty(prop));
}


// Export all at once using an object
module.exports = {
  VALID_TOKEN_STRING, 
  OKAY_STRING, 
  FAILED_STRING, 
  INVALID_TOKEN_STRING, 
  INVALID_IPADDRESS_STRING, 
  isEmptyOrUndefined, 
  isValidIPAddress, 
  hasProperties };