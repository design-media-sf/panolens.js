import * as THREE from "three";
import { Panorama } from "./Panorama";
import { PanoMoments } from "../loaders/PanoMomentsLoader";
import { EVENTS } from "../Constants";
/**
 * PanoMoments Panorama
 * @param {object} identifier PanoMoment identifier
 */
function PanoMoment(identifier) {
  Panorama.call(this);
  // PanoMoments
  this.identifier = identifier;
  this.PanoMoments = null;
  this.momentData = null;
  this.status = EVENTS.PANOMOMENT.NONE;
  // Panolens
  this.container = null;
  this.camera = null;
  this.controls = null;
  this.defaults = {};
  // Setup Dispatcher
  this.setupDispatcher();
  // Event Bindings
  this.handlerUpdateCallback = () => this.updateCallback();
  this.handlerWindowResize = () => this.onWindowResize();
  // Event Listeners
  this.addEventListener(EVENTS.CONTAINER, ({ container }) =>
    this.onPanolensContainer(container)
  );
  this.addEventListener(EVENTS.CAMERA, ({ camera }) =>
    this.onPanolensCamera(camera)
  );
  this.addEventListener(EVENTS.CONTROLS, ({ controls }) =>
    this.onPanolensControls(controls)
  );
  this.addEventListener(EVENTS.FADE_IN, () => this.enter());
  this.addEventListener(EVENTS.LEAVE_COMPLETE, () => this.leave());
  this.addEventListener(EVENTS.LOAD_START, () => this.disableControl());
  this.addEventListener(EVENTS.PANOMOMENT.READY, () => this.enableControl());
}
PanoMoment.prototype = Object.assign(Object.create(Panorama.prototype), {
  constructor: PanoMoment,
  /**
   * When window is resized
   * @virtual
   */
  onWindowResize: function () {},
  /**
   * When container reference dispatched
   * @param {HTMLElement} container
   */
  onPanolensContainer: function (container) {
    this.container = container;
  },
  /**
   * When camera reference dispatched
   * @param {THREE.Camera} camera
   */
  onPanolensCamera: function (camera) {
    Object.assign(this.defaults, { fov: camera.fov });
    this.camera = camera;
  },
  /**
   * When control references dispatched
   * @param {THREE.Object[]} controls
   */
  onPanolensControls: function (controls) {
    const [{ minPolarAngle, maxPolarAngle }] = controls;
    Object.assign(this.defaults, { minPolarAngle, maxPolarAngle });

    this.controls = controls;
  },
  /**
   * Intercept default dispatcher
   */
  setupDispatcher: function () {
    const dispatch = this.dispatchEvent.bind(this);
    const values = Object.values(EVENTS.PANOMOMENT);

    this.dispatchEvent = function (event) {
      if (values.includes(event.type)) {
        this.status = event.type;
      }
      dispatch(event);
    };
  },
  /**
   * Enable Control
   */
  enableControl: function () {
    const [OrbitControls] = this.controls;
    OrbitControls.enabled = true;
  },
  /**
   * Disable Control
   */
  disableControl: function () {
    const [OrbitControls] = this.controls;
    OrbitControls.enabled = false;
  },
  /**
   * Load Pano Moment Panorama
   */
  load: function () {
    Panorama.prototype.load.call(this, false);

    const { identifier, renderCallback, readyCallback, loadedCallback } = this;
    this.PanoMoments = new PanoMoments(
      identifier,
      renderCallback.bind(this),
      readyCallback.bind(this),
      loadedCallback.bind(this)
    );
  },
  /**
   * Update intial heading based on moment data
   */
  updateHeading: function () {
    if (!this.momentData) return;
    const {
      momentData: { start_frame },
    } = this;
    const angle = ((start_frame + 180) / 180) * Math.PI;
    // reset center to initial lookat
    this.dispatchEvent({
      type: EVENTS.VIEWER_HANDLER,
      method: "setControlCenter",
    });
    // rotate to initial frame center
    this.dispatchEvent({
      type: EVENTS.VIEWER_HANDLER,
      method: "rotateControlLeft",
      data: angle,
    });
  },
  /**
   * Get Camera Yaw for PanoMoment texture
   */
  getYaw: function () {
    const {
      camera: {
        rotation: { y },
      },
      momentData: { clockwise },
    } = this;

    const rotation = THREE.Math.radToDeg(y) + 180;
    const yaw = ((clockwise ? 90 : -90) - rotation) % 360;
    return yaw;
  },
  /**
   * On Panolens update callback
   */
  updateCallback: function () {
    if (!this.momentData || this.status === EVENTS.PANOMOMENT.NONE) return;
    this.setPanoMomentYaw(this.getYaw());
  },
  /**
   * On Pano Moment Render Callback
   */
  renderCallback: function (video, momentData) {
    if (!this.momentData) {
      this.momentData = momentData;
      const texture = new THREE.Texture(video);
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.format = THREE.RGBFormat;
      this.updateTexture(texture);
      this.dispatchEvent({ type: EVENTS.PANOMOMENT.FIRST_FRAME_DECODED });
      Panorama.prototype.onLoad.call(this);
    }
  },
  /**
   * On Pano Moment Ready Callback
   */
  readyCallback: function () {
    this.dispatchEvent({ type: EVENTS.PANOMOMENT.READY });
  },
  /**
   * On Pano Moment Loaded Callback
   */
  loadedCallback: function () {
    this.dispatchEvent({ type: EVENTS.PANOMOMENT.COMPLETED });
  },
  /**
   * Set PanoMoment yaw
   * @memberOf PanoMomentPanorama
   * @param {number} yaw - yaw value from 0 to 360 in degree
   */
  setPanoMomentYaw: function (yaw) {
    const {
      status,
      momentData,
      PanoMoments: { render, frameCount, textureReady },
    } = this;
    // textureReady() must be called before render()
    if (textureReady()) this.getTexture().needsUpdate = true;
    if (
      (status !== EVENTS.PANOMOMENT.READY &&
        status !== EVENTS.PANOMOMENT.COMPLETED) ||
      !momentData
    )
      return;
    render((yaw / 360) * frameCount);
  },
  /**
   * Enter Panorama
   */
  enter: function () {
    this.updateHeading();
    this.addEventListener(EVENTS.WIDNOW_RESIZE, this.handlerWindowResize);
    // Add update callback
    this.dispatchEvent({
      type: EVENTS.VIEWER_HANDLER,
      method: "addUpdateCallback",
      data: this.handlerUpdateCallback,
    });
  },
  /**
   * Leave Panorama
   */
  leave: function () {
    const {
      camera,
      controls: [OrbitControls],
      defaults: { minPolarAngle, maxPolarAngle, fov },
    } = this;
    Object.assign(OrbitControls, { minPolarAngle, maxPolarAngle });
    camera.fov = fov;
    camera.updateProjectionMatrix();
    this.removeEventListener(EVENTS.WIDNOW_RESIZE, this.handlerWindowResize);
    // Remove update callback
    this.dispatchEvent({
      type: EVENTS.VIEWER_HANDLER,
      method: "removeUpdateCallback",
      data: this.handlerUpdateCallback,
    });
  },
  /**
   * Dispose Panorama
   */
  dispose: function () {
    this.leave();
    this.PanoMoments.dispose();
    this.PanoMoments = null;
    this.momentData = null;
    this.container = null;
    this.camera = null;
    this.controls = null;
    this.defaults = null;
    Panorama.prototype.dispose.call(this);
  },
});
export { PanoMoment };
