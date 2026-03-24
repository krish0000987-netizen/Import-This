// Web stub for react-native-worklets
// react-native-reanimated v4 requires this package on native
// but on web it's not needed — we provide no-op implementations

const noop = () => {};
const identity = (val) => val;

export const shareableMappingCache = {
  set: noop,
  get: () => undefined,
  has: () => false,
  delete: noop,
};

export const serializableMappingCache = {
  set: noop,
  get: () => undefined,
  has: () => false,
  delete: noop,
};

export function createSerializable(obj) {
  return obj;
}

export function isSerializableRef() {
  return false;
}

export function isShareableRef() {
  return false;
}

export function makeShareable(val) {
  return val;
}

export function makeShareableCloneRecursive(val) {
  return val;
}

export function makeShareableCloneOnUIRecursive(val) {
  return val;
}

export function runOnUI(fn) {
  return fn;
}

export function runOnUISync(fn) {
  return fn;
}

export function runOnUIAsync(fn) {
  return fn;
}

export function runOnJS(fn) {
  return fn;
}

export function scheduleOnUI(fn) {
  return fn;
}

export function scheduleOnRN(fn) {
  return fn;
}

export function executeOnUIRuntimeSync(fn) {
  return (...args) => fn(...args);
}

export function callMicrotasks() {}

export function isWorkletFunction() {
  return false;
}

export function isSynchronizable() {
  return false;
}

export function createSynchronizable(fn) {
  return fn;
}

export function createWorkletRuntime() {
  return null;
}

export function runOnRuntime(_, fn) {
  return fn;
}

export function unstable_eventLoopTask(fn) {
  return fn;
}

export const RuntimeKind = {
  UI: "UI",
  RN: "RN",
  Custom: "Custom",
};

export function getRuntimeKind() {
  return RuntimeKind.RN;
}

export function getStaticFeatureFlag() {
  return false;
}

export function setDynamicFeatureFlag() {}

export const WorkletsModule = {
  makeShareableClone: identity,
  scheduleOnUI: noop,
  executeOnUIRuntimeSync: (fn) => (...args) => fn(...args),
  installTurboModule: noop,
  createWorkletRuntime: () => null,
  scheduleOnRuntime: noop,
};
