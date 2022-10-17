function rad(degree) {
    return (Math.PI * degree) / 180;
}
function Renderer(canvasName, vertSrc, fragSrc) {
    // private members (inside closure)
    var canvasName = canvasName;
    var vertSrc = vertSrc;
    var fragSrc = fragSrc;
    var canvas;
    var gl;
    var progID = 0;
    var vertID = 0;
    var fragID = 0;
    var bufID = 0;
    var vertexLoc = 0;
    var colorLoc = 0;
    var count = 3;

    const angle = 60;
    let u_projection;
    let u_mvMatrix;
    let cubeVBO;
    let cubeIBO;
    let w;
    let h;
    let textureFile;
    let reverseLightDirectionLocation;
    let normalLoc;

    //grid set
    // let gridProgID = 0;
    // let gridvertID = 0;
    // let gridfragID = 0;

    this.createBuffer = function ($arr, $itemSize) {
        let buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array($arr), gl.STATIC_DRAW);
        buf.itemSize = $itemSize;
        buf.numItem = $arr.length / $itemSize;
        return buf;
    };

    this.createElementBuffer = function ($arr) {
        let buf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array($arr), gl.STATIC_DRAW);
        buf.numItem = $arr.length;
        return buf;
    };

    this.cubeColorVBO = function () {
        var colors = [
            [1.0, 1.0, 1.0, 1.0], // Front face: white
            [1.0, 0.0, 0.0, 1.0], // Back face: red
            [0.0, 1.0, 0.0, 1.0], // Top face: green
            [0.0, 0.0, 1.0, 1.0], // Bottom face: blue
            [1.0, 1.0, 0.0, 1.0], // Right face: yellow
            [1.0, 0.0, 1.0, 1.0], // Left face: purple
        ];
        var generatedColors = [];
        for (var j = 0; j < 6; j++) for (var i = 0; i < 4; i++) generatedColors = generatedColors.concat(colors[j]);
        return this.createBuffer(generatedColors, 4);
    };

    // public
    this.updateShader = function (newvertSrc, newfragSrc) {
        vertSrc = newvertSrc;
        fragSrc = newfragSrc;

        gl.deleteProgram(progID);
        gl.deleteShader(vertID);
        gl.deleteShader(fragID);

        setupShaders();
    };

    // public
    this.init = function (webglVersion) {
        this.canvas = window.document.getElementById(canvasName);
        try {
            gl = this.canvas.getContext(webglVersion);
        } catch (e) {}
        if (!gl) {
            window.alert('Error: Could not retrieve WebGL Context');
            return;
        }

        setupShaders();

        // generate a Vertex Buffer Object (VBO)
        bufID = gl.createBuffer();

        var triangleVertexData = new Float32Array([
            0.0, 0.5, 0.0, 1.0, 1.0, 0.0, 1.0, -0.5, -0.5, 0.0, 0.0, 1.0, 0.0, 1.0, 0.5, -0.5, 0.0, 0.0, 0.0, 1.0, 1.0,
        ]);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufID);
        gl.bufferData(gl.ARRAY_BUFFER, triangleVertexData, gl.STATIC_DRAW);

        // position
        var offset = 0;
        var stride = (3 + 4) * Float32Array.BYTES_PER_ELEMENT;
        gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, stride, offset);
        gl.enableVertexAttribArray(vertexLoc);

        // color
        offset = 0 + 3 * Float32Array.BYTES_PER_ELEMENT;
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, stride, offset);
        gl.enableVertexAttribArray(colorLoc);

        this.resize(this.canvas.width, this.canvas.height);
    };

    this.degToRad = function (deg) {
        return (deg * Math.PI) / 180;
    };

    this.objInit = async function (webglVersion) {
        document.getElementById('real-upload').addEventListener('change', (e) => {
            textureFile = e.target.files[0];
        });
        const response = await fetch('https://raw.githubusercontent.com/idea7654/idea7654.github.io/master/teapot.obj');
        //console.log(sample);
        //const response = await fetch('https://webglfundamentals.org/webgl/resources/models/cube/cube.obj');

        //const response = await fetch('teapot.obj');
        const text = await response.text();
        const data = this.parseOBJ(text);

        let position = [];
        let normal = [];
        let texcoord = [];
        let indices = [];

        data.position.forEach((i) => {
            position = [...position, i[0], i[1], i[2]];
        });

        data.normal.forEach((i) => {
            normal = [...normal, i[0], i[1], i[2]];
        });

        data.texcoord.forEach((i) => {
            texcoord = [...texcoord, i[0], i[1]];
        });

        data.indices.forEach((i) => {
            indices = [...indices, i, i + 1, i + 2];
        });

        this.canvas = window.document.getElementById(canvasName);
        try {
            gl = this.canvas.getContext(webglVersion);
        } catch (e) {}
        if (!gl) {
            window.alert('Error: Could not retrieve WebGL Context');
            return;
        }

        this.initScreen();

        await setupShaders();
        // var t0 = [
        //     // Front face
        //     -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,

        //     // Back face
        //     -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,

        //     // Top face
        //     -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,

        //     // Bottom face
        //     -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,

        //     // Right face
        //     0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,

        //     // Left face
        //     -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
        // ];
        var t0 = position;
        cubeVBO = this.createBuffer(t0, 3);

        console.log(cubeVBO.numItem);
        // cubeIBO = this.createElementBuffer([
        //     0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
        //     34, 35,
        // ]);
        cubeIBO = this.createElementBuffer(data.indices);
        //cubeIBO = this.createBuffer()

        const mvMatrix = mat4.create();

        mat4.identity(mvMatrix);
        //mat4.rotate(mvMatrix, rad(180), [0, 0, 1], mvMatrix);
        //mat4.translate(mvMatrix, [5, 0, 0], mvMatrix);
        const rotMatData = document.getElementById('code_rot_matrix').value.toString();
        const userMatrix = [];

        for (let i = 0; i < rotMatData.length; i++) {
            if (rotMatData[i] != ' ') if (rotMatData[i] != '\n') userMatrix.push(rotMatData[i]);
        }
        //mat4.lookAt([8, 5, 2], [0, 0, 0], [0, 1, 0], mvMatrix);

        const radius = 50;

        const fPosition = [radius, 0, 0];

        let cameraMatrix = [Math.cos(0), Math.sin(0), 0, 0, -Math.sin(0), Math.cos(0), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        mat4.translate(cameraMatrix, [0, 0, radius * 1.5], cameraMatrix);

        const cameraPosition = [cameraMatrix[12], cameraMatrix[13], cameraMatrix[14]];

        mat4.lookAt(cameraPosition, fPosition, [0, 1, 0], mvMatrix);
        mat4.translate(mvMatrix, [30, 0, 0.0], mvMatrix);
        mat4.multiply(mvMatrix, userMatrix, mvMatrix);

        const projectionMatrix = mat4.create();
        mat4.perspective(angle, w / h, 0.1, 120.0, projectionMatrix);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(progID);

        // vertex
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
        gl.enableVertexAttribArray(vertexLoc);
        gl.vertexAttribPointer(vertexLoc, 3, gl.FLOAT, false, 0, 0);

        //normal
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normal, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(normalLoc);
        gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);

        //texture
        const texcoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoord), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 2, gl.FLOAT, true, 0, 0);

        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0 + 0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

        var image = new Image();
        image.crossOrigin = 'anonymous';
        image.src = URL.createObjectURL(textureFile);
        image.addEventListener('load', function () {
            // Now that the image has loaded make copy it to the texture.
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.generateMipmap(gl.TEXTURE_2D);

            gl.uniformMatrix4fv(u_mvMatrix, false, mvMatrix);

            // 카메라 처리
            gl.uniformMatrix4fv(u_projection, false, projectionMatrix);

            //Lighting
            const lightingData = document.getElementById('code_lighting').value.toString();
            const lightVec = [];

            for (let i = 0; i < lightingData.length; i++) {
                if (lightingData[i] != ' ') if (lightingData[i] != '\n') lightVec.push(lightingData[i]);
            }
            gl.uniform3fv(reverseLightDirectionLocation, vec3.normalize(lightVec));

            gl.bindTexture(gl.TEXTURE_2D, texture);

            // index
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIBO);
            gl.drawElements(gl.TRIANGLES, cubeIBO.numItem, gl.UNSIGNED_SHORT, 0);
        });
    };

    //public
    this.resize = function (w, h) {
        gl.viewport(0, 0, w, h);
    };

    this.parseOBJ = function (text) {
        // 인덱스는 1부터 시작하므로, 0번째 데이터는 그냥 채워 넣습니다.
        const objPositions = [[0, 0, 0]];
        const objTexcoords = [[0, 0]];
        const objNormals = [[0, 0, 0]];

        const indices = [];

        // `f` 인덱스의 정의 순서와 같습니다.
        const objVertexData = [objPositions, objTexcoords, objNormals];

        // `f` 인덱스의 정의 순서와 같습니다.
        let webglVertexData = [
            [], // 위치
            [], // 텍스처 좌표
            [], // 법선
        ];

        function addVertex(vert) {
            const ptn = vert.split('/');
            ptn.forEach((objIndexStr, i) => {
                if (!objIndexStr) {
                    return;
                }
                const objIndex = parseInt(objIndexStr);
                const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
                webglVertexData[i].push(...objVertexData[i][index]);

                if (i == 0) {
                    indices.push(objIndex);
                }
            });
        }

        const keywords = {
            v(parts) {
                objPositions.push(parts.map(parseFloat));
            },
            vn(parts) {
                objNormals.push(parts.map(parseFloat));
            },
            vt(parts) {
                objTexcoords.push(parts.map(parseFloat));
            },
            f(parts) {
                const numTriangles = parts.length - 2;
                for (let tri = 0; tri < numTriangles; ++tri) {
                    addVertex(parts[0]);
                    addVertex(parts[tri + 1]);
                    addVertex(parts[tri + 2]);
                }
            },
        };

        const keywordRE = /(\w*)(?: )*(.*)/;
        const lines = text.split('\n');
        for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
            const line = lines[lineNo].trim();
            if (line == 's 2') {
                return {
                    position: objPositions,
                    texcoord: objTexcoords,
                    normal: objNormals,
                    indices: indices,
                };
            }
            if (line === '' || line.startsWith('#')) {
                continue;
            }
            const m = keywordRE.exec(line);
            if (!m) {
                continue;
            }
            const [, keyword, unparsedArgs] = m;
            const parts = line.split(/\s+/).slice(1);
            const handler = keywords[keyword];
            if (!handler) {
                console.warn('unhandled keyword:', keyword); // eslint-disable-line no-console
                continue;
            }
            handler(parts, unparsedArgs);
        }

        //console.log(objPositions);

        return {
            position: objPositions,
            texcoord: objTexcoords,
            normal: objNormals,
            indices: indices,
        };

        // return {
        //     position: webglVertexData[0],
        //     texcoord: webglVertexData[1],
        //     normal: webglVertexData[2],
        //     indices: indices,
        // };
    };

    this.initScreen = function () {
        // viewport 설정
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 1);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        this.resize(this.canvas.width, this.canvas.height);
        w = this.canvas.width;
        h = this.canvas.height;
    };

    //public
    this.display = function () {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(progID);

        gl.bindBuffer(gl.ARRAY_BUFFER, bufID);
        gl.drawArrays(gl.TRIANGLES, 0, count);
    };

    // private
    function setupShaders() {
        // create shader
        vertID = gl.createShader(gl.VERTEX_SHADER);
        fragID = gl.createShader(gl.FRAGMENT_SHADER);

        // gridvertID = gl.createShader(gl.VERTEX_SHADER);
        // gridfragID = gl.createShader(gl.FRAGMENT_SHADER);

        // specify shader source
        gl.shaderSource(vertID, vertSrc);
        gl.shaderSource(fragID, fragSrc);

        //여기서 grid쉐이더들 연결시켜주면 됨..

        // compile the shader
        gl.compileShader(vertID);
        gl.compileShader(fragID);

        //gl.compileShader(gridvertID);
        //gl.compileShader(gridfragID);

        var error = false;
        // check for errors
        if (!gl.getShaderParameter(vertID, gl.COMPILE_STATUS)) {
            document.getElementById('code_vert_error').innerHTML = 'invalid vertex shader : ' + gl.getShaderInfoLog(vertID);
            error = true;
        } else {
            document.getElementById('code_vert_error').innerHTML = '';
        }
        if (!gl.getShaderParameter(fragID, gl.COMPILE_STATUS)) {
            document.getElementById('code_frag_error').innerHTML = 'invalid fragment shader : ' + gl.getShaderInfoLog(fragID);
            error = true;
        } else {
            document.getElementById('code_frag_error').innerHTML = '';
        }

        if (error) return;

        // create program and attach shaders
        progID = gl.createProgram();
        gl.attachShader(progID, vertID);
        gl.attachShader(progID, fragID);

        // gridProgID = gl.createProgram();
        // gl.attachShader(gridProgID, gridvertID);
        // gl.attachShader(gridProgID, gridfragID);

        // link the program
        gl.linkProgram(progID);
        if (!gl.getProgramParameter(progID, gl.LINK_STATUS)) {
            alert(gl.getProgramInfoLog(progID));
            return;
        }

        // gl.linkProgram(gridProgID);
        // if (!gl.getProgramParameter(gridProgID, gl.LINK_STATUS)) {
        //     alert(gl.getProgramInfoLog(gridProgID));
        //     return;
        // }

        // "inputPosition" and "inputColor" are user-provided
        // ATTRIBUTE variables of the vertex shader.
        // Their locations are stored to be used later with
        // glEnableVertexAttribArray()

        u_projection = gl.getUniformLocation(progID, 'uProjectionMatrix');
        u_mvMatrix = gl.getUniformLocation(progID, 'uMVMatrix');

        vertexLoc = gl.getAttribLocation(progID, 'inputPosition');
        //colorLoc = gl.getAttribLocation(progID, 'inputColor');
        colorLoc = gl.getAttribLocation(progID, 'inputTexture');
        normalLoc = gl.getAttribLocation(progID, 'inputNormal');
        reverseLightDirectionLocation = gl.getUniformLocation(progID, 'u_reverseLightDirection');
    }
}
