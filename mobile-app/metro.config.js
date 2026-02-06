const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb', 'gltf', 'bin');
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx');
// Use only this app's node_modules so we don't pick up parent repo's React
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
