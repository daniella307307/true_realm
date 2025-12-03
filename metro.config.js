const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Check NativeWind version and use appropriate config
module.exports = withNativeWind(config, {
  input: './global.css',
  // NativeWind v4 specific options
  projectRoot: __dirname,
});