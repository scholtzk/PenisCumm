import * as THREE from 'three'
import BoxScene from './BoxScene'

const width = window.innerWidth
const height = window.innerHeight

const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('app') as HTMLCanvasElement
})
renderer.setSize(width,height)

const mainCamera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)

const scene = new BoxScene()
scene.initialize()

function tick()
{
  scene.update()
  renderer.render(scene, mainCamera)
  requestAnimationFrame(tick)

}

tick()