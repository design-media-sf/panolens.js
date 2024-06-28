import { version, dependencies } from "../package.json";
/**
 * REVISION
 * @module REVISION
 * @example PANOLENS.REVISION
 * @type {string} revision
 */
export const REVISION = version.split(".")[1];
/**
 * VERSION
 * @module VERSION
 * @example PANOLENS.VERSION
 * @type {string} version
 */
export const VERSION = version;
/**
 * THREEJS REVISION
 * @module THREE_REVISION
 * @example PANOLENS.THREE_REVISION
 * @type {string} threejs revision
 */
export const THREE_REVISION = dependencies.three.split(".")[1];
/**
 * THREEJS VERSION
 * @module THREE_VERSION
 * @example PANOLENS.THREE_VERSION
 * @type {string} threejs version
 */
export const THREE_VERSION = dependencies.three.replace(/[^0-9.]/g, "");
/**
 * CONTROLS
 * @module CONTROLS
 * @example PANOLENS.CONTROLS.ORBIT
 * @property {number} ORBIT 0
 * @property {number} DEVICEORIENTATION 1
 */
export const CONTROLS = { ORBIT: 0, DEVICEORIENTATION: 1 };
/**
 * MODES
 * @module MODES
 * @example PANOLENS.MODES.UNKNOWN
 * @property {number} UNKNOWN 0
 * @property {number} NORMAL 1
 * @property {number} CARDBOARD 2
 * @property {number} STEREO 3
 */
export const MODES = { UNKNOWN: 0, NORMAL: 1, CARDBOARD: 2, STEREO: 3 };
/**
 * STEREOFORMAT
 * @module STEREOFORMAT
 * @example PANOLENS.STEREOFORMAT.TAB
 * @property {number} TAB 0
 * @property {number} SBS 1
 */
export const STEREOFORMAT = { TAB: 0, SBS: 1 };
/**
 * EVENTS
 * @module EVENTS
 * @example PANOLENS.EVENTS.LOAD
 * @property {string} LOAD_START 0
 * @property {string} INFOSPOT_ANIMATION 0
 */
export const EVENTS = {
  CONTAINER: "panolens-container",
  CAMERA: "panolens-camera",
  CONTROLS: "panolens-controls",
  LOAD_START: "load-start",
  LOAD: "load",
  LOADED: "loaded",
  READY: "ready",
  ERROR: "error",
  ENTER: "enter",
  ENTER_START: "enter-start",
  ENTER_FADE_START: "enter-fade-start",
  ENTER_FADE_COMPLETE: "enter-fade-complete",
  ENTER_COMPLETE: "enter-complete",
  FADE_IN: "fade-in",
  FADE_OUT: "fade-out",
  PROGRESS: "progress",
  LEAVE: "leave",
  LEAVE_START: "leave-start",
  LEAVE_COMPLETE: "leave-complete",
  INFOSPOT_ANIMATION_COMPLETE: "infospot-animation-complete",
  VIEWER_HANDLER: "panolens-viewer-handler",
  MODE_CHANGE: "mode-change",
  WIDNOW_RESIZE: "window-resize",
  MEDIA: {
    PLAY: "play",
    PAUSE: "pause",
    VOLUME_CHANGE: "volumechange",
  },
  RETICLE: {
    RETICLE_RIPPLE_START: "reticle-ripple-start",
    RETICLE_RIPPLE_END: "reticle-ripple-end",
    RETICLE_START: "reticle-start",
    RETICLE_END: "reticle-end",
    RETICLE_UPDATE: "reticle-update",
  },
  PANOMOMENT: {
    NONE: "panomoments.none",
    FIRST_FRAME_DECODED: "panomoments.first_frame_decoded",
    READY: "panomoments.ready",
    COMPLETED: "panomoments.completed",
  },
};
