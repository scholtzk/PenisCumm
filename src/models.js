class MyScene {
    constructor() {
        this.models = [];
        // other constructor code
    }
    loadModel(modelPath) {
        const object = new GLTFLoader();
        object.load('resources/dog/scene.gltf', (gltf) => {
            gltf.scene.traverse( c => {
                c.castShadow = true;
            });
            this.scene.add(gltf.scene);
            this.models.push(gltf.scene);
        });
    }
}
