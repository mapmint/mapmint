var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.z = 200;

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.enableZoom = true;

var keyLight = new THREE.DirectionalLight(new THREE.Color('hsl(30, 100%, 75%)'), 1.0);
keyLight.position.set(-100, 0, 100);

var fillLight = new THREE.DirectionalLight(new THREE.Color('hsl(240, 100%, 75%)'), 0.75);
fillLight.position.set(100, 0, 100);

var backLight = new THREE.DirectionalLight(0xffffff, 1.0);
backLight.position.set(100, 0, -100).normalize();

scene.add(keyLight);
scene.add(fillLight);
scene.add(backLight);

console.log("Aniket Giri");




function setSmoothGeometry(obj) {
    obj.traverse(node => {
		//console.log(obj);
        if ('geometry' in node) {
            const tempGeometry = new THREE.Geometry().fromBufferGeometry( node.geometry );
            tempGeometry.mergeVertices();
            tempGeometry.computeVertexNormals();
            node.geometry = new THREE.BufferGeometry().fromGeometry( tempGeometry );
        }
    })
}



var mtlLoader = new THREE.MTLLoader();
mtlLoader.setTexturePath('http://localhost:1234/examples/OBJ_LOADER_ANIKET/three-js-boilerplate-example-obj-loader-finish/public/examples/3d-obj-loader/visualize_a_obj_file/assets/');
mtlLoader.setPath('http://localhost:1234/examples/OBJ_LOADER_ANIKET/three-js-boilerplate-example-obj-loader-finish/public/examples/3d-obj-loader/visualize_a_obj_file/assets/');
mtlLoader.load('maison-export.mtl', function (materials) {

    materials.preload();

    var objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath('http://localhost:1234/examples/OBJ_LOADER_ANIKET/three-js-boilerplate-example-obj-loader-finish/public/examples/3d-obj-loader/visualize_a_obj_file/assets/');
    objLoader.load('maison-export.obj', function (object) {
		
		//debugger;
		setSmoothGeometry(object)

        scene.add(object);
        object.position.y -= 60;

    });

});

var animate = function () {
	requestAnimationFrame( animate );
	controls.update();
	renderer.render(scene, camera);
};

animate();