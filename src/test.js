import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.125/build/three.module.js';

import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.125/examples/jsm/loaders/FBXLoader.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.125/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.125/examples/jsm/controls/OrbitControls.js';
import {EffectComposer} from 'https://cdn.jsdelivr.net/npm/three@0.125/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'https://cdn.jsdelivr.net/npm/three@0.125/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.125/examples/jsm/postprocessing/ShaderPass.js';
import {GlitchPass} from 'https://cdn.jsdelivr.net/npm/three@0.122/examples/jsm/postprocessing/GlitchPass.js';
import { HalftonePass } from 'https://cdn.jsdelivr.net/npm/three@0.122/examples/jsm/postprocessing/HalftonePass.js';
//import { RenderPixelatedPass } from 'https://cdn.jsdelivr.net/npm/three@0.122/examples/jsm/postprocessing/RenderPixelatedPass.js';
import { RGBShiftShader } from 'https://cdn.jsdelivr.net/npm/three@0.122/examples/jsm/shaders/RGBShiftShader.js';
import { GammaCorrectionShader } from 'https://cdn.jsdelivr.net/npm/three@0.122/examples/jsm/shaders/GammaCorrectionShader.js';
			import { DotScreenShader } from 'https://cdn.jsdelivr.net/npm/three@0.122/examples/jsm/shaders/DotScreenShader.js';
import { VideoTexture } from 'https://cdn.jsdelivr.net/npm/three@0.122/src/textures/VideoTexture.js';
import { RectAreaLight } from 'three';




const KEYS = {
  'a': 65,
  's': 83,
  'w': 87,
  'd': 68,
};

function clamp(x, a, b) {
  return Math.min(Math.max(x, a), b);
}

class InputController {
  constructor(target) {
    this.target_ = target || document;
    this.initialize_();    
  }

  initialize_() {
    this.current_ = {
      leftButton: false,
      rightButton: false,
      mouseXDelta: 0,
      mouseYDelta: 0,
      mouseX: 0,
      mouseY: 0,
    };
    this.previous_ = null;
    this.keys_ = {};
    this.previousKeys_ = {};
    this.target_.addEventListener('mousedown', (e) => this.onMouseDown_(e), false);
    this.target_.addEventListener('mousemove', (e) => this.onMouseMove_(e), false);
    this.target_.addEventListener('mouseup', (e) => this.onMouseUp_(e), false);
    this.target_.addEventListener('keydown', (e) => this.onKeyDown_(e), false);
    this.target_.addEventListener('keyup', (e) => this.onKeyUp_(e), false);
  }

  onMouseMove_(e) {
    this.current_.mouseX = e.clientX;
    this.current_.mouseY = e.clientY;

    if (this.previous_ === null) {
      this.previous_ = {...this.current_};
    }

    this.current_.mouseXDelta = e.clientX - this.previous_.mouseX;
    this.current_.mouseYDelta = e.clientY - this.previous_.mouseY;
    this.previous_ = {...this.current_};
  }


  onMouseDown_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = true;
        break;
      }
      case 2: {
        this.current_.rightButton = true;
        break;
      }
    }
  }

  onMouseUp_(e) {
    this.onMouseMove_(e);

    switch (e.button) {
      case 0: {
        this.current_.leftButton = false;
        break;
      }
      case 2: {
        this.current_.rightButton = false;
        break;
      }
    }
  }

  onKeyDown_(e) {
    this.keys_[e.keyCode] = true;
  }

  onKeyUp_(e) {
    this.keys_[e.keyCode] = false;
  }

  key(keyCode) {
    return !!this.keys_[keyCode];
  }

  isReady() {
    return this.previous_ !== null;
  }

  update(_) {
    if (this.previous_ !== null) {
      this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
      this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

      this.previous_ = {...this.current_};
    }
  }
};


class FirstPersonCamera {
  constructor(camera, objects, renderer) {
    this.camera_ = camera;
    this.input_ = new InputController();
    this.rotation_ = new THREE.Quaternion();
    this.translation_ = new THREE.Vector3(0, 2, 0);
    this.phi_ = 0;
    this.phiSpeed_ = 8;
    this.theta_ = 0;
    this.thetaSpeed_ = 5;
    this.headBobActive_ = false;
    this.headBobTimer_ = 0;
    this.objects_ = objects;
  }
    

    

  update(timeElapsedS) {
    this.updateRotation_(timeElapsedS);
    this.updateCamera_(timeElapsedS);
    this.updateTranslation_(timeElapsedS);
    this.updateHeadBob_(timeElapsedS);
    this.input_.update(timeElapsedS);
  }

  updateCamera_(_) {
    this.camera_.quaternion.copy(this.rotation_);
    this.camera_.position.copy(this.translation_);
    this.camera_.position.y += Math.sin(this.headBobTimer_ * 8) * 0.3;

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.rotation_);

    const dir = forward.clone();

    forward.multiplyScalar(100);
    forward.add(this.translation_);

    let closest = forward;
    const result = new THREE.Vector3();
    const ray = new THREE.Ray(this.translation_, dir);
    for (let i = 0; i < this.objects_.length; ++i) {
      if (ray.intersectBox(this.objects_[i], result)) {
        if (result.distanceTo(ray.origin) < closest.distanceTo(ray.origin)) {
          closest = result.clone();
        }
      }
    }

    this.camera_.lookAt(closest);
  }

  updateHeadBob_(timeElapsedS) {
    if (this.headBobActive_) {
      const wavelength = Math.PI;
      const nextStep = 1 + Math.floor(((this.headBobTimer_ + 0.0000001) * 10) / wavelength);
      const nextStepTime = nextStep * wavelength / 10;
      this.headBobTimer_ = Math.min(this.headBobTimer_ + timeElapsedS, nextStepTime);

      if (this.headBobTimer_ == nextStepTime) {
        this.headBobActive_ = false;
      }
    }
  }

  updateTranslation_(timeElapsedS) {
    const forwardVelocity = (this.input_.key(KEYS.w) ? 1 : 0) + (this.input_.key(KEYS.s) ? -1 : 0)
    const strafeVelocity = (this.input_.key(KEYS.a) ? 1 : 0) + (this.input_.key(KEYS.d) ? -1 : 0)

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(qx);
    forward.multiplyScalar(forwardVelocity * timeElapsedS * 10);

    const left = new THREE.Vector3(-1, 0, 0);
    left.applyQuaternion(qx);
    left.multiplyScalar(strafeVelocity * timeElapsedS * 10);

    this.translation_.add(forward);
    this.translation_.add(left);

    if (forwardVelocity != 0 || strafeVelocity != 0) {
      this.headBobActive_ = true;
    }
  }

  updateRotation_(timeElapsedS) {
    const xh = this.input_.current_.mouseXDelta / window.innerWidth;
    const yh = this.input_.current_.mouseYDelta / window.innerHeight;

    this.phi_ += -xh * this.phiSpeed_;
    this.theta_ = clamp(this.theta_ + -yh * this.thetaSpeed_, -Math.PI / 3, Math.PI / 3);

    const qx = new THREE.Quaternion();
    qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
    const qz = new THREE.Quaternion();
    qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_);

    const q = new THREE.Quaternion();
    q.multiply(qx);
    q.multiply(qz);

    this.rotation_.copy(q);
  }
}


class FirstPersonCameraDemo {
  constructor() {
    this.initialize_();
  }

  initialize_() {
    this.initializeRenderer_();
    this.initializeLights_();
    this.initializeScene_();
    this.initializePostFX_();
    this.initializeAudio_();
    this.initializeDemo_();

    this.previousRAF_ = null;
    this.raf_();
    this.onWindowResize_();
  }

  

  initializeDemo_() {
    //this.controls_ = new FirstPersonControls(
    //this.camera_, this.threejs_.domElement);
    //this.controls_.lookSpeed = 0.1;
    //this.controls_.movementSpeed = 10;
    this.fpsCamera_ = new FirstPersonCamera(this.camera_, this.objects_, this.renderer);
  


  }

  initializeAudio_() {
    this.listener_ = new THREE.AudioListener();
    this.camera_.add(this.listener_);

    const sound = new THREE.PositionalAudio(this.listener_);
    const loader = new THREE.AudioLoader();
    loader.load('resources/freepbr/entropy.mp3', (buffer) => {
      sound.setBuffer(buffer);
      sound.setVolume(1);
      sound.setRefDistance(0.5);
      sound.play();

      this.box.add(sound);
    });
  }

  initializeRenderer_() {
    this.threejs_ = new THREE.WebGLRenderer({
      antialias: false,
    });
    this.threejs_.shadowMap.enabled = true;
    this.threejs_.shadowMap.type = THREE.PCFSoftShadowMap;
    this.threejs_.setPixelRatio(window.devicePixelRatio);
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
    this.threejs_.physicallyCorrectLights = true;
    this.threejs_.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(this.threejs_.domElement);

    window.addEventListener('resize', () => {
      this.onWindowResize_();
    }, false);

    const fov = 60;
    const aspect = 1920 / 1080;
    const near = 1.0;
    const far = 1000.0;
    this.camera_ = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera_.position.set(0, 3, 0);

    this.scene_ = new THREE.Scene();

    this.uiCamera_ = new THREE.OrthographicCamera(
        -1, 1, 1 * aspect, -1 * aspect, 1, 1000);
    this.uiScene_ = new THREE.Scene();

  }

  initializeScene_() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
    './resources/skybox/Spacebox_left.png',
    './resources/skybox/Spacebox_right.png',
      './resources/skybox/Spacebox_top1.png',
      './resources/skybox/Spacebox_bottom.png',
      './resources/skybox/Spacebox_front.png',
      './resources/skybox/Spacebox_back1.png',
  ]);


    texture.encoding = THREE.sRGBEncoding;
    this.scene_.background = texture;

    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();

    const video = document.createElement('video');
  video.src = "resources/freepbr/entropy.mp4";
  video.loop = true;
  video.muted = true;
  video.play();

  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.format = THREE.RGBFormat;

  const videoMaterial = new THREE.MeshBasicMaterial({map: videoTexture});
  const videoGeometry = new THREE.PlaneBufferGeometry(2, 2, 1, 1);
  const videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
  videoMesh.position.x = 3.97;
  videoMesh.position.y = 2;
  videoMesh.position.z = 0;
  videoMesh.rotation.set(0, -Math.PI/2, 0);
  videoMesh.scale.set(0.9, 0.5, 0.5);

  this.scene_.add(videoMesh);
    

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(3, 3, 3),
      this.loadMaterial_('5.jpg', 0.5));
    box.position.set(10, 2, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene_.add(box);

  


    const meshes = [
      box];

    this.objects_ = [];

    for (let i = 0; i < meshes.length; ++i) {
      const b = new THREE.Box3();
      b.setFromObject(meshes[i]);
      this.objects_.push(b);

      const gltfLoader = new GLTFLoader();
      const fbxLoader = new FBXLoader();
      gltfLoader.load('resources/house/scene.gltf', (gltf) => {
        const model = gltf.scene;
        model.traverse(object => {
          object.castShadow = true;
        });
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(0.05, 0.05, 0.05);
        this.scene_.add(model);
      });

      gltfLoader.load('resources/tree/tree.gltf', (gltf) => {
        const model3 = gltf.scene;
        model3.traverse(object => {
          object.castShadow = true;
        });
        model3.position.set(5, 0, 10);
        model3.rotation.set(0, -Math.PI/2, 0);
        model3.scale.set(2, 2, 2);
        this.scene_.add(model3);
      });

      gltfLoader.load('resources/tree/tree.gltf', (gltf) => {
        const model4 = gltf.scene;
        model4.traverse(object => {
          object.castShadow = true;
        });
        model4.position.set(1, 0, -5);
        model4.rotation.set(0, 0, 0);
        model4.scale.set(1, 1, 1);
        this.scene_.add(model4);
      });

      gltfLoader.load('resources/tv/tv.gltf', (gltf) => {
        const model6 = gltf.scene;
        model6.traverse(object => {
          object.castShadow = true;
        });
        model6.position.set(5, 2, 0);
        model6.rotation.set(0, -Math.PI/2, 0);
        model6.scale.set(0.005, 0.005, 0.005);

        this.scene_.add(model6);
      
    
      });

            
            

            



    
  

    // Crosshair
    const crosshair = mapLoader.load('resources/cross2.gif');
    crosshair.anisotropy = maxAnisotropy;

    this.sprite_ = new THREE.Sprite(
      new THREE.SpriteMaterial({map: crosshair, color: 0xffffff, fog: false, depthTest: false, depthWrite: false}));
    this.sprite_.scale.set(0.15, 0.15 * this.camera_.aspect, 1)
    this.sprite_.position.set(0, 0, -10);

    this.uiScene_.add(this.sprite_);
  }
  }

  initializeLights_() {
    const distance = 50.0;
    const angle = Math.PI / 4.0;
    const penumbra = 0.5;
    const decay = 1.0;

    let light = new THREE.SpotLight(
        0xFFFFFF, 100.0, distance, angle, penumbra, decay);
    light.castShadow = true;
    light.shadow.bias = -0.00001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;

    light.position.set(25, 25, 0);
    light.lookAt(0, 0, 0);
    //this.scene_.add(light);

    let light2 = new THREE.AmbientLight(0xFFFFFF, 1);
    //this.scene_.add(light2);

    light = new THREE.PointLight(0xFFFFFF, 1.0);
    light.position.set(0, 0, 0);
    //this.scene_.add(light);

    const upColour = 0xFFFF80;
    const downColour = 0x808080;
    light = new THREE.HemisphereLight(upColour, downColour, 0.5);
    light.color.setHSL( 0.6, 1, 0.6 );
    light.groundColor.setHSL( 0.095, 1, 0.75 );
    light.position.set(0, 4, 0);
    this.scene_.add(light);

    const width = 2
    const height = 2

    //RectAreaLightUniformsLib.init();

    light = new THREE.RectAreaLight(0xFFFFFF, 1.0, width, height);
    light.position.set(5, 2, 0);
    light.rotation.set(0, -Math.PI/2, 0);
    light.lookAt(0, 0, 0);

    this.scene_.add(light);
  }

  loadMaterial_(name, tiling) {
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();

    const metalMap = mapLoader.load('resources/freepbr/' + '5.jpg');
    metalMap.anisotropy = maxAnisotropy;
    metalMap.wrapS = THREE.RepeatWrapping;
    metalMap.wrapT = THREE.RepeatWrapping;
    metalMap.repeat.set(tiling, tiling);

    const albedo = mapLoader.load('resources/freepbr/' + '5.jpg');
    albedo.anisotropy = maxAnisotropy;
    albedo.wrapS = THREE.RepeatWrapping;
    albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(tiling, tiling);
    albedo.encoding = THREE.sRGBEncoding;

    const normalMap = mapLoader.load('resources/freepbr/' + '2.jpg');
    normalMap.anisotropy = maxAnisotropy;
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(tiling, tiling);

    const roughnessMap = mapLoader.load('resources/freepbr/' + '1.jpg');
    roughnessMap.anisotropy = maxAnisotropy;
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(tiling, tiling);

    const material = new THREE.MeshStandardMaterial({
      metalnessMap: metalMap,
      map: albedo,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
    });

    return material;
  }



  initializePostFX_() {
    this._composer = new EffectComposer(this.threejs_);
    this._composer.addPass(new RenderPass(this.scene_, this.camera_,));
    //this._composer.addPass(new GlitchPass());
    //const effect1 = new ShaderPass( DotScreenShader );
		//		effect1.uniforms[ 'scale' ].value = 100;
		//this._composer.addPass( effect1 );

		const effect2 = new ShaderPass( RGBShiftShader );
				effect2.uniforms[ 'amount' ].value = 0.0015;
		this._composer.addPass( effect2 );

    const effect3 = new ShaderPass( GammaCorrectionShader )
    this._composer.addPass( effect3 )

  }
  onWindowResize_() {
    this.camera_.aspect = window.innerWidth / window.innerHeight;
    this.camera_.updateProjectionMatrix();

    this.uiCamera_.left = -this.camera_.aspect;
    this.uiCamera_.right = this.camera_.aspect;
    this.uiCamera_.updateProjectionMatrix();

    this.threejs_.setSize(window.innerWidth, window.innerHeight);
  }

  raf_() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }

      this.step_(t - this.previousRAF_);
      //this.threejs_.autoClear = true;
      this._composer.render();
      //this.threejs_.render(this.scene_, this.camera_);
      //this.threejs_.autoClear = false;
      //this.threejs_.render(this.uiScene_, this.uiCamera_);
      this.previousRAF_ = t;
      this.raf_();
    });
  }

  step_(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;

    // this.controls_.update(timeElapsedS);
    this.fpsCamera_.update(timeElapsedS);
  }
}


let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new FirstPersonCameraDemo();
});