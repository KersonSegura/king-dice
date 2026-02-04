const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb', 'gltf', 'bin');
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx');

module.exports = config;
