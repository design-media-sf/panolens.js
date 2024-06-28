import { Infospot } from "../infospot/Infospot";
import { DataImage } from "../DataImage";
import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { EquirectShader } from "../shaders/EquirectShader";
import { EVENTS } from "../Constants";
/**
 * @classdesc Base Panorama
 * @constructor
 */
function Panorama() {
  this.edgeLength = 10000;
  THREE.Mesh.call(
    this,
    this.createGeometry(this.edgeLength),
    this.createMaterial()
  );
  this.type = "panorama";
  this.ImageQualityLow = 1;
  this.ImageQualityFair = 2;
  this.ImageQualityMedium = 3;
  this.ImageQualityHigh = 4;
  this.ImageQualitySuperHigh = 5;
  this.animationDuration = 1000;
  this.defaultInfospotSize = 350;
  this.container = undefined;
  this.loaded = false;
  this.linkedSpots = [];
  this.isInfospotVisible = false;

  this.linkingImageURL = undefined;
  this.linkingImageScale = undefined;
  this.renderOrder = -1;
  this.visible = false;
  this.active = false;
  this.infospotAnimation = new TWEEN.Tween(this).to(
    {},
    this.animationDuration / 2
  );
  this.addEventListener(EVENTS.CONTAINER, this.setContainer.bind(this));
  this.addEventListener("click", this.onClick.bind(this));
  this.setupTransitions();
}
Panorama.prototype = Object.assign(Object.create(THREE.Mesh.prototype), {
  constructor: Panorama,
  /**
   * Create a skybox geometry
   * @memberOf Panorama
   * @instance
   */
  createGeometry: function (edgeLength) {
    return new THREE.BoxBufferGeometry(edgeLength, edgeLength, edgeLength);
  },
  /**
   * Create equirectangular shader material
   * @param {THREE.Vector2} [repeat=new THREE.Vector2( 1, 1 )] - Texture Repeat
   * @param {THREE.Vector2} [offset=new THREE.Vector2( 0, 0 )] - Texture Offset
   * @memberOf Panorama
   * @instance
   */
  createMaterial: function (
    repeat = new THREE.Vector2(1, 1),
    offset = new THREE.Vector2(0, 0)
  ) {
    const { fragmentShader, vertexShader } = EquirectShader;
    const uniforms = THREE.UniformsUtils.clone(EquirectShader.uniforms);

    uniforms.repeat.value.copy(repeat);
    uniforms.offset.value.copy(offset);
    uniforms.opacity.value = 0.0;
    const material = new THREE.ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms,
      side: THREE.BackSide,
      transparent: true,
    });
    return material;
  },
  /**
   * Adding an object
   * @memberOf Panorama
   * @instance
   * @param {THREE.Object3D} object - The object to be added
   */
  add: function (object) {
    if (arguments.length > 1) {
      for (let i = 0; i < arguments.length; i++) {
        this.add(arguments[i]);
      }
      return this;
    }
    // In case of infospots
    if (object instanceof Infospot) {
      const { container } = this;
      if (container) {
        object.dispatchEvent({ type: EVENTS.CONTAINER, container });
      }

      object.dispatchEvent({
        type: "panolens-infospot-focus",
        method: function (vector, duration, easing) {
          /**
           * Infospot focus handler event
           * @type {object}
           * @event Panorama#panolens-viewer-handler
           * @property {string} method - Viewer function name
           * @property {*} data - The argument to be passed into the method
           */
          this.dispatchEvent({
            type: EVENTS.VIEWER_HANDLER,
            method: "tweenControlCenter",
            data: [vector, duration, easing],
          });
        }.bind(this),
      });
    }
    THREE.Object3D.prototype.add.call(this, object);
  },
  getTexture: function () {
    return this.material.uniforms.texture.value;
  },
  /**
   * Load Panorama
   * @param {boolean} immediate load immediately
   */
  load: function (immediate = true) {
    /**
     * Start loading panorama event
     * @type {object}
     * @event Panorama#load-start
     */
    this.dispatchEvent({ type: EVENTS.LOAD_START });
    if (immediate) this.onLoad();
  },
  /**
   * Click event handler
   * @param  {object} event - Click event
   * @memberOf Panorama
   * @instance
   * @fires Infospot#dismiss
   */
  onClick: function (event) {
    if (event.intersects && event.intersects.length === 0) {
      this.traverse(function (object) {
        /**
         * Dimiss event
         * @type {object}
         * @event Infospot#dismiss
         */
        object.dispatchEvent({ type: "dismiss" });
      });
    }
  },
  /**
   * Set container of this panorama
   * @param {HTMLElement|object} data - Data with container information
   * @memberOf Panorama
   * @instance
   * @fires Infospot#panolens-container
   */
  setContainer: function (data) {
    let container;
    if (data instanceof HTMLElement) {
      container = data;
    } else if (data && data.container) {
      container = data.container;
    }
    if (container) {
      this.children.forEach(function (child) {
        if (child instanceof Infospot && child.dispatchEvent) {
          /**
           * Set container event
           * @type {object}
           * @event Infospot#panolens-container
           * @property {HTMLElement} container - The container of this panorama
           */
          child.dispatchEvent({ type: EVENTS.CONTAINER, container: container });
        }
      });
      this.container = container;
    }
  },
  /**
   * This will be called when panorama is loaded
   * @memberOf Panorama
   * @instance
   * @fires Panorama#loaded
   */
  onLoad: function () {
    this.loaded = true;
    /**
     * Loaded panorama event
     * @type {object}
     * @event Panorama#loaded
     */
    this.dispatchEvent({ type: EVENTS.LOADED });
    /**
     * Alias of loaded event
     * @type {object}
     * @event Panorama#load
     */
    this.dispatchEvent({ type: EVENTS.LOAD });
    /**
     * Panorama is ready to be animated
     * @event Panorama#ready
     * @type {object}
     */
    this.dispatchEvent({ type: EVENTS.READY });
  },
  /**
   * This will be called when panorama is in progress
   * @memberOf Panorama
   * @instance
   * @fires Panorama#progress
   */
  onProgress: function (progress) {
    /**
     * Loading panorama progress event
     * @type {object}
     * @event Panorama#progress
     * @property {object} progress - The progress object containing loaded and total amount
     */
    this.dispatchEvent({ type: EVENTS.PROGRESS, progress: progress });
  },
  /**
   * This will be called when panorama loading has error
   * @memberOf Panorama
   * @instance
   * @fires Panorama#error
   */
  onError: function () {
    /**
     * Loading panorama error event
     * @type {object}
     * @event Panorama#error
     */
    this.dispatchEvent({ type: EVENTS.READY });
  },
  /**
   * Get zoom level based on window width
   * @memberOf Panorama
   * @instance
   * @return {number} zoom level indicating image quality
   */
  getZoomLevel: function () {
    let zoomLevel;
    if (window.innerWidth <= 800) {
      zoomLevel = this.ImageQualityFair;
    } else if (window.innerWidth > 800 && window.innerWidth <= 1280) {
      zoomLevel = this.ImageQualityMedium;
    } else if (window.innerWidth > 1280 && window.innerWidth <= 1920) {
      zoomLevel = this.ImageQualityHigh;
    } else if (window.innerWidth > 1920) {
      zoomLevel = this.ImageQualitySuperHigh;
    } else {
      zoomLevel = this.ImageQualityLow;
    }
    return zoomLevel;
  },
  /**
   * Update texture of a panorama
   * @memberOf Panorama
   * @instance
   * @param {THREE.Texture} texture - Texture to be updated
   */
  updateTexture: function (texture) {
    this.material.uniforms.texture.value = texture;
  },
  /**
   * Toggle visibility of infospots in this panorama
   * @param  {boolean} isVisible - Visibility of infospots
   * @param  {number} delay - Delay in milliseconds to change visibility
   * @memberOf Panorama
   * @instance
   * @fires Panorama#infospot-animation-complete
   */
  toggleInfospotVisibility: function (isVisible, delay) {
    delay = delay !== undefined ? delay : 0;
    const visible =
      isVisible !== undefined
        ? isVisible
        : this.isInfospotVisible
        ? false
        : true;
    this.traverse(function (object) {
      if (object instanceof Infospot) {
        if (visible) {
          object.show(delay);
        } else {
          object.hide(delay);
        }
      }
    });
    this.isInfospotVisible = visible;
    // Animation complete event
    this.infospotAnimation
      .onComplete(
        function () {
          /**
           * Complete toggling infospot visibility
           * @event Panorama#infospot-animation-complete
           * @type {object}
           */
          this.dispatchEvent({
            type: EVENTS.INFOSPOT_ANIMATION_COMPLETE,
            visible: visible,
          });
        }.bind(this)
      )
      .delay(delay)
      .start();
  },
  /**
   * Set image of this panorama's linking infospot
   * @memberOf Panorama
   * @instance
   * @param {string} url   - Url to the image asset
   * @param {number} scale - Scale factor of the infospot
   */
  setLinkingImage: function (url, scale) {
    this.linkingImageURL = url;
    this.linkingImageScale = scale;
  },
  /**
   * Link one-way panorama
   * @param  {Panorama} pano  - The panorama to be linked to
   * @param  {THREE.Vector3} position - The position of infospot which navigates to the pano
   * @param  {number} [imageScale=300] - Image scale of linked infospot
   * @param  {string} [imageSrc=DataImage.Arrow] - The image source of linked infospot
   * @memberOf Panorama
   * @instance
   */
  link: function (pano, position, imageScale, imageSrc) {
    let scale, img;
    this.visible = true;
    if (!position) {
      console.warn("Please specify infospot position for linking");
      return;
    }
    // Infospot scale
    if (imageScale !== undefined) {
      scale = imageScale;
    } else if (pano.linkingImageScale !== undefined) {
      scale = pano.linkingImageScale;
    } else {
      scale = 300;
    }
    // Infospot image
    if (imageSrc) {
      img = imageSrc;
    } else if (pano.linkingImageURL) {
      img = pano.linkingImageURL;
    } else {
      img = DataImage.Arrow;
    }
    // Creates a new infospot
    const spot = new Infospot(scale, img);
    spot.position.copy(position);
    spot.toPanorama = pano;
    spot.addEventListener(
      "click",
      function () {
        /**
         * Viewer handler event
         * @type {object}
         * @event Panorama#panolens-viewer-handler
         * @property {string} method - Viewer function name
         * @property {*} data - The argument to be passed into the method
         */
        this.dispatchEvent({
          type: EVENTS.VIEWER_HANDLER,
          method: "setPanorama",
          data: pano,
        });
      }.bind(this)
    );
    this.linkedSpots.push(spot);
    this.add(spot);
    this.visible = false;
  },
  reset: function () {
    this.children.length = 0;
  },
  setupTransitions: function () {
    this.fadeInAnimation = new TWEEN.Tween();
    this.fadeOutAnimation = new TWEEN.Tween();
    this.enterTransition = new TWEEN.Tween(this)
      .easing(TWEEN.Easing.Quartic.Out)
      .onComplete(
        function () {
          /**
           * Enter panorama and animation complete event
           * @event Panorama#enter-complete
           * @type {object}
           */
          this.dispatchEvent({ type: EVENTS.ENTER_COMPLETE });
        }.bind(this)
      )
      .start();
    this.leaveTransition = new TWEEN.Tween(this).easing(
      TWEEN.Easing.Quartic.Out
    );
  },
  /**
   * Start fading in animation
   * @memberOf Panorama
   * @instance
   * @fires Panorama#enter-fade-complete
   */
  fadeIn: function (duration = this.animationDuration) {
    /**
     * Fade in event
     * @event Panorama#fade-in
     * @type {object}
     */
    this.dispatchEvent({ type: EVENTS.FADE_IN });
    const { opacity } = this.material.uniforms
      ? this.material.uniforms
      : { opacity: this.material.opacity };
    const onStart = function () {
      this.visible = true;
      /**
       * Enter panorama fade in start event
       * @event Panorama#enter-fade-start
       * @type {object}
       */
      this.dispatchEvent({ type: EVENTS.ENTER_FADE_START });
    }.bind(this);
    const onComplete = function () {
      this.toggleInfospotVisibility(true, duration / 2);
      /**
       * Enter panorama fade complete event
       * @event Panorama#enter-fade-complete
       * @type {object}
       */
      this.dispatchEvent({ type: EVENTS.ENTER_FADE_COMPLETE });
    }.bind(this);
    this.fadeOutAnimation.stop();
    this.fadeInAnimation = new TWEEN.Tween(opacity)
      .to({ value: 1 }, duration)
      .easing(TWEEN.Easing.Quartic.Out)
      .onStart(onStart)
      .onComplete(onComplete)
      .start();
  },
  /**
   * Start fading out animation
   * @memberOf Panorama
   * @instance
   */
  fadeOut: function (duration = this.animationDuration) {
    /**
     * Fade out event
     * @event Panorama#fade-out
     * @type {object}
     */
    this.dispatchEvent({ type: EVENTS.FADE_OUT });
    const { opacity } = this.material.uniforms
      ? this.material.uniforms
      : { opacity: this.material.opacity };
    const onComplete = function () {
      this.visible = false;
      /**
       * Leave panorama complete event
       * @event Panorama#leave-complete
       * @type {object}
       */
      this.dispatchEvent({ type: EVENTS.LEAVE_COMPLETE });
    }.bind(this);
    this.fadeInAnimation.stop();
    this.fadeOutAnimation = new TWEEN.Tween(opacity)
      .to({ value: 0 }, duration)
      .easing(TWEEN.Easing.Quartic.Out)
      .onComplete(onComplete)
      .start();
  },
  /**
   * This will be called when entering a panorama
   * @memberOf Panorama
   * @instance
   * @fires Panorama#enter
   * @fires Panorama#enter-start
   */
  onEnter: function () {
    const duration = this.animationDuration;
    /**
     * Enter panorama event
     * @event Panorama#enter
     * @type {object}
     */
    this.dispatchEvent({ type: EVENTS.ENTER });
    this.leaveTransition.stop();
    this.enterTransition
      .to({}, duration)
      .onStart(
        function () {
          /**
           * Enter panorama and animation starting event
           * @event Panorama#enter-start
           * @type {object}
           */
          this.dispatchEvent({ type: EVENTS.ENTER_START });

          if (this.loaded) {
            /**
             * Panorama is ready to go
             * @event Panorama#ready
             * @type {object}
             */
            this.dispatchEvent({ type: EVENTS.READY });
          } else {
            this.load();
          }
        }.bind(this)
      )
      .start();
    this.children.forEach((child) => {
      child.dispatchEvent({ type: "panorama-enter" });
    });
    this.active = true;
  },
  /**
   * This will be called when leaving a panorama
   * @memberOf Panorama
   * @instance
   * @fires Panorama#leave
   */
  onLeave: function () {
    const duration = this.animationDuration;
    this.enterTransition.stop();
    this.leaveTransition
      .to({}, duration)
      .onStart(
        function () {
          /**
           * Leave panorama and animation starting event
           * @event Panorama#leave-start
           * @type {object}
           */
          this.dispatchEvent({ type: EVENTS.LEAVE_START });
          this.fadeOut(duration);
          this.toggleInfospotVisibility(false);
        }.bind(this)
      )
      .start();
    /**
     * Leave panorama event
     * @event Panorama#leave
     * @type {object}
     */
    this.dispatchEvent({ type: EVENTS.LEAVE });
    // dispatch panorama-leave to descendents
    this.traverse((child) => child.dispatchEvent({ type: "panorama-leave" }));
    // mark active
    this.active = false;
  },
  /**
   * Dispose panorama
   * @memberOf Panorama
   * @instance
   */
  dispose: function () {
    const { material } = this;
    if (material && material.uniforms && material.uniforms.texture)
      material.uniforms.texture.value.dispose();
    this.infospotAnimation.stop();
    this.fadeInAnimation.stop();
    this.fadeOutAnimation.stop();
    this.enterTransition.stop();
    this.leaveTransition.stop();
    /**
     * On panorama dispose handler
     * @type {object}
     * @event Panorama#panolens-viewer-handler
     * @property {string} method - Viewer function name
     * @property {*} data - The argument to be passed into the method
     */
    this.dispatchEvent({
      type: EVENTS.VIEWER_HANDLER,
      method: "onPanoramaDispose",
      data: this,
    });
    // recursive disposal on 3d objects
    function recursiveDispose(object) {
      const { geometry, material } = object;
      for (let i = object.children.length - 1; i >= 0; i--) {
        recursiveDispose(object.children[i]);
        object.remove(object.children[i]);
      }
      if (object instanceof Infospot) {
        object.dispose();
      }

      if (geometry) {
        geometry.dispose();
        object.geometry = null;
      }
      if (material) {
        material.dispose();
        object.material = null;
      }
    }
    recursiveDispose(this);
    if (this.parent) {
      this.parent.remove(this);
    }
  },
});
export { Panorama };
