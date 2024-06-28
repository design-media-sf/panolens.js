import * as THREE from "three";

/**
 * @classdesc Device Orientation Control
 * @constructor
 * @external DeviceOrientationControls
 * @param {THREE.Camera} camera
 * @param {HTMLElement} domElement
 */
function DeviceOrientationControls(camera, domElement) {
  var scope = this;
  var changeEvent = { type: "change" };

  var rotY = 0;
  var rotX = 0;
  var tempX = 0;
  var tempY = 0;

  this.camera = camera;
  this.camera.rotation.reorder("YXZ");
  this.domElement = domElement !== undefined ? domElement : document;

  this.enabled = true;

  this.deviceOrientation = {};
  this.screenOrientation = 0;

  this.alpha = 0;
  this.alphaOffsetAngle = 0;
  this.initialOffset = null;

  var onDeviceOrientationChangeEvent = function ({ alpha, beta, gamma }) {
    if (scope.initialOffset === null) {
      scope.initialOffset = alpha;
    }
    alpha = alpha - scope.initialOffset;
    if (alpha < 0) alpha += 360;
    scope.deviceOrientation = { alpha, beta, gamma };
  };

  var onScreenOrientationChangeEvent = function () {
    scope.screenOrientation = window.orientation || 0;
  };

  var onTouchStartEvent = function (event) {
    event.preventDefault();
    event.stopPropagation();

    tempX = event.touches[0].pageX;
    tempY = event.touches[0].pageY;
  };

  var onTouchMoveEvent = function (event) {
    event.preventDefault();
    event.stopPropagation();

    rotY += THREE.Math.degToRad((event.touches[0].pageX - tempX) / 4);
    rotX += THREE.Math.degToRad((tempY - event.touches[0].pageY) / 4);

    scope.updateAlphaOffsetAngle(rotY);

    tempX = event.touches[0].pageX;
    tempY = event.touches[0].pageY;
  };

  const onRegisterEvent = function () {
    window.addEventListener(
      "orientationchange",
      onScreenOrientationChangeEvent,
      false
    );
    window.addEventListener(
      "deviceorientation",
      onDeviceOrientationChangeEvent,
      false
    );
    window.addEventListener("deviceorientation", this.update.bind(this), {
      passive: true,
    });
  }.bind(this);

  // The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

  this.setCameraQuaternion = function (quaternion, alpha, beta, gamma, orient) {
    var zee = new THREE.Vector3(0, 0, 1);

    var euler = new THREE.Euler();

    var q0 = new THREE.Quaternion();

    var q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis

    var vectorFingerY;
    var fingerQY = new THREE.Quaternion();
    var fingerQX = new THREE.Quaternion();

    if (scope.screenOrientation == 0) {
      vectorFingerY = new THREE.Vector3(1, 0, 0);
      fingerQY.setFromAxisAngle(vectorFingerY, -rotX);
    } else if (scope.screenOrientation == 180) {
      vectorFingerY = new THREE.Vector3(1, 0, 0);
      fingerQY.setFromAxisAngle(vectorFingerY, rotX);
    } else if (scope.screenOrientation == 90) {
      vectorFingerY = new THREE.Vector3(0, 1, 0);
      fingerQY.setFromAxisAngle(vectorFingerY, rotX);
    } else if (scope.screenOrientation == -90) {
      vectorFingerY = new THREE.Vector3(0, 1, 0);
      fingerQY.setFromAxisAngle(vectorFingerY, -rotX);
    }

    q1.multiply(fingerQY);
    q1.multiply(fingerQX);

    euler.set(beta, alpha, -gamma, "YXZ"); // 'ZXY' for the device, but 'YXZ' for us

    quaternion.setFromEuler(euler); // orient the device

    quaternion.multiply(q1); // camera looks out the back of the device, not the top

    quaternion.multiply(q0.setFromAxisAngle(zee, -orient)); // adjust for screen orientation
  };

  this.connect = function () {
    onScreenOrientationChangeEvent(); // run once on load

    if (
      window.DeviceOrientationEvent !== undefined &&
      typeof window.DeviceOrientationEvent.requestPermission === "function"
    ) {
      window.DeviceOrientationEvent.requestPermission()
        .then(function (response) {
          if (response == "granted") {
            onRegisterEvent();
          }
        })
        .catch(function (error) {
          console.error(
            "THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:",
            error
          );
        });
    } else {
      onRegisterEvent();
    }

    /* scope.domElement.addEventListener("touchstart", onTouchStartEvent, {
      passive: false,
    });
    scope.domElement.addEventListener("touchmove", onTouchMoveEvent, {
      passive: false,
    }); */

    scope.enabled = true;
  };

  this.disconnect = function () {
    window.removeEventListener(
      "orientationchange",
      onScreenOrientationChangeEvent,
      false
    );
    window.removeEventListener(
      "deviceorientation",
      onDeviceOrientationChangeEvent,
      false
    );
    window.removeEventListener(
      "deviceorientation",
      this.update.bind(this),
      false
    );

    /* scope.domElement.removeEventListener(
      "touchstart",
      onTouchStartEvent,
      false
    );
    scope.domElement.removeEventListener("touchmove", onTouchMoveEvent, false); */

    scope.enabled = false;
  };

  this.update = function (ignoreUpdate) {
    if (scope.enabled === false) return;

    var restrictedAlpha = scope.deviceOrientation.alpha; // > 180 ? Math.min(300, scope.deviceOrientation.alpha) : Math.min(60, scope.deviceOrientation.alpha);
    var alpha = restrictedAlpha
      ? THREE.Math.degToRad(restrictedAlpha) + scope.alphaOffsetAngle
      : 0; // Z
    var beta = scope.deviceOrientation.beta
      ? THREE.Math.degToRad(scope.deviceOrientation.beta)
      : 0; // X'
    var gamma = scope.deviceOrientation.gamma
      ? THREE.Math.degToRad(scope.deviceOrientation.gamma)
      : 0; // Y''
    var orient = scope.screenOrientation
      ? THREE.Math.degToRad(scope.screenOrientation)
      : 0; // O

    this.setCameraQuaternion(
      scope.camera.quaternion,
      alpha,
      beta,
      gamma,
      orient
    );
    scope.alpha = alpha;

    if (ignoreUpdate !== true) {
      scope.dispatchEvent(changeEvent);
    }
  };

  this.updateAlphaOffsetAngle = function (angle) {
    this.alphaOffsetAngle = angle;
    this.update();
  };

  this.dispose = function () {
    this.disconnect();
  };

  this.connect();
}

DeviceOrientationControls.prototype = Object.assign(
  Object.create(THREE.EventDispatcher.prototype),
  {
    constructor: DeviceOrientationControls,
  }
);

export { DeviceOrientationControls };
