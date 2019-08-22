var gl;
var canvas;
var shaderProgram;

window.onload = function init() {
    // Get A WebGL context
    canvas = document.getElementById("canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl)
        alert("WebGL isn't available");

    // setup GLSL program
    shaderProgram = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(shaderProgram);

    defineAttributes();
    initBuffers();
    initTextures();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    render();
}

function defineAttributes() {
    // enable shader attributes and map them to local properties of shaderProgram
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);
    /*
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    */

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
}

var moonTexture;
var earthTexture;

function initTextures() {
    // we cannot bind the images to textures until they have fully loaded
    moonTexture = gl.createTexture();
    moonTexture.image = new Image();
    moonTexture.image.onload = function () {
        bindTextures(moonTexture)
    }
    moonTexture.image.src = "moon.gif";

    earthTexture = gl.createTexture();
    earthTexture.image = new Image();
    earthTexture.image.onload = function () {
        bindTextures(earthTexture)
    }
    earthTexture.image.src = "earth.jpg";
}

function bindTextures(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindTexture(gl.TEXTURE_2D, null);
}

// Model-View Matrix
var mvMatrix = mat4.create();
var mvMatrixStack = [];
// Projection Matrix
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length === 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

var earthVertexPositionBuffer;
var earthVertexNormalBuffer;
var earthVertexTextureCoordBuffer;
var earthVertexIndexBuffer;

var moonVertexPositionBuffer;
var moonVertexNormalBuffer;
var moonVertexTextureCoordBuffer;
var moonVertexIndexBuffer;

// create sphere (vertex coordinates & normal vectors) with mapping to texture coordinates
// then initialize data buffers to hold the data in triangle format
function initBuffers() {

    var latitude = 30;
    var longitude = 30;
    var radius = 4;

    // compute earth coordinates
    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    for (var latNumber = 0; latNumber <= latitude; latNumber++) {
        var theta = latNumber * Math.PI / latitude;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= longitude; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitude;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitude);
            var v = 1 - (latNumber / latitude);

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }

    var indexData = [];
    for (var latNumber = 0; latNumber < latitude; latNumber++) {
        for (var longNumber = 0; longNumber < longitude; longNumber++) {
            var first = (latNumber * (longitude + 1)) + longNumber;
            var second = first + longitude + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    earthVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    earthVertexNormalBuffer.itemSize = 3;
    earthVertexNormalBuffer.numItems = normalData.length / 3;

    earthVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
    earthVertexTextureCoordBuffer.itemSize = 2;
    earthVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    earthVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    earthVertexPositionBuffer.itemSize = 3;
    earthVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    earthVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, earthVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    earthVertexIndexBuffer.itemSize = 1;
    earthVertexIndexBuffer.numItems = indexData.length;

    var radius = 1;

    // compute moon coordinates
    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    for (var latNumber = 0; latNumber <= latitude; latNumber++) {
        var theta = latNumber * Math.PI / latitude;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber = 0; longNumber <= longitude; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitude;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta + 5;
            var y = cosTheta - 3.0;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitude);
            var v = 1 - (latNumber / latitude);

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }

    var indexData = [];
    for (var latNumber = 0; latNumber < latitude; latNumber++) {
        for (var longNumber = 0; longNumber < longitude; longNumber++) {
            var first = (latNumber * (longitude + 1)) + longNumber;
            var second = first + longitude + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    moonVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    moonVertexNormalBuffer.itemSize = 3;
    moonVertexNormalBuffer.numItems = normalData.length / 3;

    moonVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);
    moonVertexTextureCoordBuffer.itemSize = 2;
    moonVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    moonVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);
    moonVertexPositionBuffer.itemSize = 3;
    moonVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    moonVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STREAM_DRAW);
    moonVertexIndexBuffer.itemSize = 1;
    moonVertexIndexBuffer.numItems = indexData.length;
}


var moonAngle = 180;
var earthAngle = 0;

let lookat = mat4.lookAt([0,80,0], [0,-1,0], [0,0,-1]);
function drawScene() {
    gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100.0, pMatrix);
    mat4.multiply(pMatrix, lookat);
    mat4.identity(mvMatrix);
    mat4.translate(mvMatrix, [0, 0, -20]);

    // draw the moon
    mvPushMatrix();
    // specify position and angle
    // matrix multiplications are left-to-right, so later operations must be applied first
    // mat4.translate(mvMatrix,[0,0,20]);
    mat4.translate(mvMatrix,[0,0,20]);
    mat4.rotate(mvMatrix, degToRad(earthAngle*0.8), [0, 1, 0]);
    mat4.translate(mvMatrix, [0,0,-20]);
    mat4.rotateZ(mvMatrix, degToRad(-30));
    mat4.rotate(mvMatrix, degToRad(earthAngle*2), [0,1,0]);
    mat4.rotateZ(mvMatrix, degToRad(30));
    mat4.translate(mvMatrix, [5, -3, 0]);
    mat4.rotate(mvMatrix, degToRad(moonAngle), [0, 1, 0]);
    mat4.translate(mvMatrix, [-5, 3, 0]);



    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, moonTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, moonVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, moonVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, moonVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, moonVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();

    // draw the earth
    mvPushMatrix();
    // specify position and angle
    mat4.translate(mvMatrix,[0,0,20]);
    mat4.rotate(mvMatrix, degToRad(earthAngle*0.8), [0, 1, 0]);
    mat4.translate(mvMatrix, [0,0,-20]);
    mat4.rotate(mvMatrix, degToRad(earthAngle), [0, 1, 0]);


    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexPositionBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, earthVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    /*
    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexNormalBuffer);
    gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, earthVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);
    */
    gl.bindBuffer(gl.ARRAY_BUFFER, earthVertexTextureCoordBuffer);
    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, earthVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, earthTexture);
    gl.uniform1i(shaderProgram.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, earthVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, earthVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    mvPopMatrix();
}

var lastTime = 0;

function render() {
    var timeNow = new Date().getTime();
    drawScene();
    if (lastTime !== 0) {
        var elapsed = timeNow - lastTime;

        moonAngle += 0.05 * elapsed;
        earthAngle += 0.05 * elapsed;
    }
    lastTime = timeNow;
    requestAnimFrame(render)
}
